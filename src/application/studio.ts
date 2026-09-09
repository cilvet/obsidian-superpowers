import { validateProject, vaultPath } from '../domain/project';
import type { CompilerPort, PluginHostPort, VaultPort } from './ports';

/** Serializes mutations even if a model requests several tools in one step. */
export class MutationQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const next = this.tail.then(() => {
      signal?.throwIfAborted();
      return operation();
    });
    this.tail = next.catch(() => undefined);
    return next;
  }
}

export class Studio {
  readonly mutations = new MutationQueue();

  constructor(
    readonly vault: VaultPort,
    readonly compiler: CompilerPort,
    readonly host: PluginHostPort,
  ) {}

  get sourceRoot() {
    return `${this.host.configDir}/plugins/superpowers/projects`;
  }

  async readProject(id: string) {
    const path = `${this.sourceRoot}/${vaultPath(id)}/project.json`;
    return validateProject(JSON.parse(await this.vault.read(path)));
  }

  /** Compile first; preserve both editable sources and the previous installation. */
  async buildPlugin(input: unknown, activate: boolean, signal?: AbortSignal) {
    const project = validateProject(input);
    return this.mutations.run(async () => {
      const id = project.manifest.id;
      await this.vault.write(`${this.sourceRoot}/${id}/project.json`, JSON.stringify(project, null, 2));
      const result = await this.compiler.build(project);
      if (!result.ok) return result;
      if (!activate) return { ok: true as const, activated: false, warnings: result.warnings };
      signal?.throwIfAborted();

      const folder = `${this.host.configDir}/plugins/${id}`;
      const previous: Record<string, string | null> = {};
      for (const name of ['main.js', 'manifest.json', 'styles.css']) {
        const path = `${folder}/${name}`;
        previous[name] = await this.vault.exists(path) ? await this.vault.read(path) : null;
      }
      const enabled = this.host.isEnabled(id);
      await this.vault.write(`${this.sourceRoot}/${id}/previous.json`, JSON.stringify({ previous, enabled }));
      await this.host.deactivate(id);
      try {
        signal?.throwIfAborted();
        await this.vault.write(`${folder}/main.js`, result.bundle.js);
        await this.vault.write(`${folder}/manifest.json`, JSON.stringify(project.manifest, null, 2));
        await this.vault.write(`${folder}/styles.css`, result.bundle.css);
        signal?.throwIfAborted();
        await this.host.activate(project.manifest);
      } catch (error) {
        await this.host.deactivate(id);
        for (const [name, content] of Object.entries(previous)) {
          const path = `${folder}/${name}`;
          if (content !== null) await this.vault.write(path, content);
          else if (await this.vault.exists(path)) await this.vault.remove(path);
        }
        if (enabled && previous['manifest.json']) {
          const { manifestSchema } = await import('../domain/project');
          await this.host.activate(manifestSchema.parse(JSON.parse(previous['manifest.json'])));
        }
        throw error;
      }
      return { ok: true as const, activated: true, id, warnings: result.warnings, source: `${this.sourceRoot}/${id}/project.json` };
    }, signal);
  }
}
