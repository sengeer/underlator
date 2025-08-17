async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> | undefined,
  processChunk: (chunk: string) => void,
  decoder?: TextDecoder
): Promise<void> {
  if (!reader) return;

  const decoderInstance = decoder || new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoderInstance.decode(value);
    processChunk(chunk);
  }
}

export default processStream;
