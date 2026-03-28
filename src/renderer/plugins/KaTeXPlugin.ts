import type MarkdownIt from 'markdown-it';
import katex from 'katex';

/**
 * KaTeXPlugin: Markdown-it plugin to render LaTeX math using KaTeX during Markdown rendering.
 */
export class KaTeXPlugin {
  readonly name = 'katex';

  apply(md: MarkdownIt): void {
    // Inline math: $...$
    md.inline.ruler.after('escape', 'katex_inline', (state, silent) => {
      const start = state.pos;
      if (state.src[start] !== '$') return false;
      let match = start + 1;
      while (match < state.src.length && state.src[match] !== '$') match++;
      if (match === state.src.length) return false;
      const content = state.src.slice(start + 1, match);
      if (!content.trim()) return false;
      if (!silent) {
        const token = state.push('katex_inline', 'span', 0);
        token.content = content;
      }
      state.pos = match + 1;
      return true;
    });
    md.renderer.rules.katex_inline = (tokens, idx) => {
      try {
        return katex.renderToString(tokens[idx].content, { throwOnError: false });
      } catch {
        return `<span class="katex-error">${tokens[idx].content}</span>`;
      }
    };

    // Display math: $$...$$
    md.block.ruler.after('blockquote', 'katex_block', (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      if (state.src.slice(start, start + 2) !== '$$') return false;
      let nextLine = startLine + 1;
      let found = false;
      let content = '';
      while (nextLine < endLine) {
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lineMax = state.eMarks[nextLine];
        if (state.src.slice(lineStart, lineStart + 2) === '$$') {
          found = true;
          break;
        }
        content += state.src.slice(lineStart, lineMax) + '\n';
        nextLine++;
      }
      if (!found) return false;
      if (!silent) {
        const token = state.push('katex_block', 'div', 0);
        token.block = true;
        token.content = content.trim();
        token.map = [startLine, nextLine + 1];
      }
      state.line = nextLine + 1;
      return true;
    });
    md.renderer.rules.katex_block = (tokens, idx) => {
      try {
        return `<div class="katex-display">${katex.renderToString(tokens[idx].content, { displayMode: true, throwOnError: false })}</div>`;
      } catch {
        return `<div class="katex-error">${tokens[idx].content}</div>`;
      }
    };
  }
}
