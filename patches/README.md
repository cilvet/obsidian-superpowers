# React DOM without script resources

`react-dom@19.2.8.patch` removes script-element creation from the production client renderer
used by this plugin. The chat renders messages and controls; it has no reason to load scripts.
Calls to `preinit`/`preinitModule` for JavaScript and attempts to render script elements now throw
a clear error. The patch also removes React's inert HTML script-element construction.

This changes behavior instead of disguising calls from a scanner. It does not change or hide
the agent's separate `Function` execution in `src/adapters/obsidian/runtime.ts`, which is an
intentional, disclosed product capability. It is not a security sandbox for the agent.

Bun applies the version-specific patch during `bun install --frozen-lockfile`. Both Chromium
and WebKit tests exercise the rejected preload and render paths and check that no script
was inserted or executed. Real Obsidian integration checks the chat after the patch.
Review and re-test the patch whenever React DOM is updated. Only the production client entrypoint
is patched, and all plugin/test builds explicitly select production React.

React remains licensed under MIT. Its original notice is included in the distributed bundle;
this patch is the source of our modifications.
