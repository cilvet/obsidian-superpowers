import type { Plugin, Loader } from 'esbuild-wasm';

const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '/index.ts', '/index.tsx', '/index.js'];
export const hostModules = ['obsidian', '@codemirror/state', '@codemirror/view', '@codemirror/language', '@codemirror/commands', '@codemirror/search', '@codemirror/autocomplete', '@codemirror/lint', '@lezer/common', '@lezer/highlight'] as const;

function resolvePath(importer: string, request: string): string {
  const parts = request.startsWith('/') ? [] : importer.split('/').slice(0, -1);
  for (const part of request.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new Error(`Import escapes source root: ${request}`);
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/');
}

export function virtualFiles(files: Record<string, string>): Plugin {
  return {
    name: 'superpowers-sources',
    setup(build) {
      build.onResolve({ filter: /.*/ }, ({ path, importer, kind }) => {
        if (hostModules.some((name) => name === path)) return { path, external: true };
        if (kind !== 'entry-point' && !path.startsWith('.') && !path.startsWith('/')) {
          return { errors: [{ text: `Unsupported import "${path}". Use Obsidian/Web APIs or include the dependency source as local files. Available host imports: ${hostModules.join(', ')}.` }] };
        }
        try {
          const base = resolvePath(importer, path);
          const match = extensions.map((ext) => base + ext).find((candidate) => files[candidate] !== undefined);
          return match ? { path: match, namespace: 'source' } : { errors: [{ text: `Cannot resolve "${path}" from "${importer || 'entry'}". Available files: ${Object.keys(files).join(', ')}` }] };
        } catch (error) {
          return { errors: [{ text: String(error) }] };
        }
      });
      build.onLoad({ filter: /.*/, namespace: 'source' }, ({ path }) => {
        const extension = path.split('.').at(-1);
        const loader: Loader = extension === 'ts' || extension === 'tsx' || extension === 'jsx' || extension === 'json' || extension === 'css' ? extension : 'js';
        return { contents: files[path], loader };
      });
    },
  };
}
