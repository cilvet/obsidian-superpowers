import { ItemView, Plugin, Notice, Platform } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { UIMessage } from 'ai';
import { Studio } from './application/studio';
import { WasmCompiler } from './adapters/compiler/wasm-compiler';
import { ObsidianVault } from './adapters/obsidian/vault';
import { ObsidianPluginHost } from './adapters/obsidian/plugin-host';
import { ObsidianRuntime } from './adapters/obsidian/runtime';
import { LocalReferences } from './adapters/obsidian/references';
import { bundledReferences, loadCompilerWasm } from './adapters/bundled-assets';
import { obsidianFetch } from './adapters/obsidian/network';
import { createTools } from './adapters/ai/tools';
import { ChatSession, loadHistory } from './adapters/ai/session';
import { settingsSchema, DeviceCredentials } from './adapters/ai/settings';
import { transcribeAudio } from './adapters/ai/transcription';
import { ChatView } from './ui/Chat';
import { SettingsModal, SuperpowersSettings } from './ui/settings';

const VIEW_TYPE = 'superpowers-chat';

class SuperpowersView extends ItemView {
  private root?: Root;
  constructor(leaf: WorkspaceLeaf, private readonly owner: Superpowers) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Superpowers'; }
  getIcon() { return 'sparkles'; }
  async onOpen() {
    this.contentEl.addClass('sp-root');
    this.root = createRoot(this.contentEl);
    this.render();
  }
  render() {
    this.root?.render(<ChatView session={this.owner.session} modelLabel={this.owner.settings.models[this.owner.settings.provider]} openSettings={() => new SettingsModal(this.owner).open()} transcribe={(audio, signal) => transcribeAudio(audio, this.owner.credentials.get('openai'), this.owner.settings.transcriptionModel, obsidianFetch, signal)} />);
  }
  async onClose() { this.root?.unmount(); this.root = undefined; await this.owner.session.stop(); }
}

export default class Superpowers extends Plugin {
  settings = settingsSchema.parse({});
  credentials!: DeviceCredentials;
  session!: ChatSession;
  studio!: Studio;
  runtime!: ObsidianRuntime;
  references!: LocalReferences;

  async onload() {
    this.settings = settingsSchema.parse(await this.loadData() ?? {});
    await this.saveSettings();
    this.credentials = new DeviceCredentials(this.settings.credentialNamespace, window.localStorage);
    const folder = this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
    const vault = new ObsidianVault(this.app);
    const compiler = new WasmCompiler(loadCompilerWasm);
    this.studio = new Studio(vault, compiler, new ObsidianPluginHost(this.app));
    this.runtime = new ObsidianRuntime(this.app, this, compiler);
    this.references = new LocalReferences(vault, bundledReferences);
    const historyPath = `${folder}/history.json`;
    let history: UIMessage[];
    try { history = await loadHistory(vault, historyPath); }
    catch (error) {
      // Keep malformed histories rather than overwriting them on the first render.
      if (await vault.exists(historyPath)) await vault.write(`${historyPath}.${Date.now()}.backup`, await vault.read(historyPath));
      new Notice(error instanceof Error ? error.message : String(error));
      history = [];
    }
    this.session = new ChatSession(vault, historyPath, createTools(this.studio, this.runtime, this.references), this.references, () => this.settings, this.credentials, obsidianFetch, history);
    this.registerView(VIEW_TYPE, (leaf) => new SuperpowersView(leaf, this));
    this.addRibbonIcon('sparkles', 'Abrir Superpowers', () => { void this.openChat(); });
    this.addCommand({ id: 'open-chat', name: 'Abrir chat', callback: () => { void this.openChat(); } });
    this.addCommand({ id: 'settings', name: 'Configurar proveedores', callback: () => new SettingsModal(this).open() });
    this.addSettingTab(new SuperpowersSettings(this));
  }

  async saveSettings() { await this.saveData(this.settings); }
  refreshViews() { for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) if (leaf.view instanceof SuperpowersView) leaf.view.render(); }
  async openChat() {
    if (!this.app.workspace.layoutReady) await new Promise<void>((resolve) => this.app.workspace.onLayoutReady(resolve));
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = (Platform.isMobile ? this.app.workspace.getLeaf('tab') : this.app.workspace.getRightLeaf(false)) ?? this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  onunload() { void this.session?.stop(); }
}
