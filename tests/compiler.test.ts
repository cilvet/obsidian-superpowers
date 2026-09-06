import { expect, test } from 'bun:test';
import { build } from 'esbuild';
import { virtualFiles } from '../src/adapters/compiler/virtual-files';

const compile = (files: Record<string, string>) => build({ entryPoints: ['main.ts'], plugins: [virtualFiles(files)], bundle: true, platform: 'browser', format: 'cjs', write: false, logLevel: 'silent', logOverride: { 'unsupported-dynamic-import': 'error', 'unsupported-require-call': 'error' } });

test('bundles local modules while preserving the Obsidian host import', async () => {
  const result = await compile({ 'main.ts': "import {Plugin} from 'obsidian'; import {label} from './lib'; export default class X extends Plugin { label=label; }", 'lib/index.ts': 'export const label = "bundled";' });
  const code = result.outputFiles[0]?.text;
  expect(code).toContain('require("obsidian")'); expect(code).toContain('bundled'); expect(code).not.toContain('require("./lib")');
});
test.each(['node:fs', 'fs', 'react', 'https://esm.sh/react'])('rejects unavailable imports: %s', async (name) => {
  await expect(compile({ 'main.ts': `import thing from '${name}'; console.log(thing);` })).rejects.toThrow('Unsupported import');
});
test('reports unresolved relative source paths', async () => {
  await expect(compile({ 'main.ts': 'import "./missing";' })).rejects.toThrow('Cannot resolve');
});
test.each(['require(name)', 'import(name)'])('rejects unresolved computed module loading: %s', async (expression) => {
  await expect(compile({ 'main.ts': `const name = globalThis.moduleName; ${expression};` })).rejects.toThrow('argument is not a string literal');
});
