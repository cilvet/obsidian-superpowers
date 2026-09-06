import type { App } from 'obsidian';
import type { PluginHostPort } from '../../application/ports';
import type { PluginManifest } from '../../domain/project';

type PluginManager = {
  manifests: Record<string, PluginManifest & { dir: string }>;
  plugins: Record<string, unknown>;
  enabledPlugins: Set<string>;
  enablePluginAndSave(id: string): Promise<void>;
  disablePluginAndSave(id: string): Promise<void>;
};

/** The only typed boundary around Obsidian's non-public plugin manager. */
function pluginManager(app: App): PluginManager {
  const candidate: unknown = 'plugins' in app ? app.plugins : undefined;
  if (!candidate || typeof candidate !== 'object' ||
    !('enablePluginAndSave' in candidate) || typeof candidate.enablePluginAndSave !== 'function' ||
    !('disablePluginAndSave' in candidate) || typeof candidate.disablePluginAndSave !== 'function' ||
    !('enabledPlugins' in candidate) || !(candidate.enabledPlugins instanceof Set) ||
    !('manifests' in candidate) || !candidate.manifests || typeof candidate.manifests !== 'object' ||
    !('plugins' in candidate) || !candidate.plugins || typeof candidate.plugins !== 'object') {
    throw new Error('This Obsidian version does not expose the expected plugin lifecycle. Compilation still works; activation needs an adapter update.');
  }
  return candidate as PluginManager;
}

export class ObsidianPluginHost implements PluginHostPort {
  constructor(private readonly app: App) {}
  get configDir() { return this.app.vault.configDir; }
  isEnabled(id: string) { return pluginManager(this.app).enabledPlugins.has(id); }
  async deactivate(id: string) {
    const manager = pluginManager(this.app);
    if (manager.plugins[id] || manager.enabledPlugins.has(id)) await manager.disablePluginAndSave(id);
  }
  async activate(manifest: PluginManifest) {
    const manager = pluginManager(this.app);
    manager.manifests[manifest.id] = { ...manifest, dir: `${this.configDir}/plugins/${manifest.id}` };
    // Obsidian catches onload errors internally. Capture only this plugin's failure to
    // return its real diagnostic to the agent rather than an unhelpful boolean.
    const originalError = console.error;
    const diagnostics: string[] = [];
    console.error = (...args: unknown[]) => {
      if (args.some((item) => typeof item === 'string' && item.includes(`Plugin failure: ${manifest.id}`))) {
        for (const item of args) {
          if (item && typeof item === 'object' && 'message' in item && typeof item.message === 'string') diagnostics.push(item.message);
        }
      }
      originalError.apply(console, args);
    };
    try { await manager.enablePluginAndSave(manifest.id); }
    finally { console.error = originalError; }
    if (!manager.plugins[manifest.id] || !manager.enabledPlugins.has(manifest.id)) {
      throw new Error(`Obsidian did not activate ${manifest.id}: ${diagnostics.join('; ') || 'Check the plugin default export and onload lifecycle.'}`);
    }
  }
}
