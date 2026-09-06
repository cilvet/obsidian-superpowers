import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Separate from the development vault, which may contain an active user conversation.
if (process.platform !== 'darwin') throw new Error('This release integration test needs macOS and Obsidian.');
const root = resolve('.release-vault');
const profile = resolve('.release-profile');
const plugin = `${root}/.obsidian/plugins/obsidian-superpowers`;
const source = resolve(process.env.OBSIDIAN_RELEASE_DIR ?? 'dist');
const files = ['main.js', 'manifest.json', 'styles.css'];
await mkdir(plugin, { recursive: true });
await mkdir(profile, { recursive: true });
for (const file of files) await copyFile(`${source}/${file}`, `${plugin}/${file}`);
if ((await readdir(plugin)).includes('assets')) throw new Error('Release test installation must not have an assets directory.');
await Bun.write(`${root}/.obsidian/community-plugins.json`, JSON.stringify(['obsidian-superpowers']));
await Bun.write(`${root}/Welcome.md`, '# Superpowers release verification\n\nIsolated vault for testing the three-file release.\n');
await Bun.write(`${profile}/obsidian.json`, JSON.stringify({ vaults: { superpowersrelease: { path: root, ts: Date.now(), open: true } }, updateDisabled: true }));
const endpoint = 'http://127.0.0.1:9238';
const alreadyRunning = await fetch(`${endpoint}/json/version`).then((response) => response.ok).catch(() => false);
if (!alreadyRunning) {
  const child = Bun.spawn(['/Applications/Obsidian.app/Contents/MacOS/Obsidian', `--user-data-dir=${profile}`, '--remote-debugging-port=9238'], { stdout: 'ignore', stderr: 'ignore' });
  child.unref();
}
const deadline = Date.now() + 20000;
while (!(await fetch(`${endpoint}/json/version`).then((response) => response.ok).catch(() => false))) {
  if (Date.now() >= deadline) throw new Error('Obsidian release test profile did not start.');
  await Bun.sleep(250);
}
for (const script of ['scripts/verify-desktop.ts', 'scripts/verify-chat-ui.ts']) {
  const test = Bun.spawn(['node', '--experimental-strip-types', script], {
    env: { ...process.env, OBSIDIAN_CDP: endpoint, OBSIDIAN_TEST_VAULT: '.release-vault' },
    stdout: 'inherit', stderr: 'inherit',
  });
  const code = await test.exited;
  if (code) process.exit(code);
}
