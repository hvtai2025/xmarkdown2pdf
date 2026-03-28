import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as https from 'https';
import * as http from 'http';
import * as fsSync from 'fs';

interface LibEntry {
  version: string;
  packageName?: string;
  cdn?: string;
  downloadUrl?: string;
  localPath: string;
}

type LibsManifest = Record<string, LibEntry>;

const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'registry.npmjs.org',
  'api.github.com',
  'github.com',
  'release-assets.githubusercontent.com',
  'objects.githubusercontent.com',
  'raw.githubusercontent.com',
]);

/**
 * LibManager
 *
 * Reads libs.json, checks for newer versions via npm registry / GitHub releases,
 * downloads updated files, and persists the new versions back to libs.json.
 */
export class LibManager {
  // Track missing libraries for degraded mode
  static missingLibs: Set<string> = new Set();
  static degradedMode = false;
  static async upgradeAll(
    context: vscode.ExtensionContext,
    log: vscode.OutputChannel
  ): Promise<void> {
    log.appendLine('[DIAG] Starting upgradeAll');
    log.appendLine(`[DIAG] context.extensionPath: ${context.extensionPath}`);
    const manifestPath = path.join(context.extensionPath, 'libs.json');
    log.appendLine(`[DIAG] manifestPath: ${manifestPath}`);
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest: LibsManifest = JSON.parse(manifestRaw);

    let changed = false;
    LibManager.missingLibs.clear();
    LibManager.degradedMode = false;
    const failed: string[] = [];

    for (const [name, entry] of Object.entries(manifest)) {
      log.appendLine(`[DIAG] Processing: ${name}`);
      log.appendLine(`[DIAG] Entry: ${JSON.stringify(entry)}`);
      log.appendLine(`[${name}] Current version: ${entry.version}`);
      try {
        const latest = await LibManager.fetchLatestVersion(name, entry);
        log.appendLine(`[DIAG] Latest version for ${name}: ${latest}`);
        if (latest && latest !== entry.version) {
          log.appendLine(`[${name}] Upgrading ${entry.version} → ${latest}`);
          await LibManager.downloadLib(entry, latest, context, log);
          manifest[name].version = latest;
          changed = true;
          log.appendLine(`[${name}] Done.\n`);
        } else {
          log.appendLine(`[${name}] Already up to date.\n`);
        }
      } catch (err) {
        log.appendLine(`[DIAG] Error while processing ${name}: ${String(err)}`);
        log.appendLine(`[${name}] ERROR: ${String(err)}\n`);
        LibManager.degradedMode = true;
        LibManager.missingLibs.add(entry.localPath);
        failed.push(name);
      }
    }

    if (changed) {
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      log.appendLine('libs.json updated.');
    }

    if (failed.length > 0) {
      const settingsAction = 'Open Library Settings';
      const msg = `Some libraries failed to upgrade: ${failed.join(', ')}.\n\nYou can manually download the missing files and set their paths in the extension settings (e.g., previewMermaidJsPath, previewHighlightJsPath, previewMathJaxJsPath, plantumlJarPath).`;
      vscode.window.showErrorMessage(msg, settingsAction).then(choice => {
        if (choice === settingsAction) {
          vscode.commands.executeCommand('workbench.action.openSettings', 'xmarkdown2pdf');
        }
      });
    }
  }

  private static async fetchLatestVersion(name: string, entry: LibEntry): Promise<string | null> {
    if (name === 'plantuml') {
      return LibManager.fetchLatestPlantumlVersion();
    }
    // Use npm registry for JS packages
    return LibManager.fetchLatestNpmVersion(entry.packageName ?? name);
  }

