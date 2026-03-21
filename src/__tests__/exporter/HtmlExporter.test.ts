import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { HtmlExporter } from '../../exporter/HtmlExporter';
import { MarkdownPipeline } from '../../renderer/MarkdownPipeline';

// The 'vscode' module is provided by __mocks__/vscode.ts.

const EXTENSION_PATH = path.resolve(__dirname, '../../../');

function makeContext(extensionPath = EXTENSION_PATH) {
  return {
    extensionPath,
    extensionUri: { fsPath: extensionPath },
    subscriptions: [],
  } as any;
}

describe('HtmlExporter.export()', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xmd2pdf-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ── basic output ─────────────────────────────────────────────

  test('writes a file to the given output path', async () => {
    const outPath = path.join(tmpDir, 'output.html');
    await HtmlExporter.export('# Hello', outPath, makeContext());

    const exists = await fs.access(outPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  test('output file is non-empty', async () => {
    const outPath = path.join(tmpDir, 'output.html');
    await HtmlExporter.export('# Hello', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  test('output file starts with <!DOCTYPE html>', async () => {
    const outPath = path.join(tmpDir, 'output.html');
    await HtmlExporter.export('# Doc', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  // ── markdown rendering ────────────────────────────────────────

  test('includes the rendered heading in the HTML file', async () => {
    const outPath = path.join(tmpDir, 'heading.html');
    await HtmlExporter.export('# My Title', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('<h1 id="my-title">My Title</h1>');
  });

  test('includes a generated table of contents by default', async () => {
    const outPath = path.join(tmpDir, 'toc.html');
    await HtmlExporter.export('# Overview\n\n## Scope', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('<title>Overview</title>');
    expect(content).toContain('<nav class="table-of-contents" aria-label="Table of contents" role="doc-toc">');
    expect(content).toContain('<a href="#overview">Overview</a>');
    expect(content).toContain('<a href="#scope">Scope</a>');
  });

  test('includes rendered paragraph text', async () => {
    const outPath = path.join(tmpDir, 'para.html');
    await HtmlExporter.export('Hello paragraph.', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('Hello paragraph.');
  });

  test('includes a mermaid diagram div', async () => {
    const md = '```mermaid\ngraph LR\n  A-->B\n```';
    const outPath = path.join(tmpDir, 'mermaid.html');
    await HtmlExporter.export(md, outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('<div class="mermaid">');
    expect(content).toContain('graph LR');
  });

  test('includes a mermaid.initialize() call so diagrams render client-side', async () => {
    const outPath = path.join(tmpDir, 'mermaid-init.html');
    await HtmlExporter.export('```mermaid\ngraph LR\n  A-->B\n```', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('mermaid.initialize(');
  });

  test('includes the content main wrapper', async () => {
    const outPath = path.join(tmpDir, 'content.html');
    await HtmlExporter.export('text', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('<div id="content">');
  });

  // ── self-contained export ─────────────────────────────────────

  test('scripts are inlined (self-contained file, no data URIs)', async () => {
    const outPath = path.join(tmpDir, 'standalone.html');
    await HtmlExporter.export('# test', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    // Scripts must be inlined — data: URI sources are blocked by CSP in browsers
    expect(content).not.toMatch(/src="data:text\/javascript;base64,/);
    expect(content).not.toContain('vscode-resource://');
  });

  test('does NOT include the live-update postMessage listener (static export)', async () => {
    const outPath = path.join(tmpDir, 'no-live.html');
    await HtmlExporter.export('text', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).not.toContain("window.addEventListener('message'");
  });

  // ── security ─────────────────────────────────────────────────

  test('output contains a Content-Security-Policy meta tag', async () => {
    const outPath = path.join(tmpDir, 'csp.html');
    await HtmlExporter.export('text', outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('Content-Security-Policy');
  });

  test('mermaid XSS source is escaped in the output file', async () => {
    const md = '```mermaid\n<script>alert(1)</script>\n```';
    const outPath = path.join(tmpDir, 'xss.html');
    await HtmlExporter.export(md, outPath, makeContext());

    const content = await fs.readFile(outPath, 'utf-8');
    // The raw <script> from the diagram source must not appear unescaped
    // (only one script tag — the mermaid.initialize one — exists)
    const mermaidDivMatch = content.match(/<div class="mermaid">([\s\S]*?)<\/div>/);
    expect(mermaidDivMatch).not.toBeNull();
    expect(mermaidDivMatch![1]).not.toContain('<script>');
    expect(mermaidDivMatch![1]).toContain('&lt;script&gt;');
  });

  // ── injectable pipeline ───────────────────────────────────────

  test('accepts an injected pre-built pipeline', async () => {
    const customPipeline = new MarkdownPipeline();
    const outPath = path.join(tmpDir, 'injected.html');
    await HtmlExporter.export('# Injected', outPath, makeContext(), customPipeline);

    const content = await fs.readFile(outPath, 'utf-8');
    expect(content).toContain('<h1 id="injected">Injected</h1>');
  });

  // ── rich document ─────────────────────────────────────────────

  test('exports a rich document with headings, lists, code, and mermaid', async () => {
    const md = [
      '# Report',
      '',
      '## Summary',
      '',
      'This report covers **three** areas:',
      '',
      '- Alpha',
      '- Beta',
      '- Gamma',
      '',
      '## Diagram',
      '',
      '```mermaid',
      'graph TD',
      '  A[Alpha] --> B[Beta]',
      '  B --> C[Gamma]',
      '```',
      '',
      '## Code',
      '',
      '```typescript',
      'const x: number = 42;',
      '```',
    ].join('\n');

    const outPath = path.join(tmpDir, 'rich.html');
    await HtmlExporter.export(md, outPath, makeContext());
    const content = await fs.readFile(outPath, 'utf-8');

    expect(content).toContain('<h1 id="report">Report</h1>');
    expect(content).toContain('<h2 id="summary">Summary</h2>');
    expect(content).toContain('<strong>three</strong>');
    expect(content).toContain('<li>Alpha</li>');
    expect(content).toContain('<div class="mermaid">');
    expect(content).toContain('graph TD');
    expect(content).toContain('const x: number = 42;');
    expect(content).toContain('<a href="#summary">Summary</a>');
  });
});
