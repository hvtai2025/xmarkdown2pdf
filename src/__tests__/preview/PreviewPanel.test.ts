import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { PreviewPanel } from '../../preview/PreviewPanel';

function makeWebviewStub() {
  return {
    cspSource: 'vscode-webview:',
    asWebviewUri: jest.fn((uri: { fsPath: string }) => ({
      toString: () => `vscode-resource://${uri.fsPath}`,
    })),
    postMessage: jest.fn(),
    onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
  };
}

describe('PreviewPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PreviewPanel as any).instance = undefined;
  });

  test('allows preview webview to load configured custom asset directories', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xmarkdown2pdf-preview-'));
    const cssPath = path.join(tempDir, 'preview.css');
    const mermaidPath = path.join(tempDir, 'mermaid.min.js');
    const highlightPath = path.join(tempDir, 'highlight.min.js');
    fs.writeFileSync(cssPath, 'body {}');
    fs.writeFileSync(mermaidPath, 'window.mermaid = {};');
    fs.writeFileSync(highlightPath, 'window.hljs = {};');

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        const config: Record<string, unknown> = {
          'preview.scrollSync': true,
          'preview.theme': 'github',
          'preview.customCssPath': cssPath,
          'preview.mermaidJsPath': mermaidPath,
          'preview.highlightJsPath': highlightPath,
        };
        return (config[key] as T) ?? defaultValue;
      }),
    });

    const webview = makeWebviewStub();
    const panel = {
      webview,
      title: '',
      reveal: jest.fn(),
      dispose: jest.fn(),
      onDidDispose: jest.fn(),
    };
    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(panel);

    const context = {
      extensionPath: '/extension',
      extensionUri: vscode.Uri.file('/extension'),
    } as any;
    const document = {
      fileName: '/tmp/sample.md',
      getText: () => '# preview',
      uri: { toString: () => 'file:///tmp/sample.md' },
    } as any;
    const pipeline = {
      render: jest.fn().mockResolvedValue('<p>preview</p>'),
    } as any;

    PreviewPanel.createOrShow(context, document, pipeline);

    const options = (vscode.window.createWebviewPanel as jest.Mock).mock.calls[0][3];
    const localRootPaths = options.localResourceRoots.map((uri: { fsPath: string }) => uri.fsPath);

    expect(localRootPaths).toContain(path.join('/extension', 'media'));
    expect(localRootPaths).toContain(tempDir);
  });
});