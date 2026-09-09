import type { VaultPort } from './ports';

/** Copy beta data on first installation under the community ID, preserving both copies. */
export async function migrateLegacyInstallation(vault: VaultPort, configDir: string, destination: string) {
  const source = `${configDir}/plugins/obsidian-superpowers`;
  if (source === destination || await vault.exists(`${destination}/data.json`) || !await vault.exists(`${source}/data.json`)) return;

  async function copyFile(path: string) {
    if (!(await vault.exists(`${destination}/${path}`))) {
      await vault.write(`${destination}/${path}`, await vault.read(`${source}/${path}`));
    }
  }

  async function copyFolder(path: string) {
    const { files, folders } = await vault.list(`${source}/${path}`);
    for (const file of files) await copyFile(file.slice(source.length + 1));
    for (const folder of folders) await copyFolder(folder.slice(source.length + 1));
  }

  if (await vault.exists(`${source}/history.json`)) await copyFile('history.json');
  if (await vault.exists(`${source}/projects`)) await copyFolder('projects');
  // Settings retain the credential namespace. Copy last so interrupted migrations can resume.
  await copyFile('data.json');
}
