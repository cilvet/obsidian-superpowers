import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ProviderId } from './settings';
import type { HttpFetch } from '../../application/ports';

export function createModel(provider: ProviderId, model: string, apiKey: string, fetcher: HttpFetch) {
  if (!apiKey) throw new Error(`Añade tu API key de ${provider} en los ajustes de Superpowers.`);
  switch (provider) {
    case 'openai': return createOpenAI({ apiKey, fetch: fetcher }).responses(model);
    case 'anthropic': return createAnthropic({ apiKey, fetch: fetcher, headers: { 'anthropic-dangerous-direct-browser-access': 'true' } })(model);
    case 'google': return createGoogleGenerativeAI({ apiKey, fetch: fetcher })(model);
  }
}
