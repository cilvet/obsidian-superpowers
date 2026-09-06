import { z } from 'zod';

export const manifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  minAppVersion: z.string().default('1.8.0'),
  description: z.string(),
  author: z.string().default('You'),
  isDesktopOnly: z.literal(false).default(false),
});

export const projectSchema = z.object({
  manifest: manifestSchema,
  files: z.record(z.string(), z.string()),
  entry: z.string().default('main.ts'),
});

export type PluginProject = z.infer<typeof projectSchema>;
export type PluginManifest = z.infer<typeof manifestSchema>;
export type Bundle = { js: string; css: string };
export type BuildResult =
  | { ok: true; bundle: Bundle; warnings: string[] }
  | { ok: false; errors: string[] };

/** Vault-relative paths only, independent of a desktop filesystem. */
export function vaultPath(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || normalized.includes('\0')) {
    throw new Error('Use a vault-relative path, without a drive or leading slash.');
  }
  const parts: string[] = [];
  for (const segment of normalized.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') throw new Error('Parent traversal (..) is not a vault-relative path.');
    parts.push(segment);
  }
  return parts.join('/');
}

export function validateProject(input: unknown): PluginProject {
  const project = projectSchema.parse(input);
  if (project.manifest.id === 'obsidian-superpowers') {
    throw new Error('Choose a distinct ID for the generated plugin.');
  }
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(project.files)) {
    const clean = vaultPath(path);
    if (!clean || clean !== path) throw new Error(`Non-canonical source path: ${path}`);
    files[clean] = content;
  }
  if (files[project.entry] === undefined) throw new Error(`Missing entry file: ${project.entry}`);
  return { ...project, files };
}
