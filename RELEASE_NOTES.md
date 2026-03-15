# Release Notes

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
