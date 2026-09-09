import { describe, expect, test } from 'bun:test';
import { Studio, MutationQueue } from '../src/application/studio';
import { MemoryVault, MemoryHost, FakeCompiler, project } from './support/memory';

function fixture() {
  const vault = new MemoryVault(); const host = new MemoryHost(); const compiler = new FakeCompiler();
  return { vault, host, compiler, studio: new Studio(vault, compiler, host) };
}

describe('independent plugin lifecycle', () => {
  test('installs under the actual config directory, saves sources and activates', async () => {
    const { vault, host, studio } = fixture();
    const result = await studio.buildPlugin(project, true);
    expect(result.ok).toBe(true);
    expect(host.isEnabled('sample-plugin')).toBe(true);
    expect(await vault.read('custom-config/plugins/sample-plugin/main.js')).toBe('new-code');
    expect((await studio.readProject('sample-plugin')).files).toEqual(project.files);
  });
  test('invalid compilation leaves installed code and activation untouched', async () => {
    const { vault, host, compiler, studio } = fixture();
    await vault.write('custom-config/plugins/sample-plugin/main.js', 'working-code');
    host.enabled.add('sample-plugin');
    compiler.result = { ok: false, errors: ['Cannot resolve node:fs'] };
    expect(await studio.buildPlugin(project, true)).toEqual(compiler.result);
    expect(await vault.read('custom-config/plugins/sample-plugin/main.js')).toBe('working-code');
    expect(host.isEnabled('sample-plugin')).toBe(true);
    expect(host.activations).toHaveLength(0);
  });
  test('onload failure restores the prior bundle and enabled state', async () => {
    const { vault, host, studio } = fixture();
    await vault.write('custom-config/plugins/sample-plugin/main.js', 'working-code');
    await vault.write('custom-config/plugins/sample-plugin/manifest.json', JSON.stringify({ ...project.manifest, version: '0.0.1' }));
    host.enabled.add('sample-plugin'); host.failNext = true;
    await expect(studio.buildPlugin(project, true)).rejects.toThrow('onload failed');
    expect(await vault.read('custom-config/plugins/sample-plugin/main.js')).toBe('working-code');
    expect(host.activations).toEqual(['0.0.1']);
    expect(host.isEnabled('sample-plugin')).toBe(true);
  });
  test('does not mutate a cancelled queued request', async () => {
    const queue = new MutationQueue(); const controller = new AbortController();
    let mutated = false;
    const pending = queue.run(async () => { mutated = true; }, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow(); expect(mutated).toBe(false);
  });
  test('validation rejects escaping paths and overwriting the host plugin', async () => {
    const { studio } = fixture();
    await expect(studio.buildPlugin({ ...project, files: { '../main.ts': '' } }, true)).rejects.toThrow();
    await expect(studio.buildPlugin({ ...project, manifest: { ...project.manifest, id: 'obsidian-superpowers' } }, true)).rejects.toThrow();
    await expect(studio.buildPlugin({ ...project, manifest: { ...project.manifest, id: 'superpowers' } }, true)).rejects.toThrow();
  });
});
