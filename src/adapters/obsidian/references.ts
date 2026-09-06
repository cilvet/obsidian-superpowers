import type { ReferencePort, VaultPort } from '../../application/ports';

export class LocalReferences implements ReferencePort {
  private docs?: Promise<{ system: string; guides: string; declarations: string }>;
  constructor(private readonly vault: VaultPort, private readonly assetRoot: string) {}

  private load() {
    this.docs ??= Promise.all([
      this.vault.read(`${this.assetRoot}/system.md`),
      this.vault.read(`${this.assetRoot}/guides.md`),
      this.vault.read(`${this.assetRoot}/obsidian.d.ts`),
    ]).then(([system, guides, declarations]) => ({ system, guides, declarations }));
    return this.docs;
  }

  async instructions() {
    const { system } = await this.load();
    const user = await this.vault.exists('SUPERPOWERS.md') ? await this.vault.read('SUPERPOWERS.md') : '';
    return user ? `${system}\n\n## User vault conventions (SUPERPOWERS.md)\n${user.slice(0, 16000)}` : system;
  }

  async lookup(query: string) {
    const { guides, declarations } = await this.load();
    if (/^(plugins?|obsidian|mobile|bases|imports?|guide)$/i.test(query.trim())) return guides;
    const lines = declarations.split('\n');
    const needle = query.toLowerCase().trim();
    if (!needle) return 'Provide a class or method name, or "plugins", "mobile", "bases".';
    const hits: string[] = [];
    for (let index = 0; index < lines.length && hits.length < 8; index++) {
      if (lines[index]?.toLowerCase().includes(needle)) {
        hits.push(lines.slice(Math.max(0, index - 10), index + 35).map((line, offset) => `${Math.max(0, index - 10) + offset + 1}: ${line}`).join('\n'));
        index += 15;
      }
    }
    return hits.length ? hits.join('\n---\n').slice(0, 18000) : `No declaration matching "${query}". Search the class/method separately; do not assume the API exists.`;
  }
}
