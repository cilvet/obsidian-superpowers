# Community directory submission

Prepared on 2026-09-09. The user supplied directory review feedback rejecting the word
"Obsidian" in the manifest description. Version 0.3.1 removes it. Directory acceptance is not yet confirmed.

## Entry

- Repository: https://github.com/cilvet/obsidian-superpowers (public).
- Owner: personal GitHub account `cilvet`.
- Plugin ID: `superpowers`.
- Name: Superpowers.
- Version: `0.3.1`.
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

The official local linter remains enabled without suppressing these findings. `bun run lint`
currently reports three errors at the Function invocation (`no-implied-eval`, `no-unsafe-call`
and the Obsidian `no-new-func` custom message). These are disclosed for review, not claimed fixed.
It also warns about streaming fetch, deprecated assistant-ui interfaces, sentence casing and the
newer settings-search interface. Streaming fetch has a requestUrl fallback for CORS failures;
the settings tab retains the display API for Obsidian 1.12.4 compatibility.
Directory acceptance of the dynamic execution model must be confirmed by its actual review.

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

Inspect the directory's review of version 0.3.1, address any further feedback, and publish
the listing when accepted.

References: [submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin),
[developer policies](https://docs.obsidian.md/community-directory/developer-policies),
[account and submission setup](https://docs.obsidian.md/community-directory/set-up-and-claim).
