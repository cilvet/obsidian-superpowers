# Community directory submission

Prepared on 2026-09-09. The user supplied directory review feedback rejecting the word
"Obsidian" in the manifest description. Version 0.3.1 removed it; version 0.3.2 addresses the subsequent source and packaging feedback. Directory acceptance is not yet confirmed.

## Entry

- Repository: https://github.com/cilvet/obsidian-superpowers (public).
- Owner: personal GitHub account `cilvet`.
- Plugin ID: `superpowers`.
- Name: Superpowers.
- Version: `0.3.2`.
- Minimum app version: `1.12.4`, the desktop version used for integration testing.
- Platforms: desktop and mobile; physical phones have not been verified.
- License: MIT, with bundled third-party license notices inside `main.js`.
- Payment: Superpowers is free. Users supply their own provider accounts/API keys;
  usage may require payment to OpenAI, Anthropic or Google. Disclose third-party costs in the listing.
- Description: Chat with your notes and create new features through conversation.

## Suggested listing text

Superpowers lets you work with your vault and build independent plugins through a single chat.
Connect your own OpenAI, Anthropic or Gemini account, describe the functionality you want,
and the agent can inspect notes, consult bundled API guides, create code, compile it and activate it.
Generated plugins continue working without Superpowers.

The interface currently uses Spanish. The agent can respond in the language of your conversation.
The compiler and guides are included in the installation. No Superpowers server is involved.
Provider usage may incur API charges. Chat messages, tool results and any notes read by the agent
are sent to your selected provider; voice transcription sends recorded audio to OpenAI.

The agent has autonomous access to Obsidian and can modify files and execute generated code.
This execution is not a security sandbox. Use a separate vault when trying unfamiliar tasks.

## Review notes: intentional execution and installation

This plugin's purpose requires running code generated in response to the user's request.
`src/adapters/obsidian/runtime.ts` compiles a tool's TypeScript body with the bundled esbuild WASM
compiler, evaluates it with the JavaScript Function constructor, and invokes it with the app,
Obsidian API, abort signal and a lifecycle-managed component. Dynamic execution has full host
permissions. Restricting imports is a portability check, not a security boundary.

`src/application/studio.ts` writes generated plugin files below the vault's configuration directory.
`src/adapters/obsidian/plugin-host.ts` uses an explicitly checked, internal Obsidian plugin-manager
interface to enable them. A failed activation restores the previous files and enabled state.
Generated plugins are independent output, not dependencies of Superpowers. The build tool rejects
both current and legacy Superpowers IDs. Superpowers does not update itself or download runtime
dependencies. Its general execution tool is powerful and is not claimed to enforce confinement.

### Changes for the 0.3.2 review

The three literal dynamic script creations in the old bundle originated in React DOM's
production client renderer. A version-specific Bun patch removes the script preinitialization
and acquisition paths, replacing them with explicit errors; script rendering is also rejected.
This removes a capability the chat does not use. It is not a spelling change to bypass scanning.
The patch and rationale are available in `patches/`. Compiler/agent execution remains disclosed.

The compiler is now gzip-compressed inside the bundle, and decompressed lazily in memory with
`DecompressionStream`. Compression applies only to the bundled WASM asset; JavaScript remains
statically visible. This reduces main.js from about 21 MB to 7.4 MB, still above Sync Standard's
5 MB limit. Users on that plan must install/update the plugin on each device, e.g. with BRAT.

The official local linter remains enabled without suppression. It now reports two errors at
the intentional Function construction (`no-implied-eval` and the Obsidian `no-new-func` message),
plus a streaming fetch warning. The unsafe-call warning, deprecated chat APIs, settings-search
warning and CSS !important have been addressed. Streaming fetch is needed for incremental
responses and cancellation, with requestUrl as the native buffered fallback for CORS failures.

Vault enumeration is required for discovery. The environment inspector checks clipboard API
availability; the agent can invoke clipboard operations as part of the user's requested task.
These capabilities are not asserted absent or confined to a sandbox.

The tag-triggered GitHub workflow builds and tests the exact release commit, attests the three
installation assets and publishes those assets. Verify provenance with `gh attestation verify`.
Directory acceptance must be confirmed by the actual review of this release.

## Verification

- `bun run check`: strict types, 29 focused tests and production build passed.
- Chromium and WebKit: bundled compiler works offline after loading, without Node globals.
- `bun run verify:release`: actual Obsidian, isolated release vault; installation of only the
  three release assets, three provider protocols with simulated responses, tool batches, compilation,
  activation, rollback, independent generated commands, history restoration and cancellation passed.
- Chat UI at 320, 390 and 900 px: disclosure, changing activity text, reduced motion and SVG icons passed.
- No live model evaluation, physical iOS/Android test or real microphone transcription was performed.
- The beta ID migration copies settings, credential namespace, history and project sources;
  it preserves existing destination files and can resume after an interrupted copy.

## Remaining review steps

Inspect the directory's review of version 0.3.2, address any further feedback, and publish
the listing when accepted.

References: [submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin),
[developer policies](https://docs.obsidian.md/community-directory/developer-policies),
[account and submission setup](https://docs.obsidian.md/community-directory/set-up-and-claim).
