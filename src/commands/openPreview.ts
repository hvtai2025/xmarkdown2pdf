import * as vscode from 'vscode';
import { MarkdownPipeline } from '../renderer/MarkdownPipeline';
import { PreviewPanel } from '../preview/PreviewPanel';

const pipeline = new MarkdownPipeline();

export function registerOpenPreview(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('xmarkdown2pdf.openPreview', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Open a Markdown file first.');
        return;
      }
      PreviewPanel.createOrShow(context, editor.document, pipeline);
    })
  );
}
