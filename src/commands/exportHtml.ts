import * as vscode from 'vscode';
import * as path from 'path';
import { HtmlExporter } from '../exporter/HtmlExporter';

export function registerExportHtml(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('xmarkdown2pdf.exportHtml', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Open a Markdown file first.');
        return;
      }

      const mdPath = editor.document.uri.fsPath;
      const outPath = mdPath.replace(/\.md$/i, '.html');

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Exporting HTML…', cancellable: false },
        async () => {
          await HtmlExporter.export(editor.document.getText(), outPath, context);
        }
      );

      const openAction = 'Open File';
      const choice = await vscode.window.showInformationMessage(
        `HTML saved: ${path.basename(outPath)}`, openAction
      );
      if (choice === openAction) {
        vscode.env.openExternal(vscode.Uri.file(outPath));
      }
    })
  );
}
