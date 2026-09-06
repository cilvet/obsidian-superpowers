import * as esbuild from 'esbuild-wasm';
import type { CompilerPort } from '../../application/ports';
import type { BuildResult, PluginProject } from '../../domain/project';
import { virtualFiles } from './virtual-files';

let initialization: Promise<void> | undefined;

export class WasmCompiler implements CompilerPort {
  constructor(private readonly loadWasm: () => Promise<ArrayBuffer>) {}

  private async ready() {
    initialization ??= (async () => {
      const wasmModule = await WebAssembly.compile(await this.loadWasm());
      await esbuild.initialize({ wasmModule, worker: false });
    })().catch((error: unknown) => { initialization = undefined; throw error; });
    return initialization;
  }

  async build(project: PluginProject): Promise<BuildResult> {
    try {
      await this.ready();
      const result = await esbuild.build({
        entryPoints: [project.entry],
        bundle: true,
        write: false,
        format: 'cjs',
        platform: 'browser',
        target: ['es2022', 'safari16.4'],
        outdir: '/output',
        metafile: true,
        logLevel: 'silent',
        logOverride: { 'unsupported-dynamic-import': 'error', 'unsupported-require-call': 'error' },
        plugins: [virtualFiles(project.files)],
      });
      const js = result.outputFiles.find((file) => file.path.endsWith('.js'))?.text;
      if (!js) throw new Error('Compilation produced no JavaScript entry.');
      return {
        ok: true,
        bundle: { js, css: result.outputFiles.filter((file) => file.path.endsWith('.css')).map((file) => file.text).join('\n') + (result.metafile.inputs['source:styles.css'] ? '' : project.files['styles.css'] ?? '') },
        warnings: result.warnings.map((warning) => warning.text),
      };
    } catch (error) {
      return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  async script(code: string) {
    await this.ready();
    const result = await esbuild.build({
      stdin: { contents: `export default async function(app, obsidian, component, signal, console) {\n${code}\n}`, loader: 'ts' },
      bundle: true, write: false, format: 'iife', globalName: '__sp_action', platform: 'browser',
      target: ['es2022', 'safari16.4'], logLevel: 'silent',
      logOverride: { 'unsupported-dynamic-import': 'error', 'unsupported-require-call': 'error' },
      plugins: [{ name: 'action-context', setup(build) {
        build.onResolve({ filter: /.*/ }, ({ path }) => ({ errors: [{ text: `execute_obsidian cannot import "${path}". app and obsidian are already provided. Use build_plugin for source modules.` }] }));
      } }],
    });
    return `(function(){${result.outputFiles[0]?.text ?? ''}\nreturn __sp_action.default;})()`;
  }
}
