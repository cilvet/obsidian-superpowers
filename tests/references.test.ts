import { expect, test } from 'bun:test';
import { LocalReferences } from '../src/adapters/obsidian/references';
import { MemoryVault } from './support/memory';

const docs = {
  system: 'Functional communication contract', guides: 'Build contract',
  declarations: '/** @since 1.2.0 */\nexport class Example { save(): Promise<void>; }',
  skills: [{ id: 'obsidian-data', title: 'Records', when: 'Persisting records', aliases: ['bases'], content: 'Detailed persistence instructions' }],
};

test('skill catalog is discoverable without injecting all skill content into every request', async () => {
  const refs = new LocalReferences(new MemoryVault(), docs);
  expect(await refs.instructions()).toContain('obsidian-data');
  expect(await refs.instructions()).not.toContain('Detailed persistence instructions');
  expect(await refs.lookup('skills')).toContain('Persisting records');
  expect(await refs.lookup('skill:obsidian-data')).toBe(docs.skills[0]!.content);
  expect(await refs.lookup('BASES')).toBe(docs.skills[0]!.content);
});

test('skill lookup preserves exact API declarations and user vault conventions', async () => {
  const vault = new MemoryVault();
  await vault.write('SUPERPOWERS.md', 'Use the Reading folder.');
  const refs = new LocalReferences(vault, docs);
  expect(await refs.instructions()).toContain('Use the Reading folder.');
  expect(await refs.lookup('Example')).toContain('@since 1.2.0');
  expect(await refs.lookup('plugins')).toBe(docs.guides);
  expect(await refs.lookup('does-not-exist')).toContain('No declaration matching');
});
