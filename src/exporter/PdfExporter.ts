import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { buildFullHtmlPage } from '../preview/previewTemplate';
import { Settings } from '../config/Settings';
import { buildBrandTemplates } from '../brand/BrandTemplate';

export class PdfBrowserPathError extends Error {
  constructor(configuredPath: string) {
    super(
      `Configured browser executable was not found: ${configuredPath}. Update xmarkdown2pdf.pdf.browserExecutablePath to a valid Chrome/Chromium executable path or clear it to use Puppeteer's managed browser.`
    );
    this.name = 'PdfBrowserPathError';
  }
}

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
  private static getWindowsBrowserCandidatePaths(): string[] {
    const programFiles = process.env.PROGRAMFILES;
    const programFilesX86 = process.env['PROGRAMFILES(X86)'];
    const localAppData = process.env.LOCALAPPDATA;

    const candidates = [
      programFiles ? path.win32.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
      programFilesX86 ? path.win32.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
      localAppData ? path.win32.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
      programFiles ? path.win32.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : '',
      programFilesX86 ? path.win32.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : '',
      localAppData ? path.win32.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : '',
    ].filter(Boolean);

    return [...new Set(candidates)];
  }

  private static async findExistingFile(candidatePaths: string[]): Promise<string | undefined> {
    for (const candidatePath of candidatePaths) {
      try {
        const stat = await fs.stat(candidatePath);
        if (stat.isFile()) {
          return candidatePath;
        }
      } catch {
        // Try next candidate
      }
    }
    return undefined;
  }

  private static async resolveLaunchExecutablePath(configuredPath: string): Promise<string | undefined> {
    if (configuredPath) {
      await PdfExporter.ensureBrowserExecutablePathExists(configuredPath);
      return configuredPath;
    }

    if (process.platform !== 'win32') {
      return undefined;
    }

    return PdfExporter.findExistingFile(PdfExporter.getWindowsBrowserCandidatePaths());
  }

  private static async ensureBrowserExecutablePathExists(executablePath: string): Promise<void> {
    if (!executablePath) {
      return;
    }
    try {
      const stat = await fs.stat(executablePath);
      if (!stat.isFile()) {
        throw new PdfBrowserPathError(executablePath);
      }
    } catch {
      throw new PdfBrowserPathError(executablePath);
    }
  }

  static async export(
    fragment: string,
    outputPath: string,
    context: vscode.ExtensionContext,
    options: { documentTitle?: string } = {}
  ): Promise<void> {
    const settings = Settings.get();

    const html = buildFullHtmlPage(
      {
        fragment,
        documentTitle: options.documentTitle,
        embedScripts: true,
        forExport: true,
      },
      context
    );

    // Dynamic import so Puppeteer is not bundled by esbuild (listed as external)
    const puppeteer = await import('puppeteer');
    const launchOptions: any = {
      headless: true,
      args: settings.pdfLaunchArgs,
    };
    const resolvedExecutablePath = await PdfExporter.resolveLaunchExecutablePath(settings.pdfBrowserExecutablePath);
    if (resolvedExecutablePath) {
      launchOptions.executablePath = resolvedExecutablePath;
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
        outline: settings.exportIncludeOutline,
        printBackground: settings.pdfPrintBackground,
        ...brandTemplates,
      });
    } finally {
      await browser.close();
    }
  }
}
