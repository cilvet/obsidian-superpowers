import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openaiEvents } from './support/protocol-fixtures.ts';
import type Superpowers from '../src/main';
import type { App } from 'obsidian';

declare const app: App & { plugins: { plugins: Record<string, Superpowers>; disablePlugin(id: string): Promise<void>; enablePlugin(id: string): Promise<void> } };
declare global {
  interface Window { spUiFixture?: { original: typeof fetch; resume?: () => void; phase: number } }
}
const browser = await chromium.connectOverCDP('http://127.0.0.1:9238');
const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().startsWith('app://obsidian.md'));
if (!page) throw new Error('Run verify:release first.');
const original = await page.evaluate(async () => {
  if (app.vault.getName() !== '.release-vault') throw new Error('UI checks only run in .release-vault.');
  const p = app.plugins.plugins['obsidian-superpowers']!;
  if (['submitted', 'streaming'].includes(p.session.chat.status)) throw new Error('Wait for the current conversation.');
  const saved = { settings: structuredClone(p.settings), messages: structuredClone(p.session.chat.messages), dark: document.body.classList.contains('theme-dark') };
  p.settings.credentialNamespace = crypto.randomUUID(); p.settings.provider = 'openai'; await p.saveSettings();
  for (const leaf of app.workspace.getLeavesOfType('superpowers-chat')) leaf.detach();
  await app.plugins.disablePlugin('obsidian-superpowers'); await app.plugins.enablePlugin('obsidian-superpowers');
  const fresh = app.plugins.plugins['obsidian-superpowers']!;
  fresh.credentials.set('openai', 'fixture-key-not-a-real-credential'); await fresh.session.clear();
  const leaf = app.workspace.getLeaf('tab'); await leaf.setViewState({ type: 'superpowers-chat', active: true }); await app.workspace.revealLeaf(leaf);
  app.workspace.leftSplit.collapse(); app.workspace.rightSplit.collapse();
  return saved;
});
const oldViewport = page.viewportSize();
try {
  await mkdir('artifacts', { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.notice').filter({ hasText: 'El historial no tiene un formato válido' })).toHaveCount(0, { timeout: 10000 });
  const building = openaiEvents({ tool: 'build_plugin', input: { manifest: { id: 'sp-ui-proof', name: 'UI proof', version: '0.1.0', minAppVersion: '1.8.0', description: '', author: 'Test', isDesktopOnly: false }, entry: 'main.ts', activate: false, files: [{ path: 'main.ts', content: 'import invalid from "node:fs"; export default invalid;' }] } });
  const answer = openaiEvents({ text: 'No he aplicado cambios. Puedes seguir usando tus notas.' });
  await page.evaluate(({ building, answer }) => {
    const state = { original: globalThis.fetch, phase: 0, resume: undefined as (() => void) | undefined }; window.spUiFixture = state;
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      if (new URL(request.url).hostname !== 'api.openai.com') return state.original(input, init);
      const phase = state.phase++;
      if (phase === 0) return new Promise<Response>((resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        state.resume = () => {
          const boundary = building.indexOf('data: {"type":"response.function_call_arguments.done"');
          if (boundary < 0) throw new Error('Fixture event boundary missing');
          resolve(new Response(new ReadableStream({ start(controller) {
            controller.enqueue(new TextEncoder().encode(building.slice(0, boundary)));
            state.resume = () => { controller.enqueue(new TextEncoder().encode(building.slice(boundary))); controller.close(); };
          } }), { headers: { 'content-type': 'text/event-stream' } }));
        };
      });
      return new Response(answer, { headers: { 'content-type': 'text/event-stream' } });
    };
  }, { building, answer });
  await page.getByRole('textbox', { name: 'Mensaje para Superpowers' }).fill('Prepara una función para organizar mis notas.');
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
  await expect(page.locator('.sp-activity[data-running="true"]')).toHaveCount(1);
  await expect(page.locator('.sp-activity-label')).toHaveText('Pensando');
  await page.waitForFunction(() => !!window.spUiFixture?.resume);
  await page.evaluate(() => window.spUiFixture!.resume!());
  await expect(page.locator('.sp-activity-label')).toContainText('Preparando plugin');
  await expect(page.locator('.sp-activity[data-running="true"]')).toHaveCount(1);
  expect(await page.locator('.sp-activity-label').evaluate((el) => getComputedStyle(el).animationName)).toBe('sp-shimmer');
  await page.screenshot({ path: 'artifacts/chat-mobile-working.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.sp-activity-label').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.spUiFixture!.resume!());
  await expect(page.locator('.sp-assistant')).toContainText('No he aplicado cambios', { timeout: 20000 });
  await expect(page.locator('.sp-activity-label')).toContainText('1 incidencia');
  await expect(page.locator('.sp-activity[data-running="true"]')).toHaveCount(0);
  const summary = page.locator('.sp-activity > summary');
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.sp-tool > summary')).toBeVisible();
  await page.locator('.sp-tool > summary').click();
  await expect(page.locator('.sp-tool pre')).toContainText('node:fs');
  await page.screenshot({ path: 'artifacts/chat-mobile-expanded.png' });
  await summary.focus(); await page.keyboard.press('Space');
  await expect(page.locator('.sp-activity')).not.toHaveAttribute('open', '');

  const layouts: unknown[] = [];
  for (const width of [320, 390, 900]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator('.sp-chat').evaluate((el) => {
      const controls = [...el.querySelectorAll<HTMLElement>('.sp-header button, .sp-composer button, .sp-activity > summary')].map((node) => ({ label: node.getAttribute('aria-label') ?? node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
      return { width: el.clientWidth, overflow: el.scrollWidth > el.clientWidth + 1, controls, icons: el.querySelectorAll('.sp-icon svg').length };
    });
    expect(metrics.overflow).toBe(false); expect(metrics.icons).toBeGreaterThan(5);
    if (width <= 390) for (const control of metrics.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
    layouts.push({ viewport: width, ...metrics });
  }
  await page.evaluate(() => { document.body.classList.remove('theme-light'); document.body.classList.add('theme-dark'); });
  await page.screenshot({ path: 'artifacts/chat-desktop-dark.png' });
  await writeFile('artifacts/chat-ui-verification.json', JSON.stringify({ singleLiveIndicator: true, changingLabel: true, reducedMotion: true, keyboardDisclosure: true, nestedErrorVisible: true, layouts }, null, 2));
  console.log('Chat UI: single live indicator, changing label, disclosure, error details, reduced motion, SVG icons and 320/390/900px layouts passed.');
} finally {
  await page.evaluate(async (saved) => {
    if (window.spUiFixture) { globalThis.fetch = window.spUiFixture.original; delete window.spUiFixture; }
    const p = app.plugins.plugins['obsidian-superpowers']!; await p.session.stop(); p.credentials.set('openai', '');
    p.settings = saved.settings; await p.saveSettings(); p.session.chat.messages = saved.messages; await p.session.save();
    document.body.classList.toggle('theme-dark', saved.dark); document.body.classList.toggle('theme-light', !saved.dark);
    await app.plugins.disablePlugin('obsidian-superpowers'); await app.plugins.enablePlugin('obsidian-superpowers');
    await app.plugins.plugins['obsidian-superpowers']!.openChat();
  }, original);
  if (oldViewport) await page.setViewportSize(oldViewport);
  await page.emulateMedia({ reducedMotion: null });
  await browser.close();
}
