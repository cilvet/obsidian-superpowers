import { build } from 'esbuild';
import { chromium, webkit, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { hostModules } from '../src/adapters/compiler/virtual-files.ts';
import { bundledAssets } from './support/bundled-assets.ts';

// Build graph checks are about runtime imports, not string matches in source code.
const meta = JSON.parse(await readFile('dist/meta.json', 'utf8')) as { outputs: Record<string, { imports: Array<{ path: string; external: boolean }> }> };
for (const output of Object.values(meta.outputs)) {
  for (const dependency of output.imports) {
    if (dependency.external && !hostModules.some((name) => name === dependency.path)) throw new Error(`Unexpected runtime import: ${dependency.path}`);
  }
}

const probe = await build({
  stdin: {
    contents: `import {WasmCompiler} from './src/adapters/compiler/wasm-compiler';
      import {loadCompilerWasm, bundledReferences} from './src/adapters/bundled-assets';
      globalThis.compiler = new WasmCompiler(loadCompilerWasm);
      globalThis.bundledReferences = bundledReferences;`,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'browser', format: 'iife', write: false, plugins: [bundledAssets],
});
const bundle = probe.outputFiles[0]!.text;
const server = createServer((request, response) => {
  if (request.url === '/probe.js') { response.writeHead(200, { 'content-type': 'application/javascript' }); response.end(bundle); }
  else if (request.url === '/') { response.writeHead(200, { 'content-type': 'text/html' }); response.end('<!doctype html><meta name="viewport" content="width=device-width"><script src="/probe.js"></script>'); }
  else { response.writeHead(404); response.end(); }
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Test server could not bind.');
const findings: unknown[] = [];
try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
      await page.goto(`http://127.0.0.1:${address.port}`);
      // The compiler and context must remain usable without downloading assets.
      await page.context().setOffline(true);
      const references = await page.evaluate(() => (globalThis as typeof globalThis & { bundledReferences: { system: string; guides: string; declarations: string } }).bundledReferences);
      expect(references.system.length).toBeGreaterThan(500);
      expect(references.guides).toContain('Plugin');
      expect(references.declarations.includes('class Plugin extends Component')).toBe(true);
      const result = await page.evaluate(async () => {
        const compiler = (globalThis as typeof globalThis & { compiler: import('../src/adapters/compiler/wasm-compiler').WasmCompiler }).compiler;
        const project = { manifest: { id: 'mobile-probe', name: 'Probe', version: '0.1.0', description: '', author: '', isDesktopOnly: false as const, minAppVersion: '1.8.0' }, entry: 'main.ts', files: { 'main.ts': 'import {message} from "./message"; export default function(){return message}', 'message.ts': 'export const message: string = "WASM works without Node";' } };
        const success = await compiler.build(project);
        const rejected = await compiler.build({ ...project, files: { 'main.ts': 'import fs from "node:fs"; console.log(fs);' } });
        const script = await compiler.script('const n: number = 2; return n + 3;');
        let toolImportRejected = false;
        try { await compiler.script('return require("node:fs");'); } catch { toolImportRejected = true; }
        const value: unknown = await new Function(`return ${script}`)()();
        return { nodeAbsent: !('process' in globalThis) && !('require' in globalThis), success, rejected, value, toolImportRejected };
      });
      expect(result.nodeAbsent).toBe(true);
      expect(result.success.ok).toBe(true);
      expect(result.rejected.ok).toBe(false);
      expect(result.value).toBe(5);
      expect(result.toolImportRejected).toBe(true);
      findings.push({ engine: engine.name(), offlineBundledAssets: true, nodeAbsent: result.nodeAbsent, compilation: result.success.ok, unsupportedImportRejected: !result.rejected.ok, scriptResult: result.value, toolImportRejected: result.toolImportRejected });
    } finally { await browser.close(); }
  }
} finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/mobile-browser-verification.json', JSON.stringify({ findings, limitation: 'Browser/WebKit tests, not physical Obsidian iOS/Android validation.' }, null, 2));
console.log(JSON.stringify(findings, null, 2));
