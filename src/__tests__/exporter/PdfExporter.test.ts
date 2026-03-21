import * as vscode from 'vscode';
import * as fs from 'fs';
import { PdfExporter } from '../../exporter/PdfExporter';

const setContent = jest.fn().mockResolvedValue(undefined);
const setRequestInterception = jest.fn().mockResolvedValue(undefined);
const requestOn = jest.fn();
const evaluate = jest.fn().mockResolvedValue(undefined);
const pdf = jest.fn().mockResolvedValue(undefined);

const page = {
  setContent,
  setRequestInterception,
  on: requestOn,
  evaluate,
  pdf,
};

const newPage = jest.fn().mockResolvedValue(page);
const close = jest.fn().mockResolvedValue(undefined);

const launch = jest.fn().mockResolvedValue({
  newPage,
  close,
});

jest.mock('puppeteer', () => ({
  launch,
}));

describe('PdfExporter (Phase 3)', () => {
  const context = {
    extensionPath: process.cwd(),
    extensionUri: { fsPath: process.cwd() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('launches puppeteer and writes a PDF', async () => {
    await PdfExporter.export(
      '<nav class="table-of-contents" aria-label="Table of contents" role="doc-toc"><a href="#hi">Hi</a></nav><h1 id="hi">Hi</h1>',
      '/tmp/test.pdf',
      context,
      { documentTitle: 'Hi' }
    );

    expect(launch).toHaveBeenCalledTimes(1);
    expect(newPage).toHaveBeenCalledTimes(1);
    expect(setRequestInterception).toHaveBeenCalledWith(true);
    expect(requestOn).toHaveBeenCalledWith('request', expect.any(Function));
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'), { waitUntil: 'domcontentloaded' });
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('table-of-contents'), { waitUntil: 'domcontentloaded' });
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('<title>Hi</title>'), { waitUntil: 'domcontentloaded' });
    expect(pdf).toHaveBeenCalledWith(expect.objectContaining({
      path: '/tmp/test.pdf',
      outline: true,
      printBackground: true,
    }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('closes browser even if page.pdf fails', async () => {
    pdf.mockRejectedValueOnce(new Error('pdf failed'));

    await expect(PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context)).rejects.toThrow('pdf failed');
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('ignores evaluate wait errors and still generates pdf', async () => {
    evaluate.mockRejectedValueOnce(new Error('wait timeout'));

    await PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context);

    expect(pdf).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('fails fast with a clear error when configured browser path does not exist', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValueOnce({
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'pdf.browserExecutablePath') {
          return 'C:/missing/chrome.exe' as T;
        }
        return defaultValue;
      }),
    });

    await expect(PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context)).rejects.toThrow(
      'Configured browser executable was not found'
    );
    expect(launch).not.toHaveBeenCalled();
  });

  test('auto-discovers Chrome on Windows when browserExecutablePath is empty', async () => {
    const originalPlatform = process.platform;
    const originalProgramFiles = process.env.PROGRAMFILES;
    const originalProgramFilesX86 = process.env['PROGRAMFILES(X86)'];
    const originalLocalAppData = process.env.LOCALAPPDATA;

    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env.PROGRAMFILES = 'C:\\Program Files';
    process.env['PROGRAMFILES(X86)'] = 'C:\\Program Files (x86)';
    process.env.LOCALAPPDATA = 'C:\\Users\\Demo\\AppData\\Local';

    const discoveredPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    fs.writeFileSync(discoveredPath, 'binary');

    try {
      await PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context);
    } finally {
      if (fs.existsSync(discoveredPath)) {
        fs.unlinkSync(discoveredPath);
      }
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      process.env.PROGRAMFILES = originalProgramFiles;
      process.env['PROGRAMFILES(X86)'] = originalProgramFilesX86;
      process.env.LOCALAPPDATA = originalLocalAppData;
    }

    expect(launch).toHaveBeenCalledWith(expect.objectContaining({
      executablePath: discoveredPath,
    }));
  });

  test('falls back to Puppeteer default launch options when no Windows browser is found', async () => {
    const originalPlatform = process.platform;
    const originalProgramFiles = process.env.PROGRAMFILES;
    const originalProgramFilesX86 = process.env['PROGRAMFILES(X86)'];
    const originalLocalAppData = process.env.LOCALAPPDATA;

    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env.PROGRAMFILES = 'C:\\NopeProgramFiles';
    process.env['PROGRAMFILES(X86)'] = 'C:\\NopeProgramFilesX86';
    process.env.LOCALAPPDATA = 'C:\\NopeLocalAppData';

    try {
      await PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context);
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      process.env.PROGRAMFILES = originalProgramFiles;
      process.env['PROGRAMFILES(X86)'] = originalProgramFilesX86;
      process.env.LOCALAPPDATA = originalLocalAppData;
    }

    expect(launch).toHaveBeenCalledWith(expect.not.objectContaining({
      executablePath: expect.any(String),
    }));
  });

  test('enforces minimum top/bottom margins when branding is enabled', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValueOnce({
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'brand.enabled') {
          return true as T;
        }
        if (key === 'pdf.margin') {
          return { top: '10mm', right: '20mm', bottom: '12mm', left: '20mm' } as T;
        }
        return defaultValue;
      }),
    });

    await PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context);

    expect(pdf).toHaveBeenCalledWith(expect.objectContaining({
      margin: {
        top: '25mm',
        right: '20mm',
        bottom: '25mm',
        left: '20mm',
      },
      displayHeaderFooter: true,
    }));
  });

  test('keeps larger configured top/bottom margins when branding is enabled', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValueOnce({
      get: jest.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'brand.enabled') {
          return true as T;
        }
        if (key === 'pdf.margin') {
          return { top: '30mm', right: '20mm', bottom: '28mm', left: '20mm' } as T;
        }
        return defaultValue;
      }),
    });

    await PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context);

    expect(pdf).toHaveBeenCalledWith(expect.objectContaining({
      margin: {
        top: '30mm',
        right: '20mm',
        bottom: '28mm',
        left: '20mm',
      },
      displayHeaderFooter: true,
    }));
  });
});
