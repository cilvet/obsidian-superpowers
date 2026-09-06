import { z } from 'zod';

export const providerSchema = z.enum(['openai', 'anthropic', 'google']);
export type ProviderId = z.infer<typeof providerSchema>;
export const defaultModels = { openai: 'gpt-5.4', anthropic: 'claude-sonnet-4-6', google: 'gemini-2.5-pro' } satisfies Record<ProviderId, string>;

export const settingsSchema = z.object({
  provider: providerSchema.default('openai'),
  models: z.object({ openai: z.string(), anthropic: z.string(), google: z.string() }).default(() => ({ ...defaultModels })),
  credentialNamespace: z.string().default(() => crypto.randomUUID()),
  maxSteps: z.number().int().min(1).max(200).default(40),
  transcriptionModel: z.string().default('gpt-4o-mini-transcribe'),
});
export type Settings = z.infer<typeof settingsSchema>;

export interface Credentials {
  get(provider: ProviderId): string;
  set(provider: ProviderId, key: string): void;
}

/** Per-device credentials, separate from synchronizable vault files and chat context. */
export class DeviceCredentials implements Credentials {
  constructor(private readonly namespace: string, private readonly storage: Storage) {}
  get(provider: ProviderId) { return this.storage.getItem(`superpowers:${this.namespace}:${provider}`) ?? ''; }
  set(provider: ProviderId, key: string) {
    const name = `superpowers:${this.namespace}:${provider}`;
    if (key.trim()) this.storage.setItem(name, key.trim());
    else this.storage.removeItem(name);
  }
}
