import { build, context } from 'esbuild';
import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { hostModules } from '../src/adapters/compiler/virtual-files';

await mkdir('dist/assets', { recursive: true });
await Promise.all([
  copyFile('manifest.json', 'dist/manifest.json'),
  copyFile('src/ui/styles.css', 'dist/styles.css'),
  copyFile('node_modules/esbuild-wasm/esbuild.wasm', 'dist/assets/esbuild.wasm'),
  copyFile('node_modules/obsidian/obsidian.d.ts', 'dist/assets/obsidian.d.ts'),
  copyFile('node_modules/obsidian/LICENSE.md', 'dist/assets/OBSIDIAN-LICENSE.md'),
  copyFile('context/system.md', 'dist/assets/system.md'),
]);
await Bun.write('dist/assets/guides.md', `${await Bun.file('context/plugins.md').text()}\n\n${await Bun.file('context/obsidian.md').text()}`);
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
  legalComments: 'linked' as const,
};
if (process.argv.includes('--watch')) {
  const watcher = await context(options);
  await watcher.watch();
  console.log('Watching source. Run bun run dev:vault to sync the isolated test vault.');
} else {
  const result = await build(options);
  await Bun.write('dist/meta.json', JSON.stringify(result.metafile));
  const packages = new Set(Object.keys(result.metafile.inputs).flatMap((path) => {
    const match = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    return match?.[1] ? [match[1]] : [];
  }));
  const notices: string[] = [];
  for (const name of [...packages].sort()) {
    const root = `node_modules/${name}`;
    const metadata = JSON.parse(await readFile(`${root}/package.json`, 'utf8')) as { version: string; license?: string };
    let license = '';
    for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md']) {
      try { license = await readFile(`${root}/${filename}`, 'utf8'); break; } catch { /* Different packages use different license filenames. */ }
    }
    notices.push(`## ${name} ${metadata.version}\nLicense: ${metadata.license ?? 'See package metadata'}\n\n${license}`);
  }
  await Bun.write('dist/THIRD-PARTY-NOTICES.md', notices.join('\n\n---\n\n'));
  console.log('Plugin built in dist/ (including mobile WASM and API references).');
}
