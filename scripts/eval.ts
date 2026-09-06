import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { App } from 'obsidian';
import type Superpowers from '../src/main';
import type { ProviderId } from '../src/adapters/ai/settings';

declare const app: App & { plugins: { plugins: Record<string, Superpowers>; enabledPlugins: Set<string> } };

const provider = process.env.EVAL_PROVIDER ?? 'openai';
if (provider !== 'openai' && provider !== 'anthropic' && provider !== 'google') throw new Error('EVAL_PROVIDER must be openai, anthropic or google.');
const key = process.env.EVAL_API_KEY ?? process.env[provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'];
if (!key) throw new Error('Live model evaluation requires EVAL_API_KEY (or the selected provider API key) in the environment. No request was made.');
const maxSteps = Number(process.env.EVAL_MAX_STEPS ?? 12);
if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 40) throw new Error('EVAL_MAX_STEPS must be 1–40.');
const cases = {
  bases: {
    prompt: 'Crea Eval/Record.md con propiedades type: sp-eval y score: 7. Crea Eval/Records.base con una tabla que filtre las notas con esa propiedad type y muestre file.name y score. Comprueba los archivos creados y no instales plugins si no hacen falta.',
    files: ['Eval/Record.md', 'Eval/Records.base'], plugin: null,
  },
  plugin: {
    prompt: 'Construye e instala un plugin independiente, compatible con móvil, con ID sp-agent-eval y un comando write-proof que escriba Eval/proof.md con el texto "agent-proof". Organiza el código en al menos dos archivos TypeScript con un import relativo. Ejecuta el comando para comprobar su efecto real y corrige cualquier error. Usa las herramientas hasta que esté verificado.',
    files: ['Eval/proof.md'], plugin: 'sp-agent-eval',
  },
} as const;
const selected = process.env.EVAL_CASE ?? 'plugin';
if (selected !== 'bases' && selected !== 'plugin') throw new Error('EVAL_CASE must be bases or plugin.');
const scenario = cases[selected];
const browser = await chromium.connectOverCDP(process.env.OBSIDIAN_CDP ?? 'http://127.0.0.1:9237');
const page = browser.contexts()[0]?.pages().find((page) => page.url().startsWith('app://obsidian.md'));
if (!page) throw new Error('Start the isolated Obsidian test profile first.');
let restore: { provider: ProviderId; model: string; key: string; maxSteps: number } | undefined;
try {
  if (await page.evaluate(() => app.vault.getName()) !== '.dev-vault') throw new Error('Live evals only run in .dev-vault.');
  restore = await page.evaluate(async ({ provider, key, model, maxSteps, files }) => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    await plugin.session.clear();
    // Remove only this case's generated evidence, so stale files cannot produce a pass.
    for (const path of files) if (await app.vault.adapter.exists(path)) await app.vault.adapter.remove(path);
    const previous = { provider: plugin.settings.provider, model: plugin.settings.models[provider], key: plugin.credentials.get(provider), maxSteps: plugin.settings.maxSteps };
    plugin.settings.provider = provider;
    if (model) plugin.settings.models[provider] = model;
    plugin.settings.maxSteps = maxSteps;
    plugin.credentials.set(provider, key);
    await plugin.openChat(); plugin.refreshViews();
    return previous;
  }, { provider, key, model: process.env.EVAL_MODEL, maxSteps, files: [...scenario.files] });
  await page.getByRole('textbox', { name: 'Mensaje para Superpowers' }).fill(scenario.prompt);
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
  await page.waitForFunction(() => {
    const chat = app.plugins.plugins['obsidian-superpowers']!.session.chat;
    return chat.messages.length > 0 && (chat.status === 'ready' || chat.status === 'error');
  }, undefined, { timeout: 240000 });
  const evidence = await page.evaluate(async ({ files, id }) => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    const contents = Object.fromEntries(await Promise.all(files.map(async (path) => [path, await app.vault.adapter.exists(path) ? await app.vault.adapter.read(path) : null])));
    return { contents, enabled: id ? app.plugins.enabledPlugins.has(id) : null, messages: plugin.session.chat.messages, error: plugin.session.chat.error?.message };
  }, { files: [...scenario.files], id: scenario.plugin });
  const passed = !evidence.error && Object.values(evidence.contents).every((value) => value !== null) &&
    (selected === 'plugin' ? evidence.enabled === true && evidence.contents['Eval/proof.md']?.includes('agent-proof') : evidence.contents['Eval/Records.base']?.includes('type: table') && evidence.contents['Eval/Record.md']?.includes('score: 7'));
  await mkdir('artifacts/evals', { recursive: true });
  const path = `artifacts/evals/${Date.now()}-${provider}-${selected}.json`;
  await writeFile(path, JSON.stringify({ provider, scenario: selected, passed, maxSteps, evidence }, null, 2));
  console.log(JSON.stringify({ passed, provider, scenario: selected, evidence: path }));
  if (!passed) process.exitCode = 1;
} finally {
  if (restore) await page.evaluate(async ({ provider, previous }) => {
    const plugin = app.plugins.plugins['obsidian-superpowers']!;
    await plugin.session.stop();
    plugin.credentials.set(provider, previous.key);
    plugin.settings.models[provider] = previous.model;
    plugin.settings.provider = previous.provider;
    plugin.settings.maxSteps = previous.maxSteps;
    plugin.refreshViews();
  }, { provider, previous: restore });
  await browser.close();
}
