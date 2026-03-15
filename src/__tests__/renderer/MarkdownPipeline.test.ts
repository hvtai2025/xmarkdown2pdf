import { MarkdownPipeline } from '../../renderer/MarkdownPipeline';

// The MarkdownPipeline constructor registers both MermaidPlugin and PlantUmlPlugin.
// PlantUmlPlugin uses a two-pass placeholder approach so no Java / network call
// is made during these tests (no plantuml fences are used here).

describe('MarkdownPipeline', () => {
  let pipeline: MarkdownPipeline;

  beforeAll(() => {
    pipeline = new MarkdownPipeline();
  });

  // ── headings ──────────────────────────────────────────────────

  test('renders h1', async () => {
    const html = await pipeline.render('# Heading 1');
    expect(html).toContain('<h1 id="heading-1">Heading 1</h1>');
  });

  test('renders h2', async () => {
    const html = await pipeline.render('## Heading 2');
    expect(html).toContain('<h2 id="heading-2">Heading 2</h2>');
  });

  test('renders h3 through h6', async () => {
    for (let level = 3; level <= 6; level++) {
      const html = await pipeline.render(`${'#'.repeat(level)} H${level}`);
      expect(html).toContain(`<h${level} id="h${level}">`);
    }
  });

  test('adds unique heading ids for repeated titles', async () => {
    const html = await pipeline.render('# Repeat\n\n## Repeat');
    expect(html).toContain('<h1 id="repeat">Repeat</h1>');
    expect(html).toContain('<h2 id="repeat-1">Repeat</h2>');
  });

  test('prepends a generated table of contents when requested', async () => {
    const html = await pipeline.render('# Intro\n\n## Details', {
      includeToc: true,
      tocTitle: 'Contents',
      tocMaxDepth: 2,
    });

    expect(html).toContain('<nav class="table-of-contents" aria-label="Table of contents" role="doc-toc">');
    expect(html).toContain('<p class="table-of-contents__title">Contents</p>');
    expect(html).toContain('<a href="#intro">Intro</a>');
    expect(html).toContain('<a href="#details">Details</a>');
    expect(html.indexOf('<nav class="table-of-contents"')).toBeLessThan(html.indexOf('<h1 id="intro">Intro</h1>'));
  });

  test('renderDocument exposes the first heading as the document title', async () => {
    const rendered = await pipeline.renderDocument('# Report\n\n## Scope', {
      includeToc: true,
    });

    expect(rendered.title).toBe('Report');
    expect(rendered.headings).toEqual([
      { id: 'report', level: 1, text: 'Report' },
      { id: 'scope', level: 2, text: 'Scope' },
    ]);
    expect(rendered.fragment).toContain('<h1 id="report">Report</h1>');
  });

  test('limits generated table of contents to the configured heading depth', async () => {
    const html = await pipeline.render('# Intro\n\n## Details\n\n### Deep Dive', {
      includeToc: true,
      tocMaxDepth: 2,
    });

    expect(html).toContain('<a href="#intro">Intro</a>');
    expect(html).toContain('<a href="#details">Details</a>');
    expect(html).not.toContain('<a href="#deep-dive">Deep Dive</a>');
  });

  // ── paragraphs & inline ───────────────────────────────────────

  test('renders a paragraph', async () => {
    const html = await pipeline.render('Hello world');
    expect(html).toContain('<p>Hello world</p>');
  });

  test('renders bold text', async () => {
    const html = await pipeline.render('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });

  test('renders italic text', async () => {
    const html = await pipeline.render('_italic_');
    expect(html).toContain('<em>italic</em>');
  });

  test('renders inline code', async () => {
    const html = await pipeline.render('Use `npm install`');
    expect(html).toContain('<code>npm install</code>');
  });

  test('renders a hyperlink', async () => {
    const html = await pipeline.render('[GitHub](https://github.com)');
    expect(html).toContain('<a href="https://github.com">GitHub</a>');
  });

  test('renders an image', async () => {
    const html = await pipeline.render('![alt](image.png)');
    expect(html).toContain('<img');
    expect(html).toContain('src="image.png"');
    expect(html).toContain('alt="alt"');
  });

  // ── lists ─────────────────────────────────────────────────────

  test('renders an unordered list', async () => {
    const html = await pipeline.render('- item A\n- item B\n- item C');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item A</li>');
    expect(html).toContain('<li>item B</li>');
    expect(html).toContain('<li>item C</li>');
  });

  test('renders an ordered list', async () => {
    const html = await pipeline.render('1. first\n2. second\n3. third');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>first</li>');
    expect(html).toContain('<li>second</li>');
    expect(html).toContain('<li>third</li>');
  });

  // ── blockquotes ───────────────────────────────────────────────

  test('renders a blockquote', async () => {
    const html = await pipeline.render('> This is a quote');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('This is a quote');
  });

  // ── horizontal rule ───────────────────────────────────────────

  test('renders a horizontal rule', async () => {
    const html = await pipeline.render('---');
    expect(html).toContain('<hr');
  });

  // ── fenced code blocks (non-mermaid) ──────────────────────────

  test('renders a fenced TypeScript block as <pre><code>', async () => {
    const html = await pipeline.render('```typescript\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
    expect(html).toContain('const x = 1;');
    expect(html).not.toContain('class="mermaid"');
  });

  // ── mermaid ───────────────────────────────────────────────────

  test('converts a mermaid fence to a .mermaid div', async () => {
    const html = await pipeline.render('```mermaid\ngraph LR\n  A-->B\n```');
    expect(html).toContain('<div class="mermaid">');
    expect(html).toContain('graph LR');
    expect(html).not.toContain('<pre>');
  });

  test('renders multiple mermaid diagrams in one document', async () => {
    const md = [
      '# Doc',
      '',
      '```mermaid\ngraph LR\n  A-->B\n```',
      '',
      'Some text',
      '',
      '```mermaid\nsequenceDiagram\n  Alice->>Bob: Hi\n```',
    ].join('\n');

    const html = await pipeline.render(md);
    const count = (html.match(/<div class="mermaid">/g) ?? []).length;
    expect(count).toBe(2);
    expect(html).toContain('<h1 id="doc">Doc</h1>');
    expect(html).toContain('Some text');
  });

  test('mermaid source is safely escaped in the output', async () => {
    const html = await pipeline.render('```mermaid\n<img src=x onerror=alert(1)>\n```');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  // ── tables ────────────────────────────────────────────────────

  test('renders a GFM table', async () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = await pipeline.render(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('<td>2</td>');
  });

  // ── raw HTML pass-through ─────────────────────────────────────

  test('passes through raw HTML when html:true', async () => {
    const html = await pipeline.render('<div class="custom">hello</div>');
    expect(html).toContain('<div class="custom">hello</div>');
  });

  // ── edge cases ────────────────────────────────────────────────

  test('returns an empty string for empty input', async () => {
    const html = await pipeline.render('');
    expect(html.trim()).toBe('');
  });

  test('returns HTML for whitespace-only input', async () => {
    const html = await pipeline.render('   \n\n   ');
    // markdown-it may produce empty or whitespace — must not throw
    expect(typeof html).toBe('string');
  });

  test('handles a large document without error', async () => {
    const lines = Array.from({ length: 500 }, (_, i) => `## Section ${i}\n\nParagraph ${i}\n`);
    const html = await pipeline.render(lines.join('\n'));
    expect(html).toContain('<h2 id="section-0">Section 0</h2>');
    expect(html).toContain('<h2 id="section-499">Section 499</h2>');
  });

  // ── plugin extensibility ──────────────────────────────────────

  test('register() returns "this" for chaining', () => {
    const p = new MarkdownPipeline();
    const result = p.register({
      name: 'noop',
      apply: () => {},
    });
    expect(result).toBe(p);
  });
});
