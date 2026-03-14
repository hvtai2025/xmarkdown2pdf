import type MarkdownIt from 'markdown-it';

/**
 * Interface every diagram/rendering plugin must implement.
 * Plugins mutate the markdown-it instance in apply().
 */
export interface RendererPlugin {
  readonly name: string;
  apply(md: MarkdownIt): void;
}
