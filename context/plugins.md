# Independent mobile-compatible plugins

Each plugin needs manifest.json, main.js and optionally styles.css. build_plugin writes these into
<configDir>/plugins/<id>/ and activates the plugin; sources are kept by Superpowers in projects/<id>/project.json.
Do not hand-write compiled output or edit the enabled-plugins file to install a plugin.

Source example (consult current declarations for specific methods):

```ts
import { Plugin, Notice } from 'obsidian';
import { formatName } from './format';

export default class MyPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'show-active-note',
      name: 'Show active note',
      callback: () => new Notice(formatName(this.app.workspace.getActiveFile()?.basename ?? 'No note')),
    });
    this.registerEvent(this.app.vault.on('modify', file => {
      // Filter relevant files; avoid write loops and debounce expensive work.
    }));
  }
}
```

manifest: id (lowercase hyphenated), name, version (x.y.z), minAppVersion, description, author,
isDesktopOnly=false. All generated behavior must be mobile-compatible.

Available external modules:
obsidian, @codemirror/state, @codemirror/view, @codemirror/language, @codemirror/commands,
@codemirror/search, @codemirror/autocomplete, @codemirror/lint, @lezer/common, @lezer/highlight.
Local .ts/.tsx/.js/.jsx/.json/.css imports resolve against the source file set.
React is used by Superpowers' chat but is NOT provided to independent generated plugins.
Use Obsidian's DOM helpers, ItemView, Modal and Setting for generated interfaces, or supply local dependency sources.
JSX needs its own local factory; do not assume react/jsx-runtime exists.
Dynamic imports and computed require calls are not a way to install a package.

Use this.registerEvent, this.registerDomEvent, this.registerInterval and this.register to clean up resources.
Register an ItemView through this.registerView(type, leaf => new MyView(leaf)); use its contentEl.
Destroy external UI roots/listeners in onunload/onClose. Do not create duplicate views or commands after updates.
Use this.loadData()/saveData() for plugin settings. For normal notes use Vault APIs so caches and events stay current.
Do not leave test mutations in unrelated notes. Verify commands or views using app state and their real effects.

esbuild transpiles TypeScript and resolves static imports; it does not perform semantic typechecking.
Use lookup_reference to verify API signatures, and execute the resulting behavior to detect runtime/API errors.
Full API access is trusted execution, not a sandbox. Keep operations task-directed and return compact observations.
