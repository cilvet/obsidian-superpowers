import { z } from 'zod';
import type { HttpFetch } from '../../application/ports';

const transcriptionSchema = z.object({ text: z.string() });

export async function transcribeAudio(audio: Blob, apiKey: string, model: string, fetcher: HttpFetch, signal?: AbortSignal) {
  if (!apiKey) throw new Error('El dictado requiere una API key de OpenAI en los ajustes, aunque uses otro proveedor para el chat.');
  const body = new FormData();
  body.append('file', audio, audio.type.includes('mp4') ? 'recording.m4a' : 'recording.webm');
  body.append('model', model);
  const response = await fetcher('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body, signal });
  if (!response.ok) throw new Error(`La transcripción falló (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return transcriptionSchema.parse(await response.json()).text;
}
