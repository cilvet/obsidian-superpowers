import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { openaiEvents, anthropicEvents, googleEvents } from './support/protocol-fixtures.ts';
import type { Reply } from './support/protocol-fixtures.ts';
import type Superpowers from '../src/main';
import type { App, Command } from 'obsidian';
import type { UIMessage } from 'ai';

declare const app: App & {
  plugins: { plugins: Record<string, Superpowers>; enabledPlugins: Set<string>; enablePlugin(id: string): Promise<void>; disablePlugin(id: string): Promise<void> };
  commands: { commands: Record<string, Command> };
  setting: { close(): void };
  emulateMobile(value: boolean): void;
};

declare global {
  interface Window {
    spFixture?: { original: typeof fetch; calls: number; requests: string[] };
  }
}

const browser = await chromium.connectOverCDP(process.env.OBSIDIAN_CDP ?? 'http://127.0.0.1:9237');
const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().startsWith('app://obsidian.md'));
if (!page) throw new Error('Open the isolated Obsidian test profile first.');
const findings: string[] = [];
const pageErrors: string[] = [];
let original: { settings: Superpowers['settings']; messages: UIMessage[] } | undefined;
page.on('pageerror', (error) => { pageErrors.push(error.message); console.error('Page error:', error.message); });
page.on('console', (message) => { if (message.type() === 'error') console.error('Obsidian:', message.text().slice(0, 400)); });
async function emulateMobile(enabled: boolean) {
  if (await page!.evaluate(() => document.body.classList.contains('emulate-mobile')) !== enabled) {
    await Promise.all([
      page!.waitForEvent('domcontentloaded', { timeout: 15000 }),
      page!.evaluate((enabled) => app.emulateMobile(enabled), enabled).catch((error: unknown) => {
        if (!(error instanceof Error) || !error.message.includes('Execution context was destroyed')) throw error;
      }),
    ]);
  }
  await page!.waitForFunction(() => 'app' in window && app.plugins?.plugins['obsidian-superpowers']);
  await page!.evaluate(() => app.plugins.plugins['obsidian-superpowers']!.openChat());
}
try {
  await page.waitForFunction(() => 'app' in window && app.vault, undefined, { timeout: 20000 });
  const vault = await page.evaluate(() => app.vault.getName());
  const expectedVault = process.env.OBSIDIAN_TEST_VAULT ?? '.dev-vault';
  if (!['.dev-vault', '.release-vault'].includes(expectedVault) || vault !== expectedVault) throw new Error('Desktop verification only runs in the configured isolated test vault.');
  const trust = page.getByRole('button', { name: /^(Confiar en el autor y activar complementos|Trust author and enable plugins)$/ });
  if (await trust.isVisible()) await trust.click();
  await page.waitForFunction(() => app.plugins?.plugins['obsidian-superpowers']?.session?.chat, undefined, { timeout: 20000 });
  original = await page.evaluate(async () => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    if (['submitted', 'streaming'].includes(plugin.session.chat.status)) throw new Error('Wait for the active conversation before running desktop verification.');
    const saved = { settings: structuredClone(plugin.settings), messages: structuredClone(plugin.session.chat.messages) };
    // Fixtures get a separate credential namespace; never replace real API keys.
    plugin.settings.credentialNamespace = crypto.randomUUID();
    await plugin.saveSettings();
    return saved;
  });
  expect(await page.evaluate(() => app.vault.adapter.exists(`${app.vault.configDir}/plugins/obsidian-superpowers/assets`))).toBe(false);
  findings.push('Installation has no assets directory: compiler and API references are embedded in main.js.');
  await emulateMobile(false);
  await page.evaluate(async () => {
    app.setting.close();
    await app.plugins.disablePlugin('obsidian-superpowers');
    await app.plugins.enablePlugin('obsidian-superpowers');
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    await plugin.session.clear();
    await plugin.openChat();
  });
  await expect(page.getByRole('textbox', { name: 'Mensaje para Superpowers' })).toBeVisible();
  findings.push('Plugin loads and chat composer renders in desktop Obsidian.');

  for (const provider of ['openai', 'anthropic', 'google'] as const) {
    const replies: Reply[] = [
      { tools: [
        { tool: 'inspect_environment', input: {} },
        { tool: 'lookup_reference', input: { query: 'mobile-design' } },
        { tool: 'lookup_reference', input: { query: 'obsidian-data' } },
      ] },
      { tools: [
        { tool: 'write_file', input: { path: `Transport ${provider}.md`, content: 'First serialized write.' } },
        { tool: 'write_file', input: { path: `Transport ${provider}.md`, content: `# ${provider}\nWritten by a real Obsidian tool.` } },
      ] },
      { text: `Prueba de ${provider} completada: he creado la nota.` },
    ];
    const bodies = replies.map((reply) => provider === 'openai' ? openaiEvents(reply) : provider === 'anthropic' ? anthropicEvents(reply) : googleEvents(reply));
    await page.evaluate((bodies) => {
      const state = { original: globalThis.fetch, calls: 0, requests: [] as string[] };
      window.spFixture = state;
      globalThis.fetch = async (input, init) => {
        const request = new Request(input, init);
        if (!['api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com'].includes(new URL(request.url).hostname)) return state.original(input, init);
        state.requests.push(await request.text());
        const body = bodies[state.calls++];
        if (!body) throw new Error('Unexpected additional provider request.');
        return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
      };
    }, bodies);
    await page.evaluate(async (provider) => {
      const plugin = app.plugins.plugins['obsidian-superpowers']!;
      await plugin.session.clear();
      plugin.settings.provider = provider;
      plugin.credentials.set(provider, 'fixture-key-not-a-real-credential');
      plugin.refreshViews();
    }, provider);
    await page.getByRole('textbox', { name: 'Mensaje para Superpowers' }).fill(`Comprueba Obsidian y crea la nota de prueba de ${provider}.`);
    await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
    await expect(page.locator('.sp-assistant')).toContainText(`Prueba de ${provider} completada`, { timeout: 20000 });
    const captured = await page.evaluate(() => ({ calls: window.spFixture!.calls, requests: window.spFixture!.requests }));
    expect(captured.calls).toBe(3);
    expect(captured.requests[1]).toContain('Touch-first interface design');
    expect(captured.requests[1]).toContain('Notes as structured records');
    expect(captured.requests[1]).toContain('apiVersion');
    expect(captured.requests[2]).toContain(`Transport ${provider}.md`);
    const group = page.locator('.sp-assistant .sp-activity');
    await expect(group).toHaveCount(1);
    await expect(group.locator(':scope > summary')).toContainText('5 acciones');
    await expect(group).not.toHaveAttribute('open', '');
    await group.locator(':scope > summary').click();
    await expect(group.locator('.sp-tool')).toHaveCount(5);
    await expect(group.locator('.sp-tool').first().locator('summary')).toBeVisible();
    await group.locator(':scope > summary').click();
    expect(await page.evaluate((provider) => app.vault.adapter.read(`Transport ${provider}.md`), provider)).toContain('Written by a real Obsidian tool.');
    await page.evaluate(() => { globalThis.fetch = window.spFixture!.original; delete window.spFixture; });
    findings.push(`${provider}: multiple calls in one response → all results in continuation → serialized writes → one expandable activity group with five calls.`);
  }
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/desktop-chat.png' });

  const generatedManifest = { id: 'sp-chat-proof', name: 'Chat proof', version: '0.1.0', description: 'Chat integration fixture', author: 'Test', isDesktopOnly: false, minAppVersion: '1.8.0' };
  const repairReplies: Reply[] = [
    { tool: 'lookup_reference', input: { query: 'plugins' } },
    { tool: 'build_plugin', input: { manifest: generatedManifest, entry: 'main.ts', activate: true, files: [{ path: 'main.ts', content: 'import fs from "node:fs"; export default fs;' }] } },
    { tool: 'build_plugin', input: { manifest: generatedManifest, entry: 'main.ts', activate: true, files: [
      { path: 'main.ts', content: `import {Plugin} from 'obsidian'; import {text} from './text'; export default class Proof extends Plugin {onload(){this.addCommand({id:'proof',name:'Write chat proof',callback:async()=>{await this.app.vault.adapter.write('Chat proof.md',text)}})}}` },
      { path: 'text.ts', content: 'export const text = "Created through the chat tool loop";' },
    ] } },
    { tool: 'execute_obsidian', input: { code: "await app.commands.commands['sp-chat-proof:proof'].callback(); return { content: await app.vault.adapter.read('Chat proof.md') };" } },
    { text: 'He construido, activado y comprobado el plugin. El error de importación quedó corregido.' },
  ];
  await page.evaluate((bodies) => {
    const state = { original: globalThis.fetch, calls: 0, requests: [] as string[] }; window.spFixture = state;
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      if (new URL(request.url).hostname !== 'api.openai.com') return state.original(input, init);
      state.requests.push(await request.text());
      const body = bodies[state.calls++]; if (!body) throw new Error('Unexpected additional fixture request');
      return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
    };
  }, repairReplies.map(openaiEvents));
  await page.evaluate(async () => { const p = app.plugins.plugins['obsidian-superpowers']!; await p.session.clear(); p.settings.provider = 'openai'; p.refreshViews(); });
  await page.getByRole('textbox', { name: 'Mensaje para Superpowers' }).fill('Crea un plugin con un comando y comprueba que funciona.');
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
  await expect(page.locator('.sp-assistant')).toContainText('El error de importación quedó corregido', { timeout: 20000 });
  await expect(page.locator('.sp-activity > summary')).toContainText('1 incidencia');
  const repair = await page.evaluate(async () => ({ calls: window.spFixture!.calls, diagnosticsReceived: window.spFixture!.requests[2]?.includes('Unsupported import'), content: await app.vault.adapter.read('Chat proof.md') }));
  expect(repair.calls).toBe(5); expect(repair.diagnosticsReceived).toBe(true); expect(repair.content).toBe('Created through the chat tool loop');
  await page.evaluate(() => { globalThis.fetch = window.spFixture!.original; delete window.spFixture; });
  await page.screenshot({ path: 'artifacts/desktop-plugin-chat.png' });
  findings.push('Chat-driven build failure → diagnostic returned to provider → repaired source → real installation → command verification. Responses are scripted; this does not establish model reasoning quality.');

  // Test the actual WebView compiler and Obsidian's plugin loader, including independent lifecycle.
  const lifecycle = await page.evaluate(async () => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    const manifest = { id: 'sp-desktop-proof', name: 'Desktop proof', version: '0.1.0', description: 'Verification fixture', author: 'Test', isDesktopOnly: false as const, minAppVersion: '1.8.0' };
    const source = { manifest, entry: 'main.ts', files: {
      'main.ts': `import {Plugin} from 'obsidian'; import {content} from './content'; export default class Proof extends Plugin {onload(){this.addCommand({id:'write-proof',name:'Write proof',callback:async()=>{await this.app.vault.adapter.write('Desktop proof.md',content)}})}}`,
      'content.ts': 'export const content = "version one";',
    } };
    const built = await plugin.studio.buildPlugin(source, true);
    await app.commands.commands['sp-desktop-proof:write-proof']!.callback?.();
    const initial = await app.vault.adapter.read('Desktop proof.md');
    const brokenImport = await plugin.studio.buildPlugin({ ...source, files: { 'main.ts': 'import fs from "node:fs"; export default fs;' } }, true);
    const stillEnabled = app.plugins.enabledPlugins.has(manifest.id);
    const updated = await plugin.studio.buildPlugin({ ...source, manifest: { ...manifest, version: '0.2.0' }, files: { ...source.files, 'content.ts': 'export const content = "version two";' } }, true);
    let rollbackError = '';
    try { await plugin.studio.buildPlugin({ ...source, manifest: { ...manifest, version: '0.3.0' }, files: { 'main.ts': 'import {Plugin} from "obsidian"; export default class Broken extends Plugin {onload(){throw new Error("intentional lifecycle failure")}}' } }, true); }
    catch (error) { rollbackError = String(error); }
    await app.plugins.disablePlugin('obsidian-superpowers');
    await app.commands.commands['sp-desktop-proof:write-proof']!.callback?.();
    const independent = await app.vault.adapter.read('Desktop proof.md');
    await app.plugins.disablePlugin(manifest.id);
    const cleanedUp = !app.commands.commands['sp-desktop-proof:write-proof'];
    await app.plugins.enablePlugin('obsidian-superpowers');
    await app.plugins.plugins['obsidian-superpowers']!.openChat();
    return { built, initial, brokenImport, stillEnabled, updated, rollbackError, independent, cleanedUp };
  });
  expect(lifecycle.built.ok).toBe(true);
  expect(lifecycle.initial).toBe('version one');
  expect(lifecycle.brokenImport.ok).toBe(false);
  expect(lifecycle.stillEnabled).toBe(true);
  expect(lifecycle.updated.ok).toBe(true);
  expect(lifecycle.rollbackError).not.toBe('');
  expect(lifecycle.independent).toBe('version two');
  expect(lifecycle.cleanedUp).toBe(true);
  findings.push('Actual WASM compile, relative imports, installation, command execution, update, failed-onload rollback, independence from Superpowers, and unload cleanup.');

  // History survives actual plugin unloading/reloading, including terminal tool results.
  await expect(page.locator('.sp-assistant')).toContainText('El error de importación quedó corregido');
  findings.push('Conversation and tool results survive a real plugin reload.');

  await page.evaluate(async () => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    await plugin.session.clear();
    const state = { original: globalThis.fetch, calls: 0, requests: [] as string[] }; window.spFixture = state;
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      if (new URL(request.url).hostname !== 'api.openai.com') return state.original(input, init);
      state.calls++;
      return new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    };
  });
  await page.getByRole('textbox', { name: 'Mensaje para Superpowers' }).fill('Petición para probar la cancelación');
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Detener agente' })).toBeVisible();
  await page.getByRole('button', { name: 'Detener agente' }).click();
  await expect(page.getByRole('button', { name: 'Enviar mensaje', exact: true })).toBeVisible();
  await page.evaluate(() => { globalThis.fetch = window.spFixture!.original; delete window.spFixture; });
  findings.push('The stop button cancels a pending provider request and returns the composer to its usable state.');

  // Obsidian's mobile emulation disables Node imports in its actual plugin loader.
  await emulateMobile(true);
  await expect(page.getByRole('textbox', { name: 'Mensaje para Superpowers' })).toBeVisible();
  const mobile = await page.evaluate(async () => {
    const p = app.plugins.plugins['obsidian-superpowers']!;
    const project = await p.studio.readProject('sp-chat-proof');
    return { environment: await p.runtime.inspect(), build: await p.studio.buildPlugin(project, true) };
  });
  expect(mobile.build.ok).toBe(true);
  await page.screenshot({ path: 'artifacts/obsidian-mobile-emulation.png' });
  await emulateMobile(false);
  findings.push('Obsidian mobile emulation: chat loads and generated plugins compile/activate with Node imports disabled.');

  await page.evaluate(async () => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    for (const provider of ['openai', 'anthropic', 'google'] as const) plugin.credentials.set(provider, '');
    plugin.settings.provider = 'openai';
    await plugin.saveSettings();
    plugin.refreshViews();
  });
  await page.getByRole('textbox', { name: 'Mensaje para Superpowers' }).fill('Prueba sin credenciales');
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('API key', { timeout: 10000 });
  findings.push('Missing credentials produce a visible recoverable error.');
  expect(pageErrors.filter((error) => !error.includes('intentional lifecycle failure'))).toEqual([]);
  const report = { date: new Date().toISOString(), kind: 'Desktop integration with simulated provider responses (no live model inference)', findings, lifecycle, pageErrors };
  await import('node:fs/promises').then(({ writeFile }) => writeFile('artifacts/desktop-verification.json', JSON.stringify(report, null, 2)));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page.evaluate(() => { if (window.spFixture) { globalThis.fetch = window.spFixture.original; delete window.spFixture; } }).catch(() => undefined);
  if (original) await page.evaluate(async (saved) => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    await plugin.session.stop();
    plugin.settings = saved.settings;
    await plugin.saveSettings();
    plugin.session.chat.messages = saved.messages;
    await plugin.session.save();
    await app.plugins.disablePlugin('obsidian-superpowers');
    await app.plugins.enablePlugin('obsidian-superpowers');
    await app.plugins.plugins['obsidian-superpowers']!.openChat();
  }, original);
  await page.unrouteAll();
  await browser.close();
}
