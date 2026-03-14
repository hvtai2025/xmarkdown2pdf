import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { LibManager } from '../../libs/LibManager';

describe('LibManager (Phase 2)', () => {
  // --- URL validation ---

  test('accepts allowed HTTPS hosts', () => {
    expect(() => LibManager.assertAllowedDownloadUrl('https://cdn.jsdelivr.net/npm/mermaid@1/dist/mermaid.min.js')).not.toThrow();
    expect(() => LibManager.assertAllowedDownloadUrl('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js')).not.toThrow();
    expect(() => LibManager.assertAllowedDownloadUrl('https://github.com/plantuml/plantuml/releases/download/v1/plantuml-1.jar')).not.toThrow();
    expect(() => LibManager.assertAllowedDownloadUrl('https://release-assets.githubusercontent.com/example/asset.jar')).not.toThrow();
  });

  test('rejects HTTP URLs', () => {
    expect(() => LibManager.assertAllowedDownloadUrl('http://cdn.jsdelivr.net/npm/mermaid@1/dist/mermaid.min.js'))
      .toThrow('Only HTTPS download URLs are allowed');
  });

  test('rejects non-allowlisted hosts', () => {
    expect(() => LibManager.assertAllowedDownloadUrl('https://evil.example.com/file.js'))
      .toThrow('Download host is not allowed');
  });

  test('rejects malformed URLs', () => {
    expect(() => LibManager.assertAllowedDownloadUrl('not-a-url')).toThrow('Invalid download URL');
  });

  // --- upgrade flow ---

  test('upgradeAll updates libs.json when newer versions are available', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xmd2pdf-libmgr-'));
    const manifestPath = path.join(tmpDir, 'libs.json');

    const manifest = {
      mermaid: {
        version: '1.0.0',
        cdn: 'https://cdn.jsdelivr.net/npm/mermaid@{version}/dist/mermaid.min.js',
        localPath: 'media/libs/mermaid.min.js',
      },
      plantuml: {
        version: '1.0.0',
        downloadUrl: 'https://github.com/plantuml/plantuml/releases/download/v{version}/plantuml-{version}.jar',
        localPath: 'media/libs/plantuml.jar',
      },
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    const context = {
      extensionPath: tmpDir,
    } as any;

    const log = {
      appendLine: jest.fn(),
    } as any;

    const fetchSpy = jest
      .spyOn(LibManager as any, 'fetchLatestVersion')
      .mockImplementation(async (...args: any[]) => {
        const name = args[0] as string;
        return name === 'mermaid' ? '2.0.0' : '1.0.0';
      });

    const downloadSpy = jest
      .spyOn(LibManager, 'downloadLib')
      .mockResolvedValue(undefined);

    try {
      await LibManager.upgradeAll(context, log);

      const updated = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      expect(updated.mermaid.version).toBe('2.0.0');
      expect(updated.plantuml.version).toBe('1.0.0');
      expect(downloadSpy).toHaveBeenCalledTimes(1);
      expect(log.appendLine).toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      downloadSpy.mockRestore();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('upgradeAll keeps libs.json unchanged when already up to date', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xmd2pdf-libmgr-'));
    const manifestPath = path.join(tmpDir, 'libs.json');

    const manifest = {
      mermaid: {
        version: '1.0.0',
        cdn: 'https://cdn.jsdelivr.net/npm/mermaid@{version}/dist/mermaid.min.js',
        localPath: 'media/libs/mermaid.min.js',
      },
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    const context = {
      extensionPath: tmpDir,
    } as any;

    const log = {
      appendLine: jest.fn(),
    } as any;

    const fetchSpy = jest
      .spyOn(LibManager as any, 'fetchLatestVersion')
      .mockResolvedValue('1.0.0');

    const downloadSpy = jest
      .spyOn(LibManager, 'downloadLib')
      .mockResolvedValue(undefined);

    try {
      const before = await fs.readFile(manifestPath, 'utf-8');
      await LibManager.upgradeAll(context, log);
      const after = await fs.readFile(manifestPath, 'utf-8');

      expect(after).toBe(before);
      expect(downloadSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      downloadSpy.mockRestore();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('fetchLatestVersion uses packageName when it differs from manifest key', async () => {
    const fetchSpy = jest
      .spyOn(LibManager as any, 'fetchLatestNpmVersion')
      .mockResolvedValue('11.11.0');

    try {
      const latest = await (LibManager as any).fetchLatestVersion('highlight', {
        version: '11.10.0',
        packageName: 'highlight.js',
        cdn: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/{version}/highlight.min.js',
        localPath: 'media/libs/highlight.min.js',
      });

      expect(latest).toBe('11.11.0');
      expect(fetchSpy).toHaveBeenCalledWith('highlight.js');
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
