import * as vscode from 'vscode';
import { MarkdownPipeline } from '../renderer/MarkdownPipeline';
import { PreviewPanel } from '../preview/PreviewPanel';

const pipeline = new MarkdownPipeline();

export function registerOpenPreview(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('xmarkdown2pdf.openPreview', async (uri?: vscode.Uri) => {
      let document: vscode.TextDocument;
      if (uri) {
        document = await vscode.workspace.openTextDocument(uri);
      } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
          vscode.window.showWarningMessage('Open a Markdown file first.');
          return;
        }
        document = editor.document;
      }
      PreviewPanel.createOrShow(context, document, pipeline);
    })
  );
}
