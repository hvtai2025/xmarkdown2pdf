/**
 * Manual mock for the 'vscode' module.
 * Keeps tests runnable outside a VS Code extension host.
 *
 * Add mock implementations here as new VS Code APIs are needed in tests.
 */
import * as path from 'path';

// ── workspace ──────────────────────────────────────────────────
const defaultConfig: Record<string, unknown> = {
  'export.includeToc': true,
  'export.includeOutline': true,
  'export.tocTitle': 'Table of Contents',
  'export.tocMaxDepth': 3,
  'export.titleSource': 'firstHeading',
  'export.documentTitle': '',
  'pdf.format': 'A4',
  'pdf.margin': { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  'pdf.printBackground': true,
  'pdf.browserExecutablePath': '',
  'pdf.launchArgs': ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  'plantuml.renderMode': 'local',
  'plantuml.serverUrl': '',
  'plantuml.jarPath': '',
  'preview.includeToc': false,
  'preview.scrollSync': true,
  'preview.theme': 'github',
  'preview.customCssPath': '',
  'preview.mermaidJsPath': '',
  'preview.highlightJsPath': '',
};

export const workspace = {
  getConfiguration: jest.fn((_section: string) => ({
    get: jest.fn(<T>(key: string, defaultValue: T): T => {
      return (defaultConfig[key] as T) ?? defaultValue;
    }),
    update: jest.fn().mockResolvedValue(undefined),
  })),
  onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
};

// ── window ─────────────────────────────────────────────────────
export const window = {
  activeTextEditor: undefined as unknown,
  createWebviewPanel: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInputBox: jest.fn(),
  withProgress: jest.fn(async (_opts: unknown, task: () => Promise<void>) => task()),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  })),
  onDidChangeTextEditorSelection: jest.fn(() => ({ dispose: jest.fn() })),
};

// ── commands ───────────────────────────────────────────────────
export const commands = {
  registerCommand: jest.fn((_id: string, _cb: unknown) => ({ dispose: jest.fn() })),
  executeCommand: jest.fn(),
};

// ── Uri ────────────────────────────────────────────────────────
export const Uri = {
  file: jest.fn((fsPath: string) => ({
    fsPath,
    scheme: 'file',
    toString: () => `file://${fsPath}`,
  })),
  joinPath: jest.fn((base: { fsPath?: string }, ...segments: string[]) => {
    const basePath = base.fsPath ?? String(base);
    const joined = path.join(basePath, ...segments);
    return {
      fsPath: joined,
      scheme: 'file',
      toString: () => joined,
    };
  }),
};

// ── Webview stub ───────────────────────────────────────────────
export function makeWebviewStub(extensionPath: string) {
  return {
    cspSource: 'vscode-webview:',
    asWebviewUri: jest.fn((uri: { fsPath: string }) => ({
      toString: () => `vscode-resource://${uri.fsPath}`,
    })),
    postMessage: jest.fn(),
    onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
  };
}

// ── ViewColumn ─────────────────────────────────────────────────
export const ViewColumn = {
  Active: 1,
  Beside: 2,
};

// ── ProgressLocation ───────────────────────────────────────────
export const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15,
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

// ── EventEmitter ───────────────────────────────────────────────
export class EventEmitter<T = void> {
  event = jest.fn();
  fire = jest.fn((_data?: T) => {});
  dispose = jest.fn();
}

// ── env ────────────────────────────────────────────────────────
export const env = {
  openExternal: jest.fn(),
};
