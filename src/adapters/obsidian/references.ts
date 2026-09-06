import type { ReferencePort, VaultPort } from '../../application/ports';

export type RuntimeSkill = Readonly<{ id: string; title: string; when: string; aliases: readonly string[]; content: string }>;
export type ReferenceDocuments = Readonly<{ system: string; guides: string; declarations: string; skills: readonly RuntimeSkill[] }>;

export class LocalReferences implements ReferencePort {
  constructor(private readonly vault: VaultPort, private readonly docs: ReferenceDocuments) {}

  private catalog() {
    return this.docs.skills.map((skill) => `- ${skill.id}: ${skill.title}. Read when: ${skill.when}`).join('\n');
  }

  async instructions() {
    const { system } = this.docs;
    const user = await this.vault.exists('SUPERPOWERS.md') ? await this.vault.read('SUPERPOWERS.md') : '';
    const instructions = `${system}\n\n## Available runtime skills\nLoad with lookup_reference(query: skill ID).\n${this.catalog()}`;
    return user ? `${instructions}\n\n## User vault conventions (SUPERPOWERS.md)\n${user.slice(0, 16000)}` : instructions;
  }

  async lookup(query: string) {
    const { guides, declarations } = this.docs;
    const normalized = query.trim().toLowerCase().replace(/^skill:/, '').trim();
    if (normalized === 'skills') return this.catalog();
    const skill = this.docs.skills.find((entry) => entry.id === normalized || entry.aliases.includes(normalized));
    if (skill) return skill.content;
    if (/^(plugins?|obsidian|imports?|guide)$/.test(normalized)) return guides;
    const lines = declarations.split('\n');
    const needle = query.toLowerCase().trim();
    if (!needle) return 'Provide a class/method name, "skills" for the catalog, a skill ID, or "plugins".';
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
