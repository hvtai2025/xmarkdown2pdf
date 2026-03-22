import * as path from 'path';
import * as fs from 'fs/promises';
import { LibManager } from './libs/LibManager';
import * as vscode from 'vscode';
import { registerExportHtml } from './commands/exportHtml';
import { registerExportPdf } from './commands/exportPdf';
import { registerOpenPreview } from './commands/openPreview';
import { registerUpgradeLibs } from './commands/upgradeLibs';


async function ensureManagedLibs(context: vscode.ExtensionContext): Promise<void> {
  const manifestPath = path.join(context.extensionPath, 'libs.json');
  let manifest: Record<string, { localPath: string; version: string } & Record<string, any>>;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  } catch {
    return;
  }
  const missing: Array<{ name: string; entry: any }> = [];
  for (const [name, entry] of Object.entries(manifest)) {
    const abs = path.join(context.extensionPath, entry.localPath);
    try {
      await fs.access(abs);
    } catch {
      missing.push({ name, entry });
    }
  }
  if (missing.length > 0) {
    const log = vscode.window.createOutputChannel('xMarkdown2PDF — Bootstrap');
    log.appendLine('Downloading missing libraries...');
    for (const { name, entry } of missing) {
      try {
        log.appendLine(`[${name}] Downloading...`);
        await LibManager.downloadLib(entry, entry.version, context, log);
        log.appendLine(`[${name}] Done.`);
      } catch (err) {
        log.appendLine(`[${name}] ERROR: ${String(err)}`);
      }
    }
    log.appendLine('Library bootstrap complete.');
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await ensureManagedLibs(context);
  registerOpenPreview(context);
  registerExportHtml(context);
  registerExportPdf(context);
  registerUpgradeLibs(context);
}

export function deactivate(): void {
  // Nothing to clean up; PreviewPanel disposes itself via its onDidDispose listener.
}
