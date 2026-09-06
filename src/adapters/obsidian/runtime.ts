import * as obsidian from 'obsidian';
import type { App, Plugin } from 'obsidian';
import type { CompilerPort, ObsidianRuntimePort } from '../../application/ports';

export function printable(value: unknown, limit = 16000): string {
  const visited = new WeakSet<object>();
  const text = JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === 'bigint') return String(item);
    if (item && typeof item === 'object') {
      if (visited.has(item)) return '[circular]';
      visited.add(item);
    }
    return item;
  }) ?? String(value);
  return text.length > limit ? `${text.slice(0, limit)}\n[truncated; return a smaller projection]` : text;
}

type Script = (app: App, api: typeof obsidian, component: obsidian.Component, signal: AbortSignal | undefined, logger: Pick<Console, 'log' | 'warn' | 'error'>) => Promise<unknown>;

export class ObsidianRuntime implements ObsidianRuntimePort {
  constructor(private readonly app: App, private readonly owner: Plugin, private readonly compiler: CompilerPort) {}

  async inspect() {
    return {
      apiVersion: obsidian.apiVersion,
      mobile: obsidian.Platform.isMobile,
      ios: obsidian.Platform.isIosApp,
      android: obsidian.Platform.isAndroidApp,
      desktop: obsidian.Platform.isDesktopApp,
      interface: {
        width: window.innerWidth, height: window.innerHeight,
        coarsePointer: window.matchMedia('(pointer: coarse)').matches,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        microphone: !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined',
        clipboard: !!navigator.clipboard,
      },
      configDir: this.app.vault.configDir,
      activeFile: this.app.workspace.getActiveFile()?.path ?? null,
      fileCount: this.app.vault.getFiles().length,
    };
  }

  async execute(code: string, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const compiled = await this.compiler.script(code);
    signal?.throwIfAborted();
    const callable: unknown = new Function(`"use strict"; return ${compiled}`)();
    if (typeof callable !== 'function') throw new Error('Script compilation did not produce a function.');
    const run = callable as Script;
    const component = new obsidian.Component();
    this.owner.addChild(component);
    const logs: string[] = [];
    const log = (...args: unknown[]) => { if (logs.length < 30) logs.push(args.map((item) => printable(item, 1000)).join(' ')); };
    try {
      const value = await run(this.app, obsidian, component, signal, { log, warn: log, error: log });
      signal?.throwIfAborted();
      return { value: printable(value), logs };
    } finally {
      // Persistent behavior belongs to independent plugins, not one-shot tool calls.
      this.owner.removeChild(component);
      component.unload();
    }
  }
}
