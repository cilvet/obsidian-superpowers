import { build, context } from 'esbuild';
import type { Plugin } from 'esbuild';
import { mkdir, copyFile, readFile, rm, appendFile } from 'node:fs/promises';
import { hostModules } from '../src/adapters/compiler/virtual-files';
import { bundledAssets } from './support/bundled-assets';

// dist is generated output; start clean so old assets cannot hide packaging errors.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await Promise.all([
  copyFile('manifest.json', 'dist/manifest.json'),
  copyFile('src/ui/styles.css', 'dist/styles.css'),
]);
const licenses: Plugin = {
  name: 'bundled-license-notices',
  setup(builder) {
    builder.onEnd(async (result) => {
      if (result.errors.length || !result.metafile) return;
      await Bun.write('dist/meta.json', JSON.stringify(result.metafile));
      const packages = new Set(['obsidian', 'esbuild-wasm', ...Object.keys(result.metafile.inputs).flatMap((path) => {
        const match = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
        return match?.[1] ? [match[1]] : [];
      })]);
      const notices: string[] = [await readFile('LICENSE', 'utf8'), await readFile('scripts/licenses/Apache-2.0.txt', 'utf8')];
      const fallbacks: Record<string, string> = { '@ai-sdk/provider-utils': 'ai-sdk.txt', 'react-remove-scroll-bar': 'react-remove-scroll-bar.txt', 'use-composed-ref': 'use-composed-ref.txt' };
      for (const name of [...packages].sort()) {
        const root = `node_modules/${name}`;
        const metadata = JSON.parse(await readFile(`${root}/package.json`, 'utf8')) as { version: string; license?: string };
        let license = '';
        for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md']) {
          try { license = await readFile(`${root}/${filename}`, 'utf8'); break; } catch { /* Package license filenames vary. */ }
        }
        if (!license && fallbacks[name]) license = await readFile(`scripts/licenses/${fallbacks[name]}`, 'utf8');
        if (!license) throw new Error(`Missing license text for bundled dependency ${name}`);
        notices.push(`## ${name} ${metadata.version}\nLicense: ${metadata.license ?? 'See package metadata'}\n\n${license}`);
      }
      const text = notices.join('\n\n---\n\n');
      await Bun.write('dist/THIRD-PARTY-NOTICES.md', text);
      // BRAT installs three files only: required attribution must travel inside main.js.
      await appendFile('dist/main.js', `\n/*! Third-party notices\n${text.replaceAll('*/', '* /')}\n*/\n`);
    });
  },
};
const options = {
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'cjs' as const,
  platform: 'browser' as const,
  target: ['es2022', 'safari16.4'],
  conditions: ['browser'],
  external: [...hostModules],
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
  minify: true,
  sourcemap: 'external' as const,
  legalComments: 'inline' as const,
  plugins: [bundledAssets, licenses],
};
if (process.argv.includes('--watch')) {
  const watcher = await context(options);
  await watcher.watch();
  console.log('Watching source. Run bun run dev:vault to sync the isolated test vault.');
} else {
  await build(options);
  console.log('Plugin built in dist/: main.js, manifest.json and styles.css are sufficient for installation.');
}
