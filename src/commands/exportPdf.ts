import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownPipeline } from '../renderer/MarkdownPipeline';
import { PdfBrowserPathError, PdfExporter } from '../exporter/PdfExporter';
import { Settings } from '../config/Settings';

const pipeline = new MarkdownPipeline();

function resolveExportDocumentTitle(
  renderedTitle: string,
  sourceFilePath: string,
  settings: ReturnType<typeof Settings.get>
): string {
  if (settings.exportDocumentTitle) {
    return settings.exportDocumentTitle;
  }

  if (settings.exportTitleSource === 'fileName') {
    return path.parse(sourceFilePath).name;
  }

  return renderedTitle;
}

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

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Exporting PDF…', cancellable: false },
          async () => {
            const settings = Settings.get();
            const renderedDocument = await pipeline.renderDocument(document.getText(), {
              includeToc: settings.exportIncludeToc,
              tocTitle: settings.exportTocTitle,
              tocMaxDepth: settings.exportTocMaxDepth,
            });
            await PdfExporter.export(renderedDocument.fragment, outPath, context, {
              documentTitle: resolveExportDocumentTitle(renderedDocument.title, mdPath, settings),
            });
          }
        );
      } catch (error) {
        const openSettingsAction = 'Open PDF Browser Setting';
        const details = error instanceof Error ? error.message : String(error);
        const userMessage = error instanceof PdfBrowserPathError
          ? details
          : `PDF export failed: ${details}`;

        const choice = await vscode.window.showErrorMessage(userMessage, openSettingsAction);
        if (choice === openSettingsAction) {
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'xmarkdown2pdf.pdf.browserExecutablePath'
          );
        }
        return;
      }

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
