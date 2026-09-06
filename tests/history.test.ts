import { expect, test } from 'bun:test';
import { loadHistory } from '../src/adapters/ai/session';
import { MemoryVault } from './support/memory';

test('interrupted tools are restored as errors, without rerunning mutations', async () => {
  const vault = new MemoryVault();
  await vault.write('history', JSON.stringify([
    { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Create a note' }] },
    { id: 'assistant-1', role: 'assistant', parts: [{ type: 'tool-write_file', toolCallId: 'call-1', state: 'input-available', input: { path: 'Note.md', content: 'Hello' } }] },
  ]));
  const restored = await loadHistory(vault, 'history');
  expect(restored[1]?.parts[0]).toMatchObject({ state: 'output-error', toolCallId: 'call-1' });
  expect(await vault.exists('Note.md')).toBe(false);
});

test('preserves malformed history and reports a recoverable error', async () => {
  const vault = new MemoryVault();
  await vault.write('history', '[{"not":"a message"}]');
  await expect(loadHistory(vault, 'history')).rejects.toThrow('historial');
  expect(await vault.read('history')).toBe('[{"not":"a message"}]');
});
