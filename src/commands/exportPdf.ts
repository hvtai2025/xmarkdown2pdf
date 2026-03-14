import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownPipeline } from '../renderer/MarkdownPipeline';
import { PdfExporter } from '../exporter/PdfExporter';

const pipeline = new MarkdownPipeline();

export function registerExportPdf(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('xmarkdown2pdf.exportPdf', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Open a Markdown file first.');
        return;
      }

      const mdPath = editor.document.uri.fsPath;
      const outPath = mdPath.replace(/\.md$/i, '.pdf');

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Exporting PDF…', cancellable: false },
        async () => {
          const fragment = await pipeline.render(editor.document.getText());
          await PdfExporter.export(fragment, outPath, context);
        }
      );

      const openAction = 'Open File';
      const choice = await vscode.window.showInformationMessage(
        `PDF saved: ${path.basename(outPath)}`, openAction
      );
      if (choice === openAction) {
        vscode.env.openExternal(vscode.Uri.file(outPath));
      }
    })
  );
}
