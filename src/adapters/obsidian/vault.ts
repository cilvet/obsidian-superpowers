import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { VaultPort } from '../../application/ports';
import { vaultPath } from '../../domain/project';

export class ObsidianVault implements VaultPort {
  constructor(private readonly app: App) {}

  read(path: string) { return this.app.vault.adapter.read(vaultPath(path)); }
  exists(path: string) { return this.app.vault.adapter.exists(vaultPath(path)); }
  list(path: string) { return this.app.vault.adapter.list(vaultPath(path)); }

  async write(path: string, content: string) {
    const clean = vaultPath(path);
    if (!clean) throw new Error('A file path is required.');
    const parts = clean.split('/').slice(0, -1);
    let folder = '';
    for (const part of parts) {
      folder = folder ? `${folder}/${part}` : part;
      if (!(await this.exists(folder))) await this.app.vault.adapter.mkdir(folder);
    }
    const file = this.app.vault.getAbstractFileByPath(clean);
    if (file instanceof TFile) await this.app.vault.modify(file, content);
    else if (await this.exists(clean)) await this.app.vault.adapter.write(clean, content);
    else if (clean.split('/').some((part) => part.startsWith('.'))) await this.app.vault.adapter.write(clean, content);
    else await this.app.vault.create(clean, content);
  }

  async remove(path: string) {
    const clean = vaultPath(path);
    const file = this.app.vault.getAbstractFileByPath(clean);
    if (file instanceof TFile) await this.app.fileManager.trashFile(file);
    else await this.app.vault.adapter.remove(clean);
  }
}
