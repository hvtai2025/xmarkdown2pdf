import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface PdfMargin {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

interface ExtensionSettings {
  pdfFormat: string;
  pdfMargin: PdfMargin;
  pdfPrintBackground: boolean;
  plantumlRenderMode: 'local' | 'server' | 'kroki';
  plantumlServerUrl: string;
  plantumlJarPath: string;
  previewScrollSync: boolean;
  previewTheme: 'github' | 'dark' | 'custom';
  previewCustomCssPath: string;
}

const SECTION = 'xmarkdown2pdf';

// Allowed hosts for PlantUML server — validated to prevent SSRF
const ALLOWED_PLANTUML_PROTOCOLS = ['http:', 'https:'];

export class Settings {
  static get(): ExtensionSettings {
    const cfg = vscode.workspace.getConfiguration(SECTION);

    const rawServerUrl = cfg.get<string>('plantuml.serverUrl', '');
    const serverUrl = Settings.validateServerUrl(rawServerUrl);

    return {
      pdfFormat: cfg.get<string>('pdf.format', 'A4'),
      pdfMargin: cfg.get<PdfMargin>('pdf.margin', {
        top: '20mm', right: '20mm', bottom: '20mm', left: '20mm',
      }),
      pdfPrintBackground: cfg.get<boolean>('pdf.printBackground', true),
      plantumlRenderMode: cfg.get<'local' | 'server' | 'kroki'>('plantuml.renderMode', 'local'),
      plantumlServerUrl: serverUrl,
      plantumlJarPath: Settings.resolveJarPath(cfg.get<string>('plantuml.jarPath', '')),
      previewScrollSync: cfg.get<boolean>('preview.scrollSync', true),
      previewTheme: cfg.get<'github' | 'dark' | 'custom'>('preview.theme', 'github'),
      previewCustomCssPath: cfg.get<string>('preview.customCssPath', ''),
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
}
