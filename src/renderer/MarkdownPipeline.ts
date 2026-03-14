import MarkdownIt from 'markdown-it';
import type { RendererPlugin } from './RendererPlugin';
import { MermaidPlugin } from './plugins/MermaidPlugin';
import { PlantUmlPlugin } from './plugins/PlantUmlPlugin';

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
  async render(markdown: string): Promise<string> {
    // PlantUML plugin replaces fences with placeholders during md.render(),
    // then resolves them asynchronously.
    return PlantUmlPlugin.resolveAsync(this.md.render(markdown));
  }
}
