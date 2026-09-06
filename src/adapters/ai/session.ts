import { Chat } from '@ai-sdk/react';
import { DirectChatTransport, safeValidateUIMessages, validateUIMessages } from 'ai';
import type { UIMessage, ChatTransport, InferAgentUIMessage } from 'ai';
import type { VaultPort, ReferencePort, HttpFetch } from '../../application/ports';
import { MutationQueue } from '../../application/studio';
import { createAgent } from './agent';
import { createModel } from './providers';
import type { createTools } from './tools';
import type { Credentials, Settings } from './settings';

export class ChatSession {
  readonly chat: Chat<UIMessage>;
  private writes = new MutationQueue();
  private saveTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly vault: VaultPort,
    private readonly historyPath: string,
    tools: ReturnType<typeof createTools>,
    references: ReferencePort,
    settings: () => Settings,
    credentials: Credentials,
    fetcher: HttpFetch,
    messages: UIMessage[],
  ) {
    const transport: ChatTransport<UIMessage> = {
      sendMessages: async (options) => {
        const config = settings();
        const model = createModel(config.provider, config.models[config.provider], credentials.get(config.provider), fetcher);
        const instructions = await references.instructions();
        const agent = createAgent(model, tools, instructions, config.maxSteps);
        const direct = new DirectChatTransport({ agent, onError: (error) => error instanceof Error ? error.message : String(error) });
        const messages = await validateUIMessages<InferAgentUIMessage<typeof agent>>({ messages: options.messages, tools });
        return direct.sendMessages({ ...options, messages });
      },
      reconnectToStream: async () => null,
    };
    this.chat = new Chat<UIMessage>({
      id: 'superpowers-chat', messages, transport,
      onFinish: () => { void this.save(); },
    });
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { void this.save(); }, 400);
  }

  save() {
    clearTimeout(this.saveTimer);
    const snapshot = JSON.stringify(this.chat.messages);
    return this.writes.run(() => this.vault.write(this.historyPath, snapshot));
  }

  async stop() { await this.chat.stop(); await this.save(); }

  async clear() {
    await this.stop();
    if (this.chat.messages.length) {
      await this.vault.write(`${this.historyPath}.${Date.now()}.backup`, JSON.stringify(this.chat.messages));
    }
    this.chat.messages = [];
    await this.save();
  }
}

export async function loadHistory(vault: VaultPort, path: string): Promise<UIMessage[]> {
  if (!(await vault.exists(path))) return [];
  const raw: unknown = JSON.parse(await vault.read(path));
  const validated = await safeValidateUIMessages({ messages: raw });
  if (!validated.success) throw new Error('El historial no tiene un formato válido. El archivo se conserva para recuperarlo.');
  // Aborted tools must have a terminal result before history is sent to a provider again.
  return validated.data.map((message) => ({ ...message, parts: message.parts.map((part) => {
    if ((part.type.startsWith('tool-') || part.type === 'dynamic-tool') && 'state' in part &&
      (part.state === 'input-streaming' || part.state === 'input-available')) {
      return { ...part, input: part.input ?? {}, state: 'output-error' as const, errorText: 'The previous run was interrupted. Inspect current state before retrying.' };
    }
    return part;
  }) }));
}
