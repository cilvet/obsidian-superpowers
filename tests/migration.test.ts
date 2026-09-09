import { expect, test } from 'bun:test';
import { migrateLegacyInstallation } from '../src/application/migrate-legacy-installation';
import { MemoryVault } from './support/memory';

const source = 'custom-config/plugins/obsidian-superpowers';
const destination = 'custom-config/plugins/superpowers';

class MigrationVault extends MemoryVault {
  override async exists(path: string) {
    return this.files.has(path) || [...this.files.keys()].some((file) => file.startsWith(`${path}/`));
  }
  override async list(path: string) {
    const files: string[] = [];
    const folders = new Set<string>();
    for (const file of this.files.keys()) {
      if (!file.startsWith(`${path}/`)) continue;
      const remainder = file.slice(path.length + 1);
      if (remainder.includes('/')) folders.add(`${path}/${remainder.split('/')[0]}`);
      else files.push(file);
    }
    return { files, folders: [...folders] };
  }
}

test('moves beta settings, history and nested sources without deleting originals or replacing newer files', async () => {
  const vault = new MigrationVault();
  await vault.write(`${source}/data.json`, '{"credentialNamespace":"existing-device-keys"}');
  await vault.write(`${source}/history.json`, '["old conversation"]');
  await vault.write(`${source}/projects/gym/project.json`, '{"saved":"source"}');
  await vault.write(`${source}/projects/gym/previous.json`, '{"saved":"rollback"}');
  await vault.write(`${source}/main.js`, 'old executable');
  await vault.write(`${destination}/history.json`, '["newer conversation"]');
  await migrateLegacyInstallation(vault, 'custom-config', destination);
  expect(await vault.read(`${destination}/data.json`)).toContain('existing-device-keys');
  expect(await vault.read(`${destination}/history.json`)).toBe('["newer conversation"]');
  expect(await vault.read(`${destination}/projects/gym/project.json`)).toBe('{"saved":"source"}');
  expect(await vault.read(`${destination}/projects/gym/previous.json`)).toBe('{"saved":"rollback"}');
  expect(await vault.exists(`${destination}/main.js`)).toBe(false);
  expect(await vault.read(`${source}/history.json`)).toBe('["old conversation"]');
  await vault.remove(`${destination}/history.json`);
  await migrateLegacyInstallation(vault, 'custom-config', destination);
  expect(await vault.exists(`${destination}/history.json`)).toBe(false);
});

test('a failed migration can resume before settings mark it complete', async () => {
  class InterruptedVault extends MigrationVault {
    fail = true;
    override async write(path: string, content: string) {
      if (path === `${destination}/projects/gym/project.json` && this.fail) throw new Error('Interrupted');
      await super.write(path, content);
    }
  }
  const vault = new InterruptedVault();
  await vault.write(`${source}/data.json`, '{}');
  await vault.write(`${source}/projects/gym/project.json`, 'source');
  await expect(migrateLegacyInstallation(vault, 'custom-config', destination)).rejects.toThrow('Interrupted');
  expect(await vault.exists(`${destination}/data.json`)).toBe(false);
  vault.fail = false;
  await migrateLegacyInstallation(vault, 'custom-config', destination);
  expect(await vault.read(`${destination}/projects/gym/project.json`)).toBe('source');
  expect(await vault.exists(`${destination}/data.json`)).toBe(true);
});
