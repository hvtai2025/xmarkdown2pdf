import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
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
    pipeline: MarkdownPipeline = new MarkdownPipeline(),
    options: { sourceFilePath?: string } = {}
  ): Promise<void> {
    const settings = Settings.get();
    const renderedDocument = await pipeline.renderDocument(markdown, {
      includeToc: settings.exportIncludeToc,
      tocTitle: settings.exportTocTitle,
      tocMaxDepth: settings.exportTocMaxDepth,
    });

    const sourceTitlePath = options.sourceFilePath ?? outputPath;
    const resolvedDocumentTitle = settings.exportDocumentTitle
      ? settings.exportDocumentTitle
      : settings.exportTitleSource === 'fileName'
        ? path.parse(sourceTitlePath).name
        : renderedDocument.title;

    const html = buildFullHtmlPage(
      {
        fragment: renderedDocument.fragment,
        documentTitle: resolvedDocumentTitle,
        embedScripts: true,
        forExport: true,
      },
      context
    );
    await fs.writeFile(outputPath, html, 'utf-8');
  }
}
