# Release Notes

## 0.1.2 - 2026-03-15

### Added
- Table of contents generation in exported HTML and PDF documents.
- New export settings:
  - `xmarkdown2pdf.export.includeToc` — include a generated TOC (default: `true`)
  - `xmarkdown2pdf.export.tocTitle` — heading text above the TOC (default: `Table of Contents`)
  - `xmarkdown2pdf.export.tocMaxDepth` — deepest heading level in the TOC (default: `3`)
  - `xmarkdown2pdf.export.includeOutline` — generate document outline metadata (default: `true`)
- PDF outline bookmarks using Puppeteer `outline: true` so PDF viewers display a navigation panel.
- HTML exports use the first document heading as the page `<title>`.
- Generated TOC navigation block is marked with `role="doc-toc"` for semantic accessibility.
- Preview TOC setting: `xmarkdown2pdf.preview.includeToc` shows the TOC in the live preview panel (default: `false`).
- Added marketplace keywords: `table of contents`, `toc`.

## 0.1.1 - 2026-03-15

### Added
- Configurable PDF branding with header and footer templates.
- New branding settings:
  - `xmarkdown2pdf.brand.enabled`
  - `xmarkdown2pdf.brand.companyName`
  - `xmarkdown2pdf.brand.logoPath`
  - `xmarkdown2pdf.brand.primaryColor`
  - `xmarkdown2pdf.brand.headerTemplate`
  - `xmarkdown2pdf.brand.headerTemplatePath`
  - `xmarkdown2pdf.brand.footerTemplate`
  - `xmarkdown2pdf.brand.footerTemplatePath`
- Sample branding templates:
  - `media/brand/sample_header.html`
  - `media/brand/sample_footer.html`

### Changed
- `PdfExporter` now applies branding templates during PDF generation when branding is enabled.
- README updated with branding setup, settings, and template usage guidance.

### Quality
- Added unit tests for brand template generation, path precedence, logo embedding, color sanitization, and HTML escaping.
- Added regression test for unsupported logo file extensions.
