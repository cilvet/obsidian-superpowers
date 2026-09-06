import type { BuildResult, PluginManifest, PluginProject } from '../domain/project';

export type HttpFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface VaultPort {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  list(path: string): Promise<{ files: string[]; folders: string[] }>;
}

export interface CompilerPort {
  build(project: PluginProject): Promise<BuildResult>;
  script(code: string): Promise<string>;
}

export interface PluginHostPort {
  configDir: string;
  isEnabled(id: string): boolean;
  deactivate(id: string): Promise<void>;
  activate(manifest: PluginManifest): Promise<void>;
}

export interface ObsidianRuntimePort {
  inspect(): Promise<unknown>;
  execute(code: string, signal?: AbortSignal): Promise<unknown>;
}

export interface ReferencePort {
  lookup(query: string): Promise<string>;
  instructions(): Promise<string>;
}
