import { compilerBase64 } from 'superpowers:assets';
export { references as bundledReferences } from 'superpowers:assets';

/** Decode only when the first build/action needs WASM, using WebView APIs. */
export async function loadCompilerWasm(): Promise<ArrayBuffer> {
  const decoded = atob(compilerBase64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return bytes.buffer;
}
