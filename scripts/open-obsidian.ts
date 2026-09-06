import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

if (process.platform !== 'darwin') throw new Error('This local launcher targets macOS. Open .dev-vault with Obsidian on other platforms.');
const root = resolve('.dev-vault');
const profile = resolve('.dev-profile');
await mkdir(profile, { recursive: true });
await Bun.write(`${profile}/obsidian.json`, JSON.stringify({ vaults: { superpowerstest: { path: root, ts: Date.now(), open: true } }, updateDisabled: true }));
const child = Bun.spawn(['/Applications/Obsidian.app/Contents/MacOS/Obsidian', `--user-data-dir=${profile}`, '--remote-debugging-port=9237'], { stdout: 'ignore', stderr: 'ignore' });
child.unref();
console.log(`Opened isolated Obsidian profile for ${root}. Desktop test endpoint: http://127.0.0.1:9237`);
