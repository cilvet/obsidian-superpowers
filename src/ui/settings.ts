import { Modal, PluginSettingTab, Setting } from 'obsidian';
import type Superpowers from '../main';
import { providerSchema } from '../adapters/ai/settings';

function renderSettings(container: HTMLElement, plugin: Superpowers) {
  container.empty();
  container.createEl('h2', { text: 'Superpowers' });
  container.createEl('p', { text: 'Conecta tus proveedores. Las peticiones van directamente desde Obsidian; no hay un servidor de Superpowers.' });
  new Setting(container).setName('Proveedor del chat').addDropdown((dropdown) => {
    dropdown.addOptions({ openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google Gemini' }).setValue(plugin.settings.provider).onChange(async (value) => {
      plugin.settings.provider = providerSchema.parse(value);
      await plugin.saveSettings();
    });
  });
  for (const provider of providerSchema.options) {
    new Setting(container).setName(`${provider} · API key`).setDesc('Guardada en este dispositivo, fuera de los archivos del vault.').addText((input) => {
      input.inputEl.type = 'password';
      input.inputEl.autocomplete = 'off';
      input.setPlaceholder('API key').setValue(plugin.credentials.get(provider)).onChange((value) => plugin.credentials.set(provider, value));
    });
    new Setting(container).setName(`${provider} · Modelo`).setDesc('ID del modelo con soporte de herramientas. Puedes usar cualquier modelo compatible de tu cuenta.').addText((input) => {
      input.setValue(plugin.settings.models[provider]).onChange(async (value) => { plugin.settings.models[provider] = value.trim(); await plugin.saveSettings(); });
    });
  }
  new Setting(container).setName('Pasos por petición').setDesc('Límite del bucle del agente. Puedes pedirle que continúe si necesita más pasos.').addText((input) => {
    input.inputEl.type = 'number';
    input.inputEl.min = '1'; input.inputEl.max = '200';
    input.setValue(String(plugin.settings.maxSteps)).onChange(async (value) => {
      const steps = Number(value);
      if (Number.isInteger(steps) && steps >= 1 && steps <= 200) { plugin.settings.maxSteps = steps; await plugin.saveSettings(); }
    });
  });
  container.createEl('p', { text: 'El dictado utiliza la clave de OpenAI. También puedes usar el dictado del teclado de tu móvil.' });
  container.createEl('p', { text: 'El agente puede modificar el vault y activar código con tu petición. Las funcionalidades generadas son plugins independientes.' });
}

export class SuperpowersSettings extends PluginSettingTab {
  constructor(private readonly owner: Superpowers) { super(owner.app, owner); }
  display() { renderSettings(this.containerEl, this.owner); }
}

export class SettingsModal extends Modal {
  constructor(private readonly owner: Superpowers) { super(owner.app); }
  onOpen() { renderSettings(this.contentEl, this.owner); }
  onClose() { this.contentEl.empty(); this.owner.refreshViews(); }
}
