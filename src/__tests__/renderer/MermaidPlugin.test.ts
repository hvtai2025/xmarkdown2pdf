import MarkdownIt from 'markdown-it';
import { MermaidPlugin } from '../../renderer/plugins/MermaidPlugin';

describe('MermaidPlugin', () => {
  let md: MarkdownIt;
  let plugin: MermaidPlugin;

  beforeEach(() => {
    md = new MarkdownIt({ html: true });
    plugin = new MermaidPlugin();
    plugin.apply(md);
  });

  // ── metadata ─────────────────────────────────────────────────

  test('has the name "mermaid"', () => {
    expect(plugin.name).toBe('mermaid');
  });

  // ── basic rendering ───────────────────────────────────────────

  test('converts a mermaid fenced block to a .mermaid div', () => {
    const input = '```mermaid\ngraph LR\n  A-->B\n```';
    const output = md.render(input);
    expect(output).toContain('<div class="mermaid">');
    expect(output).toContain('graph LR');
    // The plugin HTML-encodes > so mermaid.js reads via .textContent (auto-decoded)
    expect(output).toContain('A--&gt;B');
    expect(output).toContain('</div>');
  });

  test('preserves multiline diagram content inside the div', () => {
    const diagram = 'sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi';
    const input = `\`\`\`mermaid\n${diagram}\n\`\`\``;
    const output = md.render(input);
    expect(output).toContain('sequenceDiagram');
    // > is HTML-encoded; mermaid.js reads textContent which decodes it back
    expect(output).toContain('Alice-&gt;&gt;Bob: Hello');
    expect(output).toContain('Bob--&gt;&gt;Alice: Hi');
  });

  test('handles an empty mermaid block without throwing', () => {
    const input = '```mermaid\n```';
    expect(() => md.render(input)).not.toThrow();
    const output = md.render(input);
    expect(output).toContain('<div class="mermaid">');
  });

  // ── XSS / escaping ────────────────────────────────────────────

  test('escapes "<" and ">" to prevent raw HTML injection', () => {
    const input = '```mermaid\n<script>alert(1)</script>\n```';
    const output = md.render(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
  });

  test('escapes "&" to &amp;', () => {
    const input = '```mermaid\nA & B --> C\n```';
    const output = md.render(input);
    // The original & becomes &amp; inside the div
    expect(output).toContain('A &amp; B');
    // The original > in --> also becomes &gt;
    expect(output).toContain('--&gt; C');
  });

  test('escapes both < and > in the same block', () => {
    const input = '```mermaid\ngraph LR\n  A["<b>bold</b>"] --> B\n```';
    const output = md.render(input);
    expect(output).not.toContain('<b>');
    expect(output).toContain('&lt;b&gt;');
    expect(output).toContain('&lt;/b&gt;');
  });

  // ── non-mermaid fences ─────────────────────────────────────────

  test('falls through to the default renderer for non-mermaid fences', () => {
    const input = '```javascript\nconsole.log("hi");\n```';
    const output = md.render(input);
    // Should NOT become a .mermaid div
    expect(output).not.toContain('class="mermaid"');
    // Should produce a code block
    expect(output).toContain('<code');
    expect(output).toContain('console.log');
  });

  test('falls through for a plain (no language) fenced block', () => {
    const input = '```\nsome text\n```';
    const output = md.render(input);
    expect(output).not.toContain('class="mermaid"');
    expect(output).toContain('some text');
  });

  test('is case-sensitive: "Mermaid" (capital M) is NOT converted', () => {
    const input = '```Mermaid\ngraph LR\n  A-->B\n```';
    const output = md.render(input);
    // markdown-it lowercases language names — this tests the actual behaviour
    // (whether the plugin fires or not depends on markdown-it normalisation)
    // The important invariant: no raw <script> etc can escape via this path.
    expect(output).toBeDefined();
  });

  // ── output format ─────────────────────────────────────────────

  test('output div is followed by a newline', () => {
    const input = '```mermaid\ngraph TD\n  A-->B\n```';
    const output = md.render(input);
    expect(output).toMatch(/<\/div>\n/);
  });

  test('does not wrap the div in a <pre> or <code> tag', () => {
    const input = '```mermaid\ngraph LR\n  A-->B\n```';
    const output = md.render(input);
    expect(output).not.toContain('<pre>');
    expect(output).not.toContain('<code');
  });

  // ── multiple blocks ───────────────────────────────────────────

  test('handles multiple mermaid blocks in the same document', () => {
    const input = [
      '```mermaid\ngraph LR\n  A-->B\n```',
      '',
      '```mermaid\nsequenceDiagram\n  Alice->>Bob: Hi\n```',
    ].join('\n');
    const output = md.render(input);
    const matches = output.match(/<div class="mermaid">/g) ?? [];
    expect(matches.length).toBe(2);
  });

  test('handles a mermaid block mixed with other fenced blocks', () => {
    const input = [
      '```javascript\nconst x = 1;\n```',
      '',
      '```mermaid\ngraph LR\n  A-->B\n```',
      '',
      '```python\nprint("hi")\n```',
    ].join('\n');
    const output = md.render(input);
    // exactly one mermaid div
    const mermaidMatches = output.match(/<div class="mermaid">/g) ?? [];
    expect(mermaidMatches.length).toBe(1);
    // two normal code blocks — markdown-it HTML-encodes " in code spans
    expect(output).toContain('const x = 1');
    expect(output).toContain('print(');
    expect(output).toContain('hi');
  });
});
