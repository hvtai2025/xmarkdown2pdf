import * as fs from 'fs';
import * as path from 'path';
import {
  buildBrandTemplates,
  resolveLogoTag,
  resolveTemplateHtml,
  sanitizeColor,
  escapeHtml,
  BrandSettings,
} from '../../brand/BrandTemplate';

const BASE_SETTINGS: BrandSettings = {
  enabled: true,
  companyName: 'Acme Corp',
  logoPath: '',
  primaryColor: '#1a73e8',
  headerTemplate: '',
  footerTemplate: '',
  headerTemplatePath: '',
  footerTemplatePath: '',
};

describe('buildBrandTemplates', () => {
  test('returns displayHeaderFooter=false when brand is disabled', () => {
    const result = buildBrandTemplates({ ...BASE_SETTINGS, enabled: false });
    expect(result.displayHeaderFooter).toBe(false);
    expect(result.headerTemplate).toBe('');
    expect(result.footerTemplate).toBe('');
  });

  test('returns displayHeaderFooter=true when brand is enabled', () => {
    const result = buildBrandTemplates(BASE_SETTINGS);
    expect(result.displayHeaderFooter).toBe(true);
  });

  test('default header contains company name', () => {
    const result = buildBrandTemplates(BASE_SETTINGS);
    expect(result.headerTemplate).toContain('Acme Corp');
  });

  test('default header contains primary color', () => {
    const result = buildBrandTemplates(BASE_SETTINGS);
    expect(result.headerTemplate).toContain('#1a73e8');
  });

  test('default footer contains company name', () => {
    const result = buildBrandTemplates(BASE_SETTINGS);
    expect(result.footerTemplate).toContain('Acme Corp');
  });

  test('default footer contains page number span', () => {
    const result = buildBrandTemplates(BASE_SETTINGS);
    expect(result.footerTemplate).toContain('class="pageNumber"');
    expect(result.footerTemplate).toContain('class="totalPages"');
  });

  test('uses custom headerTemplate when provided', () => {
    const custom = '<div>My Custom Header</div>';
    const result = buildBrandTemplates({ ...BASE_SETTINGS, headerTemplate: custom });
    expect(result.headerTemplate).toBe(custom);
  });

  test('uses custom footerTemplate when provided', () => {
    const custom = '<div>My Custom Footer</div>';
    const result = buildBrandTemplates({ ...BASE_SETTINGS, footerTemplate: custom });
    expect(result.footerTemplate).toBe(custom);
  });
});

describe('sanitizeColor', () => {
  test('accepts valid 6-digit hex', () => {
    expect(sanitizeColor('#1a73e8')).toBe('#1a73e8');
  });

  test('accepts valid 3-digit hex', () => {
    expect(sanitizeColor('#abc')).toBe('#abc');
  });

  test('falls back to default for invalid input', () => {
    expect(sanitizeColor('red')).toBe('#1a73e8');
    expect(sanitizeColor('javascript:alert(1)')).toBe('#1a73e8');
    expect(sanitizeColor('')).toBe('#1a73e8');
  });
});

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  test('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  test('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });
});

describe('resolveTemplateHtml', () => {
  test('returns inline html when no file path given', () => {
    expect(resolveTemplateHtml('', '<div>inline</div>')).toBe('<div>inline</div>');
  });

  test('returns empty string when both path and inline are empty', () => {
    expect(resolveTemplateHtml('', '')).toBe('');
  });

  test('returns empty string when file does not exist (falls through)', () => {
    expect(resolveTemplateHtml('/nonexistent/header.html', 'fallback')).toBe('fallback');
  });

  test('reads and returns file content when path is valid', () => {
    const tmpFile = path.join(process.cwd(), '__test_header_tmp.html');
    fs.writeFileSync(tmpFile, '<div>from file</div>');
    try {
      expect(resolveTemplateHtml(tmpFile, 'inline html')).toBe('<div>from file</div>');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('file path takes precedence over inline html', () => {
    const tmpFile = path.join(process.cwd(), '__test_header_priority_tmp.html');
    fs.writeFileSync(tmpFile, '<div>file wins</div>');
    try {
      const result = resolveTemplateHtml(tmpFile, '<div>inline loses</div>');
      expect(result).toBe('<div>file wins</div>');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

describe('buildBrandTemplates — template file paths', () => {
  test('uses header file when headerTemplatePath is set', () => {
    const tmpFile = path.join(process.cwd(), '__test_hdr_tmp.html');
    fs.writeFileSync(tmpFile, '<div>file header</div>');
    try {
      const result = buildBrandTemplates({ ...BASE_SETTINGS, headerTemplatePath: tmpFile });
      expect(result.headerTemplate).toBe('<div>file header</div>');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('uses footer file when footerTemplatePath is set', () => {
    const tmpFile = path.join(process.cwd(), '__test_ftr_tmp.html');
    fs.writeFileSync(tmpFile, '<div>file footer</div>');
    try {
      const result = buildBrandTemplates({ ...BASE_SETTINGS, footerTemplatePath: tmpFile });
      expect(result.footerTemplate).toBe('<div>file footer</div>');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

describe('resolveLogoTag', () => {
  test('returns empty string for empty path', () => {
    expect(resolveLogoTag('')).toBe('');
  });

  test('returns empty string when file does not exist', () => {
    expect(resolveLogoTag('/nonexistent/logo.png')).toBe('');
  });

  test('returns an img tag with base64 data URI for a valid PNG file', () => {
    const tmpFile = path.join(process.cwd(), '__test_logo_tmp.png');
    // Minimal 1x1 PNG bytes
    const minimalPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
      '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex'
    );
    fs.writeFileSync(tmpFile, minimalPng);
    try {
      const tag = resolveLogoTag(tmpFile);
      expect(tag).toContain('<img');
      expect(tag).toContain('data:image/png;base64,');
      expect(tag).toContain('height: 16px');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('returns an img tag with svg mime type for .svg files', () => {
    const tmpFile = path.join(process.cwd(), '__test_logo_tmp.svg');
    fs.writeFileSync(tmpFile, '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
    try {
      const tag = resolveLogoTag(tmpFile);
      expect(tag).toContain('data:image/svg+xml;base64,');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('returns empty string for unsupported file extension', () => {
    const tmpFile = path.join(process.cwd(), '__test_logo_tmp.bmp');
    fs.writeFileSync(tmpFile, 'not-an-image');
    try {
      expect(resolveLogoTag(tmpFile)).toBe('');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});
