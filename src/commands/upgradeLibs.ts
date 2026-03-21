import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as https from 'https';
import * as fsSync from 'fs';
import { LibManager } from '../libs/LibManager';

const outputChannel = vscode.window.createOutputChannel('xMarkdown2PDF — Upgrade');
const SECTION = 'xmarkdown2pdf';

async function resolveExistingWindowsBrowserPath(configuredPath: string): Promise<string | undefined> {
  const candidates: string[] = [];

  const trimmed = configuredPath.trim();
  if (trimmed) {
    candidates.push(trimmed);
  }

  const programFiles = process.env.PROGRAMFILES;
  const programFilesX86 = process.env['PROGRAMFILES(X86)'];
  const localAppData = process.env.LOCALAPPDATA;

  if (!trimmed) {
    if (programFiles) {
      candidates.push(path.win32.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      candidates.push(path.win32.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
    if (programFilesX86) {
      candidates.push(path.win32.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      candidates.push(path.win32.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
    if (localAppData) {
      candidates.push(path.win32.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      candidates.push(path.win32.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function promptBrowserPathIfMissing(): Promise<void> {
  if (process.platform !== 'win32') {
    return;
  }

  const cfg = vscode.workspace.getConfiguration(SECTION);
  const configuredPath = cfg.get<string>('pdf.browserExecutablePath', '').trim();
  const resolvedPath = await resolveExistingWindowsBrowserPath(configuredPath);
  if (resolvedPath) {
    return;
  }

  const choice = await vscode.window.showWarningMessage(
    configuredPath
      ? 'Configured PDF browser path is not available. Update Library can continue, but please set a valid Chrome path for PDF features.'
      : 'No local Chrome/Edge browser was found. Please set a Chrome executable path for PDF features.',
    'Set Browser Path',
    'Skip'
  );

  if (choice !== 'Set Browser Path') {
    return;
  }

  const inputPath = await vscode.window.showInputBox({
    title: 'Set Chrome Executable Path',
    prompt: 'Enter full Chrome executable path using forward slashes (/). Example: C:/Program Files/Google/Chrome/Application/chrome.exe',
    placeHolder: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    value: configuredPath.replace(/\\/g, '/'),
    ignoreFocusOut: true,
  });

  const normalized = inputPath?.trim();
  if (!normalized) {
    return;
  }

  await cfg.update('pdf.browserExecutablePath', normalized, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage('Saved xmarkdown2pdf.pdf.browserExecutablePath.');
}

export function registerUpgradeLibs(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('xmarkdown2pdf.upgradeLibs', async () => {
      outputChannel.show(true);
      outputChannel.appendLine('Checking for library upgrades…\n');

      await promptBrowserPathIfMissing();

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
