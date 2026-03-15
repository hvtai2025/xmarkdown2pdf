import * as fs from 'fs';
import * as path from 'path';

export interface BrandSettings {
  enabled: boolean;
  companyName: string;
  /** Absolute path to logo image, already resolved and existence-checked by Settings. */
  logoPath: string;
  /** Hex color used as the brand accent (e.g. border line, company name). */
  primaryColor: string;
  /** Optional raw HTML that fully overrides the default header template. */
  headerTemplate: string;
  /** Optional raw HTML that fully overrides the default footer template. */
  footerTemplate: string;
  /** Absolute path to an .html file whose contents override the header. Takes precedence over headerTemplate. */
  headerTemplatePath: string;
  /** Absolute path to an .html file whose contents override the footer. Takes precedence over footerTemplate. */
  footerTemplatePath: string;
}

export interface BrandTemplates {
  displayHeaderFooter: boolean;
  headerTemplate: string;
  footerTemplate: string;
}

/**
 * Build Puppeteer-compatible header/footer templates from the brand settings.
 *
 * Notes on Puppeteer header/footer HTML:
 *  - Must use inline styles only (no external CSS / no <link>).
 *  - Images must be inlined as base64 data URIs.
 *  - Dynamic page numbering uses the special injected classes:
 *      <span class="pageNumber"></span>   — current page
 *      <span class="totalPages"></span>   — total pages
 *      <span class="title"></span>        — document title
 *      <span class="date"></span>         — formatted date
 */
export function buildBrandTemplates(settings: BrandSettings): BrandTemplates {
  if (!settings.enabled) {
    return { displayHeaderFooter: false, headerTemplate: '', footerTemplate: '' };
  }

  const headerHtml = resolveTemplateHtml(settings.headerTemplatePath, settings.headerTemplate) || buildDefaultHeader(settings);
  const footerHtml = resolveTemplateHtml(settings.footerTemplatePath, settings.footerTemplate) || buildDefaultFooter(settings);

  return {
    displayHeaderFooter: true,
    headerTemplate: headerHtml,
    footerTemplate: footerHtml,
  };
}

// ─── Default templates ────────────────────────────────────────────────────────

function buildDefaultHeader(settings: BrandSettings): string {
  const logoTag = resolveLogoTag(settings.logoPath);
  const color = sanitizeColor(settings.primaryColor);
  const companyName = escapeHtml(settings.companyName);

  return `<div style="
      width: 100%;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #555;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20mm;
      box-sizing: border-box;
      border-bottom: 1.5px solid ${color};
      padding-bottom: 3px;
    ">
    <div style="display: flex; align-items: center; gap: 6px;">
      ${logoTag}
      <span style="font-weight: bold; color: ${color};">${companyName}</span>
    </div>
    <span class="title" style="color: #888; max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
  </div>`;
}

function buildDefaultFooter(settings: BrandSettings): string {
  const color = sanitizeColor(settings.primaryColor);
  const companyName = escapeHtml(settings.companyName);

  return `<div style="
      width: 100%;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      color: #888;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20mm;
      box-sizing: border-box;
      border-top: 1.5px solid ${color};
      padding-top: 3px;
    ">
    <span>${companyName}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the final HTML string for a header or footer template.
 * Priority: file path > inline string > empty (falls back to default in caller).
 */
export function resolveTemplateHtml(filePath: string, inlineHtml: string): string {
  if (filePath) {
    try {
      return fs.readFileSync(path.resolve(filePath), 'utf8');
    } catch {
      // File unreadable — fall through to inlineHtml
    }
  }
  return inlineHtml;
}

/**
 * Read a logo file from disk and return an <img> tag with a base64 data URI.
 * Returns an empty string if the path is empty or the file cannot be read.
 * Supported formats: PNG, JPEG, GIF, WebP, SVG.
 */
export function resolveLogoTag(logoPath: string): string {
  if (!logoPath) {
    return '';
  }
  try {
    const abs = path.resolve(logoPath);
    const data = fs.readFileSync(abs);
    const ext = path.extname(abs).toLowerCase().slice(1);
    const mimeByExt: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    const mime = mimeByExt[ext];
    if (!mime) {
      return '';
    }
    return `<img src="data:${mime};base64,${data.toString('base64')}" style="height: 16px; width: auto;" alt="logo">`;
  } catch {
    return '';
  }
}

/**
 * Validate a hex color string.  Falls back to the default brand blue if invalid.
 */
export function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#1a73e8';
}

/**
 * Minimal HTML escaping to prevent injection through brand text fields.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
