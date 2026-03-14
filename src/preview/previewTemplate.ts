import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Settings } from '../config/Settings';

interface TemplateOptions {
  fragment: string;
  embedScripts: boolean;   // true for static HTML export; false for webview (uses vscode-resource URIs)
  forExport: boolean;      // true suppresses the live-update script
}

/**
 * Build a full HTML page wrapping an HTML fragment produced by MarkdownPipeline.
 *
 * @param options   Rendering options
 * @param context   Extension context (for resolving media paths)
 * @param webview   Only required when embedScripts=false (WebviewPanel)
 */
export function buildFullHtmlPage(
  options: TemplateOptions,
  context: vscode.ExtensionContext,
  webview?: vscode.Webview
): string {
  const settings = Settings.get();
  const mediaDir = path.join(context.extensionPath, 'media');

  // For export: read raw file content to inline directly into <script> tags.
  // For webview: resolve to a vscode-resource URI used as <script src="...">
  const mermaidScript = resolveScript(
    path.join(mediaDir, 'libs', 'mermaid.min.js'),
    'mermaid.min.js',
    options.embedScripts,
    webview,
    context
  );

  const highlightScript = resolveScript(
    path.join(mediaDir, 'libs', 'highlight.min.js'),
    'highlight.min.js',
    options.embedScripts,
    webview,
    context
  );

  const css = resolveStyleSrc(
    path.join(mediaDir, 'preview.css'),
    settings.previewCustomCssPath,
    options.embedScripts,
    webview,
    context
  );

  const nonce = generateNonce();

  const liveUpdateScript = options.forExport ? '' : `
    <script nonce="${nonce}">
      window.addEventListener('message', event => {
        const msg = event.data;
        if (msg.type === 'update') {
          document.getElementById('content').innerHTML = msg.html;
          mermaid.run();
          hljs.highlightAll();
        } else if (msg.type === 'scrollToLine') {
          // Basic scroll sync via data-source-line attributes (set by the pipeline)
          const el = document.querySelector('[data-source-line="' + msg.line + '"]');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    </script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src 'self' 'unsafe-inline' ${webview ? webview.cspSource : ''};
                 script-src 'nonce-${nonce}' ${webview ? webview.cspSource : ''};
                 img-src 'self' data: ${webview ? webview.cspSource : ''};
                 font-src 'self' ${webview ? webview.cspSource : ''};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Preview</title>
  ${css}
</head>
<body class="theme-${settings.previewTheme}">
  <div id="content">${options.fragment}</div>

  ${renderScriptTag(highlightScript, nonce)}
  ${renderScriptTag(mermaidScript, nonce)}
  <script nonce="${nonce}">
    mermaid.initialize({ startOnLoad: true, theme: '${settings.previewTheme === 'dark' ? 'dark' : 'default'}' });
    hljs.highlightAll();
  </script>
  ${liveUpdateScript}
</body>
</html>`;
}

// ---- Helpers ----

type ScriptRef =
  | { kind: 'inline'; content: string }
  | { kind: 'src'; url: string };

/**
 * For export (embed=true): returns the raw JS content to inline in a <script> block.
 * For webview (embed=false): returns a vscode-resource URI for <script src="...">.
 * Inline avoids CSP issues with data: URIs and keeps exported HTML self-contained.
 */
function resolveScript(
  fsPath: string,
  filename: string,
  embed: boolean,
  webview: vscode.Webview | undefined,
  context: vscode.ExtensionContext
): ScriptRef {
  if (embed) {
    const content = fs.existsSync(fsPath)
      ? fs.readFileSync(fsPath, 'utf-8')
      : `console.warn('${filename} not found');`;
    return { kind: 'inline', content };
  }
  const url = webview!.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', filename)
  ).toString();
  return { kind: 'src', url };
}

function renderScriptTag(script: ScriptRef, nonce: string): string {
  if (script.kind === 'inline') {
    return `<script nonce="${nonce}">${script.content}</script>`;
  }
  return `<script nonce="${nonce}" src="${script.url}"></script>`;
}

function resolveStyleSrc(
  defaultCssPath: string,
  customCssPath: string,
  embed: boolean,
  webview: vscode.Webview | undefined,
  context: vscode.ExtensionContext
): string {
  const usePath = customCssPath && fs.existsSync(customCssPath) ? customCssPath : defaultCssPath;
  if (embed) {
    const content = fs.existsSync(usePath) ? fs.readFileSync(usePath, 'utf-8') : '';
    return `<style>${content}</style>`;
  }
  const uri = webview!.asWebviewUri(vscode.Uri.file(usePath)).toString();
  return `<link rel="stylesheet" href="${uri}">`;
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
