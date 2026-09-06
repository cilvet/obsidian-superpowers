import { expect, test } from 'bun:test';
import { transcribeAudio } from '../src/adapters/ai/transcription';

test.each([['audio/mp4', 'recording.m4a'], ['audio/webm', 'recording.webm']])('uploads %s with the correct filename directly to the provider', async (mime, filename) => {
  const result = await transcribeAudio(new Blob(['fixture'], { type: mime }), 'fixture', 'test-model', async (url, init) => {
    expect(String(url)).toBe('https://api.openai.com/v1/audio/transcriptions');
    const form = init?.body;
    expect(form).toBeInstanceOf(FormData);
    if (!(form instanceof FormData)) throw new Error('Expected form data');
    const file = form.get('file');
    expect(file).toBeInstanceOf(File);
    if (file instanceof File) expect(file.name).toBe(filename);
    return Response.json({ text: 'A dictated request' });
  });
  expect(result).toBe('A dictated request');
});
