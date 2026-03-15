import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BrandSettings } from '../brand/BrandTemplate';

interface PdfMargin {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

interface ExtensionSettings {
  exportIncludeToc: boolean;
  exportTocTitle: string;
  exportTocMaxDepth: number;
  previewIncludeToc: boolean;
  pdfFormat: string;
  pdfMargin: PdfMargin;
  pdfPrintBackground: boolean;
  pdfBrowserExecutablePath: string;
  pdfLaunchArgs: string[];
  plantumlRenderMode: 'local' | 'server' | 'kroki';
  plantumlServerUrl: string;
  plantumlJarPath: string;
  previewScrollSync: boolean;
  previewTheme: 'github' | 'dark' | 'custom';
  previewCustomCssPath: string;
  previewMermaidJsPath: string;
  previewHighlightJsPath: string;
  brand: BrandSettings;
}

const SECTION = 'xmarkdown2pdf';
const DEFAULT_PDF_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
];

// Allowed hosts for PlantUML server — validated to prevent SSRF
const ALLOWED_PLANTUML_PROTOCOLS = ['http:', 'https:'];

export class Settings {
  static get(): ExtensionSettings {
    const cfg = vscode.workspace.getConfiguration(SECTION);

    const rawServerUrl = cfg.get<string>('plantuml.serverUrl', '');
    const serverUrl = Settings.validateServerUrl(rawServerUrl);

    return {
      exportIncludeToc: cfg.get<boolean>('export.includeToc', true),
      exportTocTitle: cfg.get<string>('export.tocTitle', 'Table of Contents').trim() || 'Table of Contents',
      exportTocMaxDepth: Settings.resolveHeadingDepth(cfg.get<number>('export.tocMaxDepth', 3)),
      previewIncludeToc: cfg.get<boolean>('preview.includeToc', false),
      pdfFormat: cfg.get<string>('pdf.format', 'A4'),
      pdfMargin: cfg.get<PdfMargin>('pdf.margin', {
        top: '20mm', right: '20mm', bottom: '20mm', left: '20mm',
      }),
      pdfPrintBackground: cfg.get<boolean>('pdf.printBackground', true),
      pdfBrowserExecutablePath: Settings.resolveOptionalFilePath(cfg.get<string>('pdf.browserExecutablePath', '')),
      pdfLaunchArgs: Settings.resolveStringArray(cfg.get<string[]>('pdf.launchArgs', DEFAULT_PDF_LAUNCH_ARGS)),
      plantumlRenderMode: cfg.get<'local' | 'server' | 'kroki'>('plantuml.renderMode', 'local'),
      plantumlServerUrl: serverUrl,
      plantumlJarPath: Settings.resolveJarPath(cfg.get<string>('plantuml.jarPath', '')),
      previewScrollSync: cfg.get<boolean>('preview.scrollSync', true),
      previewTheme: cfg.get<'github' | 'dark' | 'custom'>('preview.theme', 'github'),
      previewCustomCssPath: cfg.get<string>('preview.customCssPath', ''),
      previewMermaidJsPath: Settings.resolveOptionalFilePath(cfg.get<string>('preview.mermaidJsPath', '')),
      previewHighlightJsPath: Settings.resolveOptionalFilePath(cfg.get<string>('preview.highlightJsPath', '')),
      brand: {
        enabled: cfg.get<boolean>('brand.enabled', false),
        companyName: cfg.get<string>('brand.companyName', ''),
        logoPath: Settings.resolveOptionalFilePath(cfg.get<string>('brand.logoPath', '')),
        primaryColor: cfg.get<string>('brand.primaryColor', '#1a73e8'),
        headerTemplate: cfg.get<string>('brand.headerTemplate', ''),
        footerTemplate: cfg.get<string>('brand.footerTemplate', ''),
        headerTemplatePath: Settings.resolveOptionalFilePath(cfg.get<string>('brand.headerTemplatePath', '')),
        footerTemplatePath: Settings.resolveOptionalFilePath(cfg.get<string>('brand.footerTemplatePath', '')),
      },
    };
  }

  private static validateServerUrl(url: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      if (!ALLOWED_PLANTUML_PROTOCOLS.includes(parsed.protocol)) {
        return '';
      }
      return url;
    } catch {
      return '';
    }
  }

  private static resolveJarPath(configuredPath: string): string {
    if (configuredPath && fs.existsSync(configuredPath)) {
      return path.resolve(configuredPath);
    }
    // Falls back to the version managed by LibManager inside the extension
    return '';
  }

  private static resolveOptionalFilePath(configuredPath: string): string {
    if (configuredPath && fs.existsSync(configuredPath)) {
      return path.resolve(configuredPath);
    }
    return '';
  }

  private static resolveStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [...DEFAULT_PDF_LAUNCH_ARGS];
    }
    const cleaned = value.filter(item => typeof item === 'string' && item.trim().length > 0);
    return cleaned.length > 0 ? cleaned : [...DEFAULT_PDF_LAUNCH_ARGS];
  }

  private static resolveHeadingDepth(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return 3;
    }
    return Math.min(6, Math.max(1, value));
  }
}
