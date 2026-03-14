import MarkdownIt from 'markdown-it';
import { PlantUmlPlugin } from '../../renderer/plugins/PlantUmlPlugin';

// We test the pure placeholder-injection and async-resolution mechanics.
// We do NOT call the real plantuml renderer (which would require Java) — instead we
// mock 'node-plantuml' to return a known SVG string.

jest.mock('node-plantuml', () => ({
  generate: jest.fn((_source: string, _opts: { format: string }) => {
    const { EventEmitter } = require('events');
    const out = new EventEmitter();
    // Emit a fake SVG asynchronously so the promise resolves correctly.
    setImmediate(() => {
      out.emit('data', Buffer.from('<svg data-mock="true"><text>mock diagram</text></svg>'));
      out.emit('end');
    });
    return { out };
  }),
}));

const PLACEHOLDER_PREFIX = '<!--plantuml:';
const PLACEHOLDER_SUFFIX = '-->';

describe('PlantUmlPlugin', () => {
  let md: MarkdownIt;
  let plugin: PlantUmlPlugin;

  beforeEach(() => {
    md = new MarkdownIt({ html: true });
    plugin = new PlantUmlPlugin();
    plugin.apply(md);
  });

  // ── metadata ─────────────────────────────────────────────────

  test('has the name "plantuml"', () => {
    expect(plugin.name).toBe('plantuml');
  });

  // ── placeholder injection ─────────────────────────────────────

  test('emits a placeholder comment for a plantuml fence', () => {
    const input = '```plantuml\n@startuml\nAlice -> Bob\n@enduml\n```';
    const output = md.render(input);
    expect(output).toContain(PLACEHOLDER_PREFIX);
    expect(output).toContain(PLACEHOLDER_SUFFIX);
  });

  test('placeholder contains the base64-encoded source', () => {
    const source = '@startuml\nAlice -> Bob\n@enduml\n';
    const input = `\`\`\`plantuml\n${source}\`\`\``;
    const output = md.render(input);

    // Extract the base64 payload
    const regex = new RegExp(`${escapeRegex(PLACEHOLDER_PREFIX)}([A-Za-z0-9+/=]+)${escapeRegex(PLACEHOLDER_SUFFIX)}`);
    const match = output.match(regex);
    expect(match).not.toBeNull();

    const decoded = Buffer.from(match![1], 'base64').toString('utf-8');
    expect(decoded).toBe(source);
  });

  test('does NOT emit a placeholder for a non-plantuml fence', () => {
    const input = '```javascript\nconsole.log("hi");\n```';
    const output = md.render(input);
    expect(output).not.toContain(PLACEHOLDER_PREFIX);
  });

  test('emits placeholders for multiple plantuml blocks', () => {
    const input = [
      '```plantuml\n@startuml\nA -> B\n@enduml\n```',
      '',
      '```plantuml\n@startuml\nC -> D\n@enduml\n```',
    ].join('\n');
    const output = md.render(input);
    const count = (output.match(new RegExp(escapeRegex(PLACEHOLDER_PREFIX), 'g')) ?? []).length;
    expect(count).toBe(2);
  });

  // ── resolveAsync — no placeholders ────────────────────────────

  test('resolveAsync returns the string unchanged when no placeholders exist', async () => {
    const html = '<p>No diagrams here</p>';
    const result = await PlantUmlPlugin.resolveAsync(html);
    expect(result).toBe(html);
  });

  test('resolveAsync on empty string returns empty string', async () => {
    const result = await PlantUmlPlugin.resolveAsync('');
    expect(result).toBe('');
  });

  // ── resolveAsync — with placeholders ──────────────────────────

  test('resolveAsync replaces a placeholder with the mock SVG', async () => {
    const source = '@startuml\nAlice -> Bob\n@enduml\n';
    const encoded = Buffer.from(source).toString('base64');
    const html = `<p>before</p>\n${PLACEHOLDER_PREFIX}${encoded}${PLACEHOLDER_SUFFIX}\n<p>after</p>`;

    const result = await PlantUmlPlugin.resolveAsync(html);

    expect(result).not.toContain(PLACEHOLDER_PREFIX);
    expect(result).toContain('<svg');
    expect(result).toContain('mock diagram');
    expect(result).toContain('<p>before</p>');
    expect(result).toContain('<p>after</p>');
  });

  test('resolveAsync replaces multiple placeholders independently', async () => {
    const source1 = '@startuml\nA -> B\n@enduml\n';
    const source2 = '@startuml\nC -> D\n@enduml\n';
    const enc1 = Buffer.from(source1).toString('base64');
    const enc2 = Buffer.from(source2).toString('base64');
    const html = [
      `${PLACEHOLDER_PREFIX}${enc1}${PLACEHOLDER_SUFFIX}`,
      '<p>middle</p>',
      `${PLACEHOLDER_PREFIX}${enc2}${PLACEHOLDER_SUFFIX}`,
    ].join('\n');

    const result = await PlantUmlPlugin.resolveAsync(html);

    expect(result).not.toContain(PLACEHOLDER_PREFIX);
    expect(result).toContain('<p>middle</p>');
    const svgCount = (result.match(/<svg/g) ?? []).length;
    expect(svgCount).toBe(2);
  });

  test('resolveAsync preserves surrounding content', async () => {
    const source = '@startuml\nA -> B\n@enduml\n';
    const encoded = Buffer.from(source).toString('base64');
    const html = `<h1>Title</h1>\n${PLACEHOLDER_PREFIX}${encoded}${PLACEHOLDER_SUFFIX}\n<p>Footer</p>`;

    const result = await PlantUmlPlugin.resolveAsync(html);

    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>Footer</p>');
  });

  // ── full pipeline round-trip (placeholder → SVG) ──────────────

  test('full round-trip: plantuml fence → placeholder → SVG via pipeline render', async () => {
    const source = '@startuml\nAlice -> Bob\n@enduml';
    const rendered = md.render(`\`\`\`plantuml\n${source}\n\`\`\``);

    expect(rendered).toContain(PLACEHOLDER_PREFIX);      // placeholder exists before resolve

    const resolved = await PlantUmlPlugin.resolveAsync(rendered);
    expect(resolved).not.toContain(PLACEHOLDER_PREFIX);  // placeholder gone after resolve
    expect(resolved).toContain('<svg');                   // SVG is present
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
