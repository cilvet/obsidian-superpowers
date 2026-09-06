# Obsidian API workflows

The lookup tool also searches the complete installed obsidian.d.ts declaration file.
Search for a class or method name to inspect the exact signature and @since annotation.

## One-shot tools
execute_obsidian receives app and the obsidian module. Example:

```ts
const file = app.workspace.getActiveFile();
return file ? { path: file.path, properties: app.metadataCache.getFileCache(file)?.frontmatter } : null;
```

Return projected serializable data, not app, DOM nodes or an entire circular plugin instance.
Await asynchronous writes. Check signal.throwIfAborted() between steps of a long workflow.
Register temporary listeners with component, which will be unloaded after execution.
Persistent listeners or commands belong to generated plugins.

## Files and properties
Use Vault.getFiles/getMarkdownFiles/getAbstractFileByPath to discover existing paths.
Check `file instanceof obsidian.TFile` before read/modify. Prefer Vault.process for read-modify-write
and app.fileManager.processFrontMatter to edit properties without corrupting a note's body.
Use DataAdapter for hidden/configuration paths and binary files. It is not a desktop filesystem.
Do not send entire vault contents into context when a small filtered selection is sufficient.

## Bases
Bases provides database-like views over notes and their properties. A .base file holds YAML views/filters/formulas;
records stay in Markdown frontmatter. Creating a .base file may be sufficient without installing a plugin.

```yaml
filters:
  and:
    - 'file.inFolder("Training")'
views:
  - type: table
    name: Training
    order:
      - file.name
      - date
      - duration
```

Open using workspace.openLinkText or getLeaf().openFile with the actual TFile. Embedding: ![[Training.base]].
The Bases core plugin must be available/enabled; inspect the current app and report missing capabilities.

## UI
Use ItemView for persistent views, Modal for dialogs and Setting for settings controls.
Prefer Obsidian CSS variables for contrast and theme compatibility. Scope styles to your plugin.
Make controls touch-friendly and responsive; avoid hover-only actions and fixed desktop widths.

## Platform
No Node.js/Electron even if a desktop test happens to expose them. Use obsidian.Platform for capabilities.
HTTP requests can use obsidian.requestUrl; it bypasses WebView CORS but buffers the response.
The plugin manager used to activate plugins is INTERNAL. Use build_plugin rather than inventing a public install API.
