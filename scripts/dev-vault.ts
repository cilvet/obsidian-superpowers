import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.dev-vault');
await mkdir(`${root}/.obsidian/plugins/obsidian-superpowers`, { recursive: true });
await cp('dist', `${root}/.obsidian/plugins/obsidian-superpowers`, { recursive: true });
await Bun.write(`${root}/.obsidian/community-plugins.json`, JSON.stringify(['obsidian-superpowers']));
if (!(await Bun.file(`${root}/Welcome.md`).exists())) await Bun.write(`${root}/Welcome.md`, '# Superpowers · Test vault\n\nAn isolated vault for development and behavioral evaluations.\n');
console.log(root);