  private static fetchLatestNpmVersion(packageName: string): Promise<string | null> {
    return new Promise((resolve) => {
      const url = `https://registry.npmjs.org/${packageName}/latest`;
      https.get(url, { headers: { 'User-Agent': 'xmarkdown2pdf-vscode' } }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data).version ?? null);
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  private static fetchLatestPlantumlVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const url = 'https://api.github.com/repos/plantuml/plantuml/releases/latest';
      https.get(url, { headers: { 'User-Agent': 'xmarkdown2pdf-vscode' } }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const tag: string = JSON.parse(data).tag_name ?? '';
            resolve(tag.replace(/^v/, '') || null);
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  static async downloadLib(
    entry: LibEntry,
    newVersion: string,
    context: vscode.ExtensionContext,
    log: vscode.OutputChannel
  ): Promise<void> {
    log.appendLine(`[DIAG] downloadLib: entry=${JSON.stringify(entry)}, newVersion=${newVersion}`);
    let template = entry.cdn ?? entry.downloadUrl ?? '';
    if (!template) {
      LibManager.degradedMode = true;
      LibManager.missingLibs.add(entry.localPath);
      throw new Error('No download template found in libs.json entry.');
    }
    let url = template.replace(/{version}/g, newVersion);
    let destPath = path.join(context.extensionPath, entry.localPath);
    log.appendLine(`[DIAG] downloadLib: url=${url}, destPath=${destPath}`);
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // Special handling for MathJax: for v4+, always use tex-chtml.js (tex-chtml-full.js no longer exists)
    if (entry.localPath.endsWith('tex-chtml-full.js') && newVersion.startsWith('4')) {
      // Always use tex-chtml.js for v4+
      url = template.replace('tex-chtml-full.js', 'tex-chtml.js').replace(/{version}/g, newVersion);
      destPath = destPath.replace('tex-chtml-full.js', 'tex-chtml.js');
      log.appendLine(`[DIAG] MathJax v4+ special case: url=${url}, destPath=${destPath}`);
      try {
        LibManager.assertAllowedDownloadUrl(url);
        log.appendLine(`  Downloading: ${url}`);
        await LibManager.download(url, destPath);
        log.appendLine(`[DIAG] Downloaded to ${destPath}`);
      } catch (err) {
        log.appendLine(`[DIAG] Error downloading MathJax: ${String(err)}`);
        LibManager.degradedMode = true;
        LibManager.missingLibs.add(entry.localPath);
        throw err;
      }
      return;
    }

    try {
      LibManager.assertAllowedDownloadUrl(url);
      log.appendLine(`  Downloading: ${url}`);
      await LibManager.download(url, destPath);
      log.appendLine(`[DIAG] Downloaded to ${destPath}`);
    } catch (err) {
      log.appendLine(`[DIAG] Error downloading ${entry.localPath}: ${String(err)}`);
      LibManager.degradedMode = true;
      LibManager.missingLibs.add(entry.localPath);
      throw err;
    }
  }

  // Helper to check if a library is missing (for degraded mode)
  static isLibMissing(localPath: string): boolean {
    return LibManager.missingLibs.has(localPath);
  }

  static async download(url: string, dest: string): Promise<void> {
    const bytes = await LibManager.fetchBytes(url, 5);
    console.log(`[DIAG] Writing to ${dest}, bytes length: ${bytes.length}`);
    await fs.writeFile(dest, bytes);
    if (!fsSync.existsSync(dest)) {
      console.log(`[DIAG] File not found after write: ${dest}`);
      throw new Error(`Failed to write file: ${dest}`);
    } else {
      console.log(`[DIAG] File written successfully: ${dest}`);
    }
  }

  static assertAllowedDownloadUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid download URL: ${url}`);
    }

    if (parsed.protocol !== 'https:') {
      throw new Error(`Only HTTPS download URLs are allowed: ${url}`);
    }
    if (!ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
      throw new Error(`Download host is not allowed: ${parsed.hostname}`);
    }
  }

  private static fetchBytes(url: string, redirectsLeft: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      LibManager.assertAllowedDownloadUrl(url);
      const client = url.startsWith('https') ? https : http;
      client
        .get(url, { headers: { 'User-Agent': 'xmarkdown2pdf-vscode' } }, res => {
          const status = res.statusCode ?? 0;

          if ((status === 301 || status === 302 || status === 307 || status === 308) && res.headers.location) {
            if (redirectsLeft <= 0) {
              reject(new Error(`Too many redirects for ${url}`));
              return;
            }
            const next = new URL(res.headers.location, url).toString();
            LibManager.fetchBytes(next, redirectsLeft - 1).then(resolve).catch(reject);
            return;
          }

          if (status !== 200) {
            reject(new Error(`HTTP ${status} for ${url}`));
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        })
        .on('error', reject);
    });
  }
}
