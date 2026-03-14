import type MarkdownIt from 'markdown-it';
import type { RendererPlugin } from '../RendererPlugin';
import * as plantuml from 'node-plantuml';
import { Settings } from '../../config/Settings';

// Placeholder pattern embedded during sync md.render(); resolved async afterwards.
const PLACEHOLDER_PREFIX = '<!--plantuml:';
const PLACEHOLDER_SUFFIX = '-->';

/**
 * PlantUmlPlugin
 *
 * Converts fenced `plantuml` blocks to inline SVG via node-plantuml.
 * Rendering is async, so we use a two-pass approach:
 *  1. md.render() inlines a placeholder comment with base64-encoded source.
 *  2. PlantUmlPlugin.resolveAsync() replaces placeholders with rendered SVG.
 */
export class PlantUmlPlugin implements RendererPlugin {
  readonly name = 'plantuml';

  apply(md: MarkdownIt): void {
    const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules);

    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.info.trim() === 'plantuml') {
        const encoded = Buffer.from(token.content).toString('base64');
        return `${PLACEHOLDER_PREFIX}${encoded}${PLACEHOLDER_SUFFIX}\n`;
      }
      return defaultFence
        ? defaultFence(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    };
  }

  // ---- Static async resolution ----

  /**
   * Replace all plantuml placeholders in an HTML string with rendered SVG.
   */
  static async resolveAsync(html: string): Promise<string> {
    const placeholderRegex = new RegExp(
      `${escapeRegex(PLACEHOLDER_PREFIX)}([A-Za-z0-9+/=]+)${escapeRegex(PLACEHOLDER_SUFFIX)}`,
      'g'
    );

    const matches = [...html.matchAll(placeholderRegex)];
    if (matches.length === 0) {
      return html;
    }

    const svgResults = await Promise.all(
      matches.map(m => PlantUmlPlugin.renderToSvg(Buffer.from(m[1], 'base64').toString('utf-8')))
    );

    let result = html;
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      result =
        result.slice(0, m.index!) +
        svgResults[i] +
        result.slice(m.index! + m[0].length);
    }
    return result;
  }

  private static async renderToSvg(source: string): Promise<string> {
    const settings = Settings.get();
    const mode = settings.plantumlRenderMode;

    if (mode === 'server' || mode === 'kroki') {
      if (mode === 'server' && !settings.plantumlServerUrl) {
        throw new Error('PlantUML server URL is empty. Configure xmarkdown2pdf.plantuml.serverUrl.');
      }
      return PlantUmlPlugin.renderViaHttp(source, mode, settings.plantumlServerUrl);
    }

    // local mode — use node-plantuml
    return new Promise<string>((resolve, reject) => {
      const gen = plantuml.generate(source, {
        format: 'svg',
        jar: settings.plantumlJarPath || undefined,
      });
      const chunks: Buffer[] = [];
      gen.out.on('data', (chunk: Buffer) => chunks.push(chunk));
      gen.out.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      gen.out.on('error', reject);
    });
  }

  private static async renderViaHttp(
    source: string,
    mode: 'server' | 'kroki',
    serverUrl: string
  ): Promise<string> {
    const https = await import('https');
    const http = await import('http');

    let url: string;
    if (mode === 'kroki') {
      // Kroki encodes via deflate+base64url
      const zlib = await import('zlib');
      const deflated = zlib.deflateRawSync(Buffer.from(source));
      const encoded = deflated.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      url = `https://kroki.io/plantuml/svg/${encoded}`;
    } else {
      const encoded = encodeURIComponent(source);
      url = `${serverUrl.replace(/\/$/, '')}/svg/${encoded}`;
    }

    return new Promise<string>((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      (client as typeof https).get(url, res => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
