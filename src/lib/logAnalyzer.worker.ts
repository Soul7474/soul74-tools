import { analyzeStructuredLogs, type LogFilters, type LogFormat, type LogThresholds } from "./logAnalyzer";

self.onmessage = (event: MessageEvent<{
  value: string;
  format: LogFormat;
  filters: LogFilters;
  thresholds: LogThresholds;
}>) => {
  try {
    self.postMessage({ result: analyzeStructuredLogs(event.data.value, event.data.format, event.data.filters, event.data.thresholds) });
  } catch (reason) {
    self.postMessage({ error: reason instanceof Error ? reason.message : "No se pudo analizar el registro." });
  }
};
