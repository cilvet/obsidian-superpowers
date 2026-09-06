---
name: obsidian-mobile
description: Implement or verify Obsidian host integration, generated plugin compilation, lifecycle and desktop/mobile compatibility in this project.
---

Runtime code runs in Obsidian's WebView. Use Vault/DataAdapter, Web APIs and requestUrl;
never FileSystemAdapter, Electron, Node builtins or subprocesses. Paths are vault-relative,
and the configuration directory is `app.vault.configDir`, not a hardcoded `.obsidian`.

Bundle the WASM compiler and API references inside main.js; BRAT installs only main.js,
manifest.json and styles.css. Keep WASM decoding and initialization lazy, using Web APIs.
Generated plugins must bundle local imports and externalize only runtime modules Obsidian provides.
Unknown imports must produce actionable errors, not become unresolved runtime `require` calls.

Obsidian's plugin-manager methods are internal. Keep their capability checks in one adapter;
do not spread casts through the app. Activation is autonomous, errors visible and previous output recoverable.
Register listeners, timers, views and React cleanup with Obsidian lifecycle owners.

Use `context/` and the installed `obsidian` declaration file as the agent's maintained API reference.
Test compilation in a real browser without Node globals, not only through native esbuild.
Mobile viewport emulation cannot establish physical iOS/Android compatibility.
