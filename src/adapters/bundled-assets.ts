import { compilerGzipBase64 } from 'superpowers:assets';
export { references as bundledReferences } from 'superpowers:assets';

/** Decompress the bundled compiler on the first build, without network or Node APIs. */
export async function loadCompilerWasm(): Promise<ArrayBuffer> {
  const decoded = atob(compilerGzipBase64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  // WebKit's Blob reader can fail when its network context is offline; keep bytes in memory.
  const compressed = new ReadableStream<BufferSource>({
    start(controller) { controller.enqueue(bytes); controller.close(); },
  });
  return new Response(compressed.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
