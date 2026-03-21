import * as vscode from 'vscode';
import { registerExportPdf } from '../../commands/exportPdf';
import { PdfBrowserPathError, PdfExporter } from '../../exporter/PdfExporter';

jest.mock('../../exporter/PdfExporter', () => {
  const actual = jest.requireActual('../../exporter/PdfExporter');
  return {
    ...actual,
    PdfExporter: {
      export: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('registerExportPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders a table of contents into the exported PDF fragment', async () => {
    const context = { subscriptions: [] } as any;
    registerExportPdf(context);

    const callback = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
    const document = {
      languageId: 'markdown',
      fileName: '/tmp/report.md',
      getText: () => '# Overview\n\n## Scope',
      uri: { fsPath: '/tmp/report.md', toString: () => 'file:///tmp/report.md' },
    };

    (vscode.window as any).activeTextEditor = { document };
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    await callback();

    expect(PdfExporter.export).toHaveBeenCalledTimes(1);
    const fragment = (PdfExporter.export as jest.Mock).mock.calls[0][0] as string;
    expect(fragment).toContain('<nav class="table-of-contents"');
    expect(fragment).toContain('<a href="#overview">Overview</a>');
    expect(fragment).toContain('<a href="#scope">Scope</a>');
    expect(fragment).toContain('<h1 id="overview">Overview</h1>');
    expect((PdfExporter.export as jest.Mock).mock.calls[0][3]).toEqual({
      documentTitle: 'Overview',
    });
  });

  test('shows actionable error and opens setting when browser path is invalid', async () => {
    const context = { subscriptions: [] } as any;
    registerExportPdf(context);

    const callback = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
    const document = {
      languageId: 'markdown',
      fileName: '/tmp/report.md',
      getText: () => '# Overview',
      uri: { fsPath: '/tmp/report.md', toString: () => 'file:///tmp/report.md' },
    };

    (vscode.window as any).activeTextEditor = { document };
    (PdfExporter.export as jest.Mock).mockRejectedValueOnce(new PdfBrowserPathError('C:/missing/chrome.exe'));
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Open PDF Browser Setting');

    await callback();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Configured browser executable was not found'),
      'Open PDF Browser Setting'
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.openSettings',
      'xmarkdown2pdf.pdf.browserExecutablePath'
    );
  });
});