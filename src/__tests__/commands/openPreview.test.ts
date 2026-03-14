import * as vscode from 'vscode';
import { registerOpenPreview } from '../../commands/openPreview';
import { PreviewPanel } from '../../preview/PreviewPanel';

jest.mock('../../preview/PreviewPanel', () => ({
  PreviewPanel: {
    createOrShow: jest.fn(),
  },
}));

describe('registerOpenPreview (Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers xmarkdown2pdf.openPreview command', () => {
    const context = { subscriptions: [] } as any;
    registerOpenPreview(context);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'xmarkdown2pdf.openPreview',
      expect.any(Function)
    );
    expect(context.subscriptions.length).toBe(1);
  });

  test('shows warning when no active markdown editor', async () => {
    const context = { subscriptions: [] } as any;
    registerOpenPreview(context);

    const callback = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];

    (vscode.window as any).activeTextEditor = undefined;
    await callback();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Open a Markdown file first.');
    expect(PreviewPanel.createOrShow).not.toHaveBeenCalled();
  });

  test('opens preview for active markdown editor', async () => {
    const context = { subscriptions: [] } as any;
    registerOpenPreview(context);

    const callback = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];

    const doc = {
      languageId: 'markdown',
      fileName: '/tmp/file.md',
      getText: () => '# hi',
      uri: { toString: () => 'file:///tmp/file.md' },
    };

    (vscode.window as any).activeTextEditor = {
      document: doc,
    };

    await callback();

    expect(PreviewPanel.createOrShow).toHaveBeenCalledTimes(1);
    expect(PreviewPanel.createOrShow).toHaveBeenCalledWith(context, doc, expect.any(Object));
  });
});
