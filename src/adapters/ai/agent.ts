import { ToolLoopAgent, stepCountIs } from 'ai';
import type { LanguageModel } from 'ai';
import type { createTools } from './tools';

/** One local tool loop shared by the Obsidian chat and behavioral evaluations. */
export function createAgent(model: LanguageModel, tools: ReturnType<typeof createTools>, instructions: string, maxSteps: number) {
  return new ToolLoopAgent({
    model,
    instructions,
    tools,
    stopWhen: stepCountIs(maxSteps),
    maxRetries: 1,
    providerOptions: {
      openai: { parallelToolCalls: true },
      anthropic: { disableParallelToolUse: false },
    },
  });
}
