import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as https from 'https';
import { LibManager } from '../libs/LibManager';

const outputChannel = vscode.window.createOutputChannel('xMarkdown2PDF — Upgrade');

export function registerUpgradeLibs(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('xmarkdown2pdf.upgradeLibs', async () => {
      outputChannel.show(true);
      outputChannel.appendLine('Checking for library upgrades…\n');

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Upgrading libraries…', cancellable: false },
        async () => {
          await LibManager.upgradeAll(context, outputChannel);
        }
      );

      vscode.window.showInformationMessage('Library upgrade complete. Check the output channel for details.');
    })
  );
}
