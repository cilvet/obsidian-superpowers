import type { Plugin } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import catalog from '../../context/skills/catalog.json' with { type: 'json' };

/** Embed the compiler and context in the files that Obsidian and BRAT install. */
export const bundledAssets: Plugin = {
  name: 'superpowers-bundled-assets',
  setup(build) {
    build.onResolve({ filter: /^superpowers:assets$/ }, () => ({ path: 'assets', namespace: 'superpowers' }));
    build.onLoad({ filter: /.*/, namespace: 'superpowers' }, async () => {
      const paths = ['context/system.md', 'context/plugins.md', 'context/obsidian.md', 'node_modules/obsidian/obsidian.d.ts', 'node_modules/esbuild-wasm/esbuild.wasm'].map((path) => resolve(path));
      const [system, plugins, obsidian, declarations, wasm] = await Promise.all(paths.map((path) => readFile(path)));
      if (!system || !plugins || !obsidian || !declarations || !wasm) throw new Error('Missing bundled asset.');
      const skillPaths = catalog.map((skill) => resolve(`context/skills/${skill.id}.md`));
      const skills = await Promise.all(catalog.map(async (skill, index) => ({ ...skill, content: await readFile(skillPaths[index]!, 'utf8') })));
      return {
        contents: `export const references = ${JSON.stringify({ system: system.toString(), guides: `${plugins}\n\n${obsidian}`, declarations: declarations.toString(), skills })};\nexport const compilerGzipBase64 = ${JSON.stringify(gzipSync(wasm, { level: 9 }).toString('base64'))};`,
        loader: 'js',
        watchFiles: [...paths, ...skillPaths],
      };
    });
  },
};
