import type { VaultPort, CompilerPort, PluginHostPort } from '../../src/application/ports';
import type { PluginManifest, BuildResult } from '../../src/domain/project';

export class MemoryVault implements VaultPort {
  files = new Map<string, string>();
  async read(path: string) { const text = this.files.get(path); if (text === undefined) throw new Error(`Missing: ${path}`); return text; }
  async write(path: string, content: string) { this.files.set(path, content); }
  async exists(path: string) { return this.files.has(path); }
  async remove(path: string) { this.files.delete(path); }
  async list(path: string) { return { files: [...this.files.keys()].filter((file) => file.startsWith(path)), folders: [] }; }
}

export class FakeCompiler implements CompilerPort {
  result: BuildResult = { ok: true, bundle: { js: 'new-code', css: '' }, warnings: [] };
  async build() { return this.result; }
  async script(code: string) { return code; }
}

export class MemoryHost implements PluginHostPort {
  configDir = 'custom-config';
  enabled = new Set<string>();
  activations: string[] = [];
  failNext = false;
  isEnabled(id: string) { return this.enabled.has(id); }
  async deactivate(id: string) { this.enabled.delete(id); }
  async activate(manifest: PluginManifest) {
    if (this.failNext) { this.failNext = false; throw new Error('onload failed'); }
    this.activations.push(manifest.version);
    this.enabled.add(manifest.id);
  }
}

export const project = {
  manifest: { id: 'sample-plugin', name: 'Sample', version: '0.1.0', description: 'Test', author: 'Test', minAppVersion: '1.8.0', isDesktopOnly: false as const },
  entry: 'main.ts', files: { 'main.ts': "import {Plugin} from 'obsidian'; export default class Sample extends Plugin {}" },
};
