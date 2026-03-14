import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownPipeline } from '../renderer/MarkdownPipeline';
import { buildFullHtmlPage } from './previewTemplate';
import { Settings } from '../config/Settings';

/**
 * Singleton WYSIWYG preview panel.
 * Opens beside the editor and updates on every document change (debounced).
 */
export class PreviewPanel {
  private static instance: PreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly pipeline: MarkdownPipeline;
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private initialized = false;

  private constructor(
    private document: vscode.TextDocument,
    context: vscode.ExtensionContext,
    pipeline: MarkdownPipeline
  ) {
    this.pipeline = pipeline;

    this.panel = vscode.window.createWebviewPanel(
      'xmarkdown2pdfPreview',
      `Preview: ${path.basename(document.fileName)}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
        retainContextWhenHidden: true,
      }
    );

    this.panel.onDidDispose(() => this.disposeInternal(true), null, this.disposables);

    // Update preview when the active document changes content
    vscode.workspace.onDidChangeTextDocument(
      e => {
        if (e.document.uri.toString() === this.document.uri.toString()) {
          this.scheduleUpdate(context);
        }
      },
      null,
      this.disposables
    );

    // Scroll sync: relay cursor line to webview
    if (Settings.get().previewScrollSync) {
      vscode.window.onDidChangeTextEditorSelection(
        e => {
          if (e.textEditor.document.uri.toString() === this.document.uri.toString()) {
            const line = e.selections[0].active.line;
            this.panel.webview.postMessage({ type: 'scrollToLine', line });
          }
        },
        null,
        this.disposables
      );
    }

    this.render(context);
  }

  static createOrShow(
    context: vscode.ExtensionContext,
    document: vscode.TextDocument,
    pipeline: MarkdownPipeline
  ): void {
    if (PreviewPanel.instance) {
      PreviewPanel.instance.document = document;
      PreviewPanel.instance.panel.title = `Preview: ${path.basename(document.fileName)}`;
      PreviewPanel.instance.panel.reveal(vscode.ViewColumn.Beside, true);
      void PreviewPanel.instance.render(context);
      return;
    }
    PreviewPanel.instance = new PreviewPanel(document, context, pipeline);
  }

  private scheduleUpdate(context: vscode.ExtensionContext): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(context), 300);
  }

  private async render(context: vscode.ExtensionContext): Promise<void> {
    const fragment = await this.pipeline.render(this.document.getText());
    // First render must set the complete HTML shell with scripts/styles.
    if (!this.initialized) {
      const html = buildFullHtmlPage(
        { fragment, embedScripts: false, forExport: false },
        context,
        this.panel.webview
      );
      this.panel.webview.html = html;
      this.initialized = true;
      return;
    }

    // Next renders only patch document HTML to preserve scroll and state.
    this.panel.webview.postMessage({ type: 'update', html: fragment });
  }

  private disposeInternal(fromPanelEvent: boolean): void {
    PreviewPanel.instance = undefined;
    if (!fromPanelEvent) {
      this.panel.dispose();
    }
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
