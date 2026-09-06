# Desktop and mobile runtime

Build one independent plugin that works on both platforms. Inspect the actual environment first;
consult exact API declarations and @since annotations before using unfamiliar methods.
Desktop success never proves that an iPhone can perform the same operation.

## Capability decisions

| Concern | Desktop | iOS / Android | Implementation |
| --- | --- | --- | --- |
| Files | Native paths may exist | Vault adapter abstracts storage | Always Vault/DataAdapter and vault-relative paths; never fs, path, child_process or FileSystemAdapter |
| Process / dependencies | Node may be exposed by host | Node and Electron unavailable | No shell, CLI, subprocess, native module, npm install or remote module imports on either platform |
| Interface | Multiple narrow panes/windows | Touch, software keyboard, suspension | Responsive container layout; feature-detect input and browser APIs |
| Network | Web requests may hit CORS | WebView requests may hit CORS | requestUrl when needed; response is buffered, not a streaming transport |
| Background work | Can still close or sleep | May suspend immediately | Persist at meaningful actions; recover on reopen; never promise background execution |
| Microphone / clipboard | Availability and permissions vary | Availability and permissions vary | Detect capability and handle denial; provide keyboard or manual alternatives |

Use Platform.isMobile/isIosApp/isAndroidApp for host-specific behavior, not to guess viewport size.
Inspect the view's own container size and matchMedia('(pointer: coarse)') for layout/input decisions.
Keep minAppVersion honest; newer type declarations do not prove a method exists in this installation.
Return a useful unavailable-feature message instead of calling a missing API.

## Imports and packaging

Read lookup_reference('plugins') for allowed host modules and the build contract.
Use normal static local imports in plugin source. execute_obsidian has injected app/obsidian instead;
it cannot import or export. Neither context can use unresolved React or Node packages.
Bundle assets/dependencies locally; no dependency on Superpowers surviving installation.
Use Web APIs supported by the targeted WebViews; transpilation cannot polyfill missing runtime APIs.
No global process, Buffer, require, __dirname, Electron or desktop-only regex assumptions.

## Lifecycle

Register commands, views and events once on load. Use the Plugin/Component lifecycle registration
helpers to dispose listeners, intervals, observers and subscriptions. Use each ItemView's contentEl.
Keep DOM ownership with the view's document; do not append UI to a captured global document.body.
Closing a view must abort its pending UI work and release listeners. Reopening must restore saved state
without duplicate commands. Avoid awaiting user interaction inside onload.
For timers, persist timestamps and recompute elapsed time on resume; never count interval ticks as time.
Don't rely on onunload alone to save data; the OS can terminate the process.

Reference: https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development
