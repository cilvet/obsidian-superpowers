import { afterEach, expect, mock, test } from 'bun:test';
import type { RequestUrlParam } from 'obsidian';

let nativeCalls: RequestUrlParam[] = [];
mock.module('obsidian', () => ({ requestUrl: async (options: RequestUrlParam) => {
  nativeCalls.push(options);
  return { status: 200, headers: { 'content-type': 'text/event-stream' }, arrayBuffer: new TextEncoder().encode('data: {"ok":true}\n\n').buffer };
} }));
const { obsidianFetch } = await import('../src/adapters/obsidian/network');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; nativeCalls = []; });

test('CORS failures use Obsidian native HTTP and preserve provider response bytes', async () => {
  globalThis.fetch = mock(async () => { throw new TypeError('Failed to fetch'); });
  const response = await obsidianFetch('https://provider.example/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"hello":true}' });
  expect(nativeCalls).toHaveLength(1);
  expect(nativeCalls[0]?.url).toBe('https://provider.example/messages');
  expect(new TextDecoder().decode(nativeCalls[0]?.body as ArrayBuffer)).toBe('{"hello":true}');
  expect(await response.text()).toBe('data: {"ok":true}\n\n');
});

test('HTTP failures are returned without silently submitting a second paid request', async () => {
  globalThis.fetch = mock(async () => new Response('Rate limit', { status: 429 }));
  expect((await obsidianFetch('https://provider.example/messages')).status).toBe(429);
  expect(nativeCalls).toHaveLength(0);
});

test('cancellation is not mistaken for a CORS failure', async () => {
  const abort = new AbortController();
  globalThis.fetch = mock(async () => { abort.abort(); throw new TypeError('Failed to fetch'); });
  await expect(obsidianFetch('https://provider.example/messages', { signal: abort.signal })).rejects.toThrow();
  expect(nativeCalls).toHaveLength(0);
});
