import * as vscode from 'vscode';
import { registerExportHtml } from './commands/exportHtml';
import { registerExportPdf } from './commands/exportPdf';
import { registerOpenPreview } from './commands/openPreview';
import { registerUpgradeLibs } from './commands/upgradeLibs';

export function activate(context: vscode.ExtensionContext): void {
  registerOpenPreview(context);
  registerExportHtml(context);
  registerExportPdf(context);
  registerUpgradeLibs(context);
}

export function deactivate(): void {
  // Nothing to clean up; PreviewPanel disposes itself via its onDidDispose listener.
}
