import MarkdownIt from 'markdown-it';
import type { RendererPlugin } from './RendererPlugin';
import { MermaidPlugin } from './plugins/MermaidPlugin';
import { PlantUmlPlugin } from './plugins/PlantUmlPlugin';

export interface RenderOptions {
  includeToc?: boolean;
  tocTitle?: string;
  tocMaxDepth?: number;
}

interface HeadingEntry {
  id: string;
  level: number;
  text: string;
}

interface RenderEnvironment {
  xmarkdown2pdfHeadings?: HeadingEntry[];
}

type HeadingTreeNode = HeadingEntry & { children: HeadingTreeNode[] };

const DEFAULT_TOC_TITLE = 'Table of Contents';

/**
 * Central markdown rendering pipeline.
 * Register plugins once; call render() as many times as needed.
 */
export class MarkdownPipeline {
  private readonly md: MarkdownIt;
  private readonly plugins: RendererPlugin[] = [];

  constructor() {
    this.md = new MarkdownIt({
      html: true,        // allow raw HTML pass-through
      linkify: true,
      typographer: true,
    });

    this.enableHeadingAnchors();

    this.register(new MermaidPlugin());
    this.register(new PlantUmlPlugin());
  }

  register(plugin: RendererPlugin): this {
    this.plugins.push(plugin);
    plugin.apply(this.md);
    return this;
  }

  /**
   * Render markdown text to an HTML fragment (not a full page).
   * PlantUML rendering is async; everything else is sync inside markdown-it.
   */
  async render(markdown: string, options: RenderOptions = {}): Promise<string> {
    const env: RenderEnvironment = {};
    // PlantUML plugin replaces fences with placeholders during md.render(),
    // then resolves them asynchronously.
    const rendered = this.md.render(markdown, env);
    const fragment = await PlantUmlPlugin.resolveAsync(rendered);

    if (!options.includeToc) {
      return fragment;
    }

    const toc = buildToc(env.xmarkdown2pdfHeadings ?? [], {
      title: options.tocTitle,
      maxDepth: options.tocMaxDepth,
    });

    return toc ? `${toc}\n${fragment}` : fragment;
  }

  private enableHeadingAnchors(): void {
    this.md.core.ruler.push('xmarkdown2pdf_heading_anchors', state => {
      const headings: HeadingEntry[] = [];
      const slugCounts = new Map<string, number>();

      for (let index = 0; index < state.tokens.length; index++) {
        const token = state.tokens[index];
        if (token.type !== 'heading_open') {
          continue;
        }

        const inlineToken = state.tokens[index + 1];
        if (!inlineToken || inlineToken.type !== 'inline') {
          continue;
        }

        const level = Number.parseInt(token.tag.slice(1), 10);
        if (Number.isNaN(level)) {
          continue;
        }

        const headingText = extractHeadingText(inlineToken.content);
        const id = createUniqueSlug(headingText, slugCounts);
        token.attrSet('id', id);
        headings.push({ id, level, text: headingText });
      }

      const env = state.env as RenderEnvironment;
      env.xmarkdown2pdfHeadings = headings;
    });
  }
}

function extractHeadingText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized || 'Section';
}

function createUniqueSlug(text: string, counts: Map<string, number>): string {
  const baseSlug = slugify(text);
  const seen = counts.get(baseSlug) ?? 0;
  counts.set(baseSlug, seen + 1);
  return seen === 0 ? baseSlug : `${baseSlug}-${seen}`;
}

function slugify(text: string): string {
  const normalized = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return normalized || 'section';
}

function buildToc(headings: HeadingEntry[], options: { title?: string; maxDepth?: number }): string {
  const maxDepth = normalizeHeadingDepth(options.maxDepth);
  const filteredHeadings = headings.filter(heading => heading.level <= maxDepth);
  if (filteredHeadings.length === 0) {
    return '';
  }

  const title = escapeHtml((options.title ?? DEFAULT_TOC_TITLE).trim() || DEFAULT_TOC_TITLE);
  const tree = buildHeadingTree(filteredHeadings);

  return [
    '<nav class="table-of-contents" aria-label="Table of contents">',
    `  <p class="table-of-contents__title">${title}</p>`,
    renderHeadingList(tree, 1),
    '</nav>',
  ].join('\n');
}

function normalizeHeadingDepth(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 3;
  }
  return Math.min(6, Math.max(1, value));
}

function buildHeadingTree(headings: HeadingEntry[]): HeadingTreeNode[] {
  const root: HeadingTreeNode = { id: '', level: 0, text: '', children: [] };
  const stack: HeadingTreeNode[] = [root];

  for (const heading of headings) {
    const node: HeadingTreeNode = { ...heading, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }

  return root.children;
}

function renderHeadingList(nodes: HeadingTreeNode[], depth: number): string {
  const indent = '  '.repeat(depth);
  const items = nodes.map(node => {
    const link = `<a href="#${escapeHtml(node.id)}">${escapeHtml(node.text)}</a>`;
    if (node.children.length === 0) {
      return `${indent}  <li>${link}</li>`;
    }

    return [
      `${indent}  <li>${link}`,
      renderHeadingList(node.children, depth + 2),
      `${indent}  </li>`,
    ].join('\n');
  });

  return [
    `${indent}<ol>`,
    ...items,
    `${indent}</ol>`,
  ].join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
