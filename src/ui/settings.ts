import { Modal, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinitionRender } from 'obsidian';
import type Superpowers from '../main';
import { providerSchema } from '../adapters/ai/settings';

type SettingRow = Pick<SettingDefinitionRender, 'name' | 'desc'> & { render: (setting: Setting) => void };

/** One set of searchable rows shared by modern settings, the legacy tab and the chat modal. */
function settingDefinitions(plugin: Superpowers) {
  const definitions: SettingRow[] = [{
    name: 'Conecta tus proveedores',
    desc: 'Las peticiones van directamente al proveedor; no hay un servidor de Superpowers.',
    render: () => {},
  }, {
    name: 'Proveedor del chat',
    render: (setting) => {
      setting.addDropdown((dropdown) => {
        dropdown.addOptions({ openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google Gemini' }).setValue(plugin.settings.provider).onChange(async (value) => {
          plugin.settings.provider = providerSchema.parse(value);
          await plugin.saveSettings();
        });
      });
    },
  }];
  for (const provider of providerSchema.options) {
    definitions.push({
      name: `${provider} · API key`,
      desc: 'Guardada en este dispositivo, fuera de los archivos del vault.',
      render: (setting) => {
        setting.addText((input) => {
          input.inputEl.type = 'password';
          input.inputEl.autocomplete = 'off';
          input.setPlaceholder('API key').setValue(plugin.credentials.get(provider)).onChange((value) => plugin.credentials.set(provider, value));
        });
      },
    }, {
      name: `${provider} · Modelo`,
      desc: 'ID del modelo con soporte de herramientas. Puedes usar cualquier modelo compatible de tu cuenta.',
      render: (setting) => {
        setting.addText((input) => {
          input.setValue(plugin.settings.models[provider]).onChange(async (value) => { plugin.settings.models[provider] = value.trim(); await plugin.saveSettings(); });
        });
      },
    });
  }
  definitions.push({
    name: 'Pasos por petición',
    desc: 'Límite del bucle del agente. Puedes pedirle que continúe si necesita más pasos.',
    render: (setting) => {
      setting.addText((input) => {
        input.inputEl.type = 'number';
        input.inputEl.min = '1'; input.inputEl.max = '200';
        input.setValue(String(plugin.settings.maxSteps)).onChange(async (value) => {
          const steps = Number(value);
          if (Number.isInteger(steps) && steps >= 1 && steps <= 200) { plugin.settings.maxSteps = steps; await plugin.saveSettings(); }
        });
      });
    },
  }, {
    name: 'Dictado',
    desc: 'Utiliza la clave de OpenAI. También puedes usar el dictado del teclado de tu móvil.',
    render: () => {},
  }, {
    name: 'Autonomía',
    desc: 'El agente puede modificar el vault y activar código con tu petición. Las funcionalidades generadas son plugins independientes.',
    render: () => {},
  });
  return definitions;
}

function renderSettings(container: HTMLElement, plugin: Superpowers) {
  container.empty();
  for (const definition of settingDefinitions(plugin)) {
    const setting = new Setting(container).setName(definition.name);
    if (definition.desc) setting.setDesc(definition.desc);
    // The renderer only needs the stable Setting API, also available before 1.13.
    definition.render(setting);
  }
}

export class SuperpowersSettings extends PluginSettingTab {
  constructor(private readonly owner: Superpowers) { super(owner.app, owner); }
  getSettingDefinitions() { return settingDefinitions(this.owner); }
  display() { renderSettings(this.containerEl, this.owner); }
}

export class SettingsModal extends Modal {
  constructor(private readonly owner: Superpowers) { super(owner.app); }
  onOpen() { renderSettings(this.contentEl, this.owner); }
  onClose() { this.contentEl.empty(); this.owner.refreshViews(); }
}
