import type MarkdownIt from 'markdown-it';
import type { RendererPlugin } from '../RendererPlugin';

/**
 * MermaidPlugin
 *
 * Converts fenced code blocks tagged `mermaid` into
 *   <div class="mermaid">…source…</div>
 *
 * The actual rendering is handled client-side by mermaid.js
 * injected into the WebView / Puppeteer page.
 */
export class MermaidPlugin implements RendererPlugin {
  readonly name = 'mermaid';

  apply(md: MarkdownIt): void {
    const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules);

    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.info.trim() === 'mermaid') {
        // Escape HTML entities to prevent XSS when embedding user source
        const source = token.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<div class="mermaid">${source}</div>\n`;
      }
      return defaultFence
        ? defaultFence(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    };
  }
}
