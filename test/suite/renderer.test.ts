import * as assert from 'assert';
import { MarkdownPipeline } from '../../src/renderer/MarkdownPipeline';

suite('MarkdownPipeline', () => {
  const pipeline = new MarkdownPipeline();

  test('renders plain markdown to HTML', async () => {
    const html = await pipeline.render('# Hello\n\nWorld');
    assert.ok(html.includes('<h1>Hello</h1>'));
    assert.ok(html.includes('<p>World</p>'));
  });

  test('renders mermaid fence to .mermaid div', async () => {
    const md = '```mermaid\ngraph LR\n  A-->B\n```';
    const html = await pipeline.render(md);
    assert.ok(html.includes('class="mermaid"'));
    assert.ok(html.includes('graph LR'));
  });

  test('mermaid source is HTML-escaped to prevent XSS', async () => {
    const md = '```mermaid\n<script>alert(1)</script>\n```';
    const html = await pipeline.render(md);
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });
});
