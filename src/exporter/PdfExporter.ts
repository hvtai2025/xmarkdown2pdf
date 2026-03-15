import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { buildFullHtmlPage } from '../preview/previewTemplate';
import { Settings } from '../config/Settings';
import { buildBrandTemplates } from '../brand/BrandTemplate';

/**
 * PdfExporter
 *
 * Strategy:
 *  1. Build a self-contained HTML page (scripts inlined as data URIs).
 *  2. Launch Puppeteer (bundled Chromium).
 *  3. Set the page content and wait for mermaid diagrams to finish rendering.
 *  4. Print to PDF and close the browser.
 */
export class PdfExporter {
  static async export(
    fragment: string,
    outputPath: string,
    context: vscode.ExtensionContext
  ): Promise<void> {
    const settings = Settings.get();

    const html = buildFullHtmlPage(
      { fragment, embedScripts: true, forExport: true },
      context
    );

    // Dynamic import so Puppeteer is not bundled by esbuild (listed as external)
    const puppeteer = await import('puppeteer');
    const launchOptions: any = {
      headless: true,
      args: settings.pdfLaunchArgs,
    };
    if (settings.pdfBrowserExecutablePath) {
      launchOptions.executablePath = settings.pdfBrowserExecutablePath;
    }
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();

      // Block all network requests during conversion (offline safety)
      await page.setRequestInterception(true);
      page.on('request', req => {
        const resourceType = req.resourceType();
        // Allow data URIs (our inlined scripts) and document
        if (resourceType === 'document' || req.url().startsWith('data:')) {
          req.continue();
        } else {
          req.abort();
        }
      });

      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      // Wait for mermaid.js to finish rendering all diagrams
      await page.evaluate(() =>
        new Promise<void>(resolve => {
          const doc = (globalThis as any).document as any;
          const check = () => {
            const pending = doc.querySelectorAll('.mermaid:not([data-processed="true"])');
            if (pending.length === 0) resolve();
            else setTimeout(check, 100);
          };
          check();
        })
      ).catch(() => { /* timeout is acceptable — diagrams may still render partially */ });

      const brandTemplates = buildBrandTemplates(settings.brand);

      await page.pdf({
        path: outputPath,
        format: settings.pdfFormat as any,
        margin: settings.pdfMargin,
        printBackground: settings.pdfPrintBackground,
        ...brandTemplates,
      });
    } finally {
      await browser.close();
    }
  }
}
