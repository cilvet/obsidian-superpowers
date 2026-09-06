import { copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.dev-vault');
await mkdir(`${root}/.obsidian/plugins/obsidian-superpowers`, { recursive: true });
const plugin = `${root}/.obsidian/plugins/obsidian-superpowers`;
// Remove only legacy build assets; preserve the test plugin's settings and history.
await rm(`${plugin}/assets`, { recursive: true, force: true });
for (const file of ['main.js', 'manifest.json', 'styles.css']) await copyFile(`dist/${file}`, `${plugin}/${file}`);
await Bun.write(`${root}/.obsidian/community-plugins.json`, JSON.stringify(['obsidian-superpowers']));
if (!(await Bun.file(`${root}/Welcome.md`).exists())) await Bun.write(`${root}/Welcome.md`, '# Superpowers · Test vault\n\nAn isolated vault for development and behavioral evaluations.\n');
console.log(root);
