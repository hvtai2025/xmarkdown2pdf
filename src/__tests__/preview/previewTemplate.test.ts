import * as path from 'path';
import { buildFullHtmlPage } from '../../preview/previewTemplate';

// The 'vscode' module is mapped to __mocks__/vscode.ts via jest.config.js.
// workspace.getConfiguration will return default values (matching Settings defaults).

const EXTENSION_PATH = path.resolve(__dirname, '../../../');

/** Minimal ExtensionContext stub that satisfies buildFullHtmlPage's needs. */
function makeContext(extensionPath = EXTENSION_PATH) {
  return {
    extensionPath,
    extensionUri: { fsPath: extensionPath },
    subscriptions: [],
  } as any;
}

describe('buildFullHtmlPage (embed mode — for HTML export)', () => {
  const context = makeContext();
  const fragment = '<h1>Hello</h1><p>World</p>';

  function build(overrides: Partial<Parameters<typeof buildFullHtmlPage>[0]> = {}) {
    return buildFullHtmlPage(
      { fragment, embedScripts: true, forExport: true, ...overrides },
      context
    );
  }

  // ── structure ─────────────────────────────────────────────────

  test('returns a string starting with <!DOCTYPE html>', () => {
    const html = build();
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  test('contains <html>, <head>, and <body> tags', () => {
    const html = build();
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body');
    expect(html).toContain('</html>');
  });

  test('embeds the fragment inside <div id="content">', () => {
    const html = build();
    expect(html).toContain('<div id="content">');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<p>World</p>');
  });

  test('preserves table of contents markup in the content wrapper', () => {
    const html = buildFullHtmlPage(
      {
        fragment: '<nav class="table-of-contents"><a href="#hello">Hello</a></nav><h1 id="hello">Hello</h1>',
        embedScripts: true,
        forExport: true,
      },
      context
    );

    expect(html).toContain('<nav class="table-of-contents">');
    expect(html).toContain('<a href="#hello">Hello</a>');
  });

  // ── security (Content-Security-Policy) ────────────────────────

  test('contains a Content-Security-Policy meta tag', () => {
    const html = build();
    expect(html).toContain('Content-Security-Policy');
  });

  test('CSP uses a nonce for script-src', () => {
    const html = build();
    expect(html).toMatch(/script-src 'nonce-[A-Za-z0-9]+'/);
  });

  test('nonce values in CSP and script tags are identical', () => {
    const html = build();
    const nonceMatch = html.match(/'nonce-([A-Za-z0-9]+)'/);
    expect(nonceMatch).not.toBeNull();
    const nonce = nonceMatch![1];
    // Match only real HTML <script> opening tags (space or > immediately after
    // "script") to avoid false positives inside inlined library source.
    const scriptTags = html.match(/<script[\s>][^>]*>/g) ?? [];
    expect(scriptTags.length).toBeGreaterThan(0);
    for (const tag of scriptTags) {
      expect(tag).toContain(`nonce="${nonce}"`);
    }
  });

  test('each call generates a different nonce', () => {
    const html1 = build();
    const html2 = build();
    const n1 = html1.match(/'nonce-([A-Za-z0-9]+)'/)?.[1];
    const n2 = html2.match(/'nonce-([A-Za-z0-9]+)'/)?.[1];
    expect(n1).not.toBe(n2);
  });

  // ── scripts ───────────────────────────────────────────────────

  test('embeds mermaid.js as an inline script (embedScripts:true)', () => {
    const html = build({ embedScripts: true });
    // Scripts must be inlined directly — not as data: URIs (which CSP blocks)
    expect(html).not.toMatch(/src="data:text\/javascript;base64,/);
    // Each library script tag should have no src attribute
    const mermaidTag = html.match(/<script[\s>][^>]*>/g)?.find(t => !t.includes('src='));
    expect(mermaidTag).toBeDefined();
  });

  test('contains a mermaid.initialize() call', () => {
    const html = build();
    expect(html).toContain('mermaid.initialize(');
  });

  test('calls hljs.highlightAll()', () => {
    const html = build();
    expect(html).toContain('hljs.highlightAll()');
  });

  // ── live-update script (forExport flag) ───────────────────────

  test('forExport:true suppresses the postMessage live-update script', () => {
    const html = build({ forExport: true });
    expect(html).not.toContain("window.addEventListener('message'");
  });

  test('forExport:false includes the postMessage live-update script', () => {
    const html = build({ forExport: false });
    expect(html).toContain("window.addEventListener('message'");
  });

  // ── theme ─────────────────────────────────────────────────────

  test('applies the default "github" theme class to <body>', () => {
    const html = build();
    expect(html).toContain('class="theme-github"');
  });

  // ── CSS ───────────────────────────────────────────────────────

  test('inlines CSS in <style> tag when embedScripts:true', () => {
    const html = build({ embedScripts: true });
    expect(html).toMatch(/<style>/);
  });

  // ── charset & viewport ────────────────────────────────────────

  test('sets charset to UTF-8', () => {
    const html = build();
    expect(html).toMatch(/<meta charset="UTF-8">/i);
  });

  test('includes a viewport meta tag', () => {
    const html = build();
    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width');
  });
});
