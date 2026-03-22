# 0.2.0 - 2026-03-22

### Added
- LaTeX/MathJax formula rendering in preview and export (HTML/PDF) with zero config required.
- MathJax runtime is now managed as a versioned library (libs.json, auto-upgradeable).
- Automatic first-run library bootstrap: missing managed libraries are downloaded on extension activation (no manual step required).
- New setting: `xmarkdown2pdf.preview.mathJaxJsPath` for custom MathJax runtime path (optional override).
- Sample document now includes a LaTeX/MathJax section for instant verification.
- Tests for MathJax config, script injection, and live-update typesetting.

### Changed
- README updated: features, settings, and usage for LaTeX/MathJax, and sample section.

### Quality
- All tests and type checks pass for this release.

# Release Notes

## 0.1.4 - 2026-03-21

### Added
- New export title settings:
  - `xmarkdown2pdf.export.titleSource` (`firstHeading` or `fileName`)
  - `xmarkdown2pdf.export.documentTitle` (explicit custom title override)
- Export commands now support using the source file name as the HTML/PDF document title.

### Changed
- When branding is enabled, PDF export enforces minimum top/bottom margins to reserve space for header/footer templates and avoid content overlap.
- README settings table updated with the new title configuration options.

### Quality
- Added tests for file-name title mode and custom title override in HTML and PDF export flows.
- Added regression tests for branded PDF minimum top/bottom margin behavior.

## 0.1.3 - 2026-03-21

### Added
- PDF export now auto-detects Windows Chrome browser installations when `xmarkdown2pdf.pdf.browserExecutablePath` is empty.

### Highlight
- PDF branding (custom header/footer templates, company identity settings, and sample templates) is now a core highlighted feature in product documentation.

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
