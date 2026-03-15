import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownPipeline } from '../renderer/MarkdownPipeline';
import { PdfExporter } from '../exporter/PdfExporter';
import { Settings } from '../config/Settings';

const pipeline = new MarkdownPipeline();

export function registerExportPdf(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('xmarkdown2pdf.exportPdf', async (uri?: vscode.Uri) => {
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

      const mdPath = document.uri.fsPath;
      const outPath = mdPath.replace(/\.md$/i, '.pdf');

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Exporting PDF…', cancellable: false },
        async () => {
          const settings = Settings.get();
          const fragment = await pipeline.render(document.getText(), {
            includeToc: settings.exportIncludeToc,
            tocTitle: settings.exportTocTitle,
            tocMaxDepth: settings.exportTocMaxDepth,
          });
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
