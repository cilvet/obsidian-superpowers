import { requestUrl } from 'obsidian';
import type { HttpFetch } from '../../application/ports';

/** Direct streaming where supported; native Obsidian HTTP for WebView CORS failures. */
export const obsidianFetch: HttpFetch = async (input, init) => {
  const request = new Request(input, init);
  request.signal.throwIfAborted();
  try {
    // Streaming and AbortSignal are needed for responsive chat/cancellation. requestUrl below
    // is the native fallback; it buffers responses and cannot cancel an in-flight request.
    return await fetch(request.clone());
  } catch (error) {
    request.signal.throwIfAborted();
    if (!(error instanceof TypeError)) throw error;
  }
  const headers = Object.fromEntries(request.headers.entries());
  delete headers['content-length'];
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
  const result = await requestUrl({ url: request.url, method: request.method, headers, body, throw: false });
  request.signal.throwIfAborted();
  // Native HTTP is buffered. Returning the original SSE bytes preserves SDK parsing/tool semantics.
  return new Response(result.status === 204 || result.status === 304 ? null : result.arrayBuffer, { status: result.status, headers: result.headers });
};
