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
  private static readonly BRAND_MIN_VERTICAL_MARGIN_MM = 25;

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

  private static parseLengthToMm(length: string): number | undefined {
    const match = /^\s*([0-9]*\.?[0-9]+)\s*(mm|cm|in|px|pt)\s*$/i.exec(length);
    if (!match) {
      return undefined;
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(value)) {
      return undefined;
    }

    switch (unit) {
      case 'mm':
        return value;
      case 'cm':
        return value * 10;
      case 'in':
        return value * 25.4;
      case 'px':
        return value * 25.4 / 96;
      case 'pt':
        return value * 25.4 / 72;
      default:
        return undefined;
    }
  }

  private static enforceBrandMargins(margin: { top: string; right: string; bottom: string; left: string }): {
    top: string;
    right: string;
    bottom: string;
    left: string;
  } {
    const minMm = PdfExporter.BRAND_MIN_VERTICAL_MARGIN_MM;
    const topMm = PdfExporter.parseLengthToMm(margin.top);
    const bottomMm = PdfExporter.parseLengthToMm(margin.bottom);

    return {
      ...margin,
      top: topMm === undefined || topMm < minMm ? `${minMm}mm` : margin.top,
      bottom: bottomMm === undefined || bottomMm < minMm ? `${minMm}mm` : margin.bottom,
    };
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

      // Wait for MathJax startup/typesetting so formulas are visible in generated PDF.
      await page.evaluate(async () => {
        const mathJax = (globalThis as any).MathJax;
        if (!mathJax) {
          return;
        }

        if (mathJax.startup?.promise) {
          await mathJax.startup.promise;
        }

        if (mathJax.typesetPromise) {
          await mathJax.typesetPromise([(globalThis as any).document?.getElementById('content')]);
        }
      }).catch(() => { /* math typeset best-effort */ });

      const brandTemplates = buildBrandTemplates(settings.brand);
      const pdfMargin = settings.brand.enabled
        ? PdfExporter.enforceBrandMargins(settings.pdfMargin)
        : settings.pdfMargin;

      await page.pdf({
        path: outputPath,
        format: settings.pdfFormat as any,
        margin: pdfMargin,
        outline: settings.exportIncludeOutline,
        printBackground: settings.pdfPrintBackground,
        ...brandTemplates,
      });
    } finally {
      await browser.close();
    }
  }
}
