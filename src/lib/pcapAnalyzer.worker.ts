import { parsePcap } from "./pcapAnalyzer";

self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer }>) => {
  const buffer = event.data.buffer;
  try {
    const analysis = parsePcap(buffer);
    self.postMessage({ analysis, buffer }, { transfer: [buffer] });
  } catch (reason) {
    self.postMessage({ error: reason instanceof Error ? reason.message : "No se pudo analizar la captura PCAP." });
  }
};
