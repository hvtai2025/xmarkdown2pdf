import * as fs from 'fs';
import * as vscode from 'vscode';
import { registerUpgradeLibs } from '../../commands/upgradeLibs';
import { LibManager } from '../../libs/LibManager';

jest.mock('../../libs/LibManager', () => ({
  LibManager: {
    upgradeAll: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('registerUpgradeLibs', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  test('prompts for browser path on Windows when none is available and saves user input', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const update = jest.fn().mockResolvedValue(undefined);
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'pdf.browserExecutablePath') {
          return '' as T;
        }
        return defaultValue;
      }),
      update,
    });

    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Set Browser Path');
    (vscode.window.showInputBox as jest.Mock).mockResolvedValue(
      'C:/Program Files/Google/Chrome/Application/chrome.exe'
    );

    const context = { subscriptions: [] } as any;
    registerUpgradeLibs(context);
    const callback = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];

    await callback();

    expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('forward slashes (/)'),
      placeHolder: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    }));
    expect(update).toHaveBeenCalledWith(
      'pdf.browserExecutablePath',
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      vscode.ConfigurationTarget.Global
    );
    expect(LibManager.upgradeAll).toHaveBeenCalledTimes(1);
  });

  test('does not prompt when configured browser path exists', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const configuredPath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    fs.mkdirSync('C:/Program Files/Google/Chrome/Application', { recursive: true });
    fs.writeFileSync(configuredPath, 'binary');

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'pdf.browserExecutablePath') {
          return configuredPath as T;
        }
        return defaultValue;
      }),
      update: jest.fn().mockResolvedValue(undefined),
    });

    const context = { subscriptions: [] } as any;
    registerUpgradeLibs(context);
    const callback = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];

    try {
      await callback();
    } finally {
      if (fs.existsSync(configuredPath)) {
        fs.unlinkSync(configuredPath);
      }
    }

    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    expect(LibManager.upgradeAll).toHaveBeenCalledTimes(1);
  });
});
