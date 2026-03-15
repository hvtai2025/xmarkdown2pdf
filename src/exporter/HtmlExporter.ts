import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { MarkdownPipeline } from '../renderer/MarkdownPipeline';
import { buildFullHtmlPage } from '../preview/previewTemplate';
import { Settings } from '../config/Settings';

/**
 * HtmlExporter
 *
 * Pure export logic: renders a Markdown string to a self-contained HTML file.
 * Kept separate from the VS Code command so it can be unit-tested without
 * a VS Code host.
 */
export class HtmlExporter {
  /**
   * Render `markdown` and write a self-contained HTML file to `outputPath`.
   *
   * @param markdown    Raw markdown text
   * @param outputPath  Destination .html file path
   * @param context     VS Code extension context (for resolving media assets)
   * @param pipeline    Optional pre-built pipeline (defaults to a new instance)
   */
  static async export(
    markdown: string,
    outputPath: string,
    context: vscode.ExtensionContext,
    pipeline: MarkdownPipeline = new MarkdownPipeline()
  ): Promise<void> {
    const settings = Settings.get();
    const fragment = await pipeline.render(markdown, {
      includeToc: settings.exportIncludeToc,
      tocTitle: settings.exportTocTitle,
      tocMaxDepth: settings.exportTocMaxDepth,
    });
    const html = buildFullHtmlPage(
      { fragment, embedScripts: true, forExport: true },
      context
    );
    await fs.writeFile(outputPath, html, 'utf-8');
  }
}
