export type LogFormat = "auto" | "apache" | "nginx" | "syslog" | "windows-text" | "windows-csv" | "unknown";

export type ParsedLogEntry = {
  lineNumber: number;
  raw: string;
  timestamp: number | null;
  clockMilliseconds?: number | null;
  ip: string;
  method: string;
  path: string;
  status: string;
  user: string;
  userAgent: string;
  eventId: string;
  message: string;
};

export type LogFilters = {
  ip?: string;
  status?: string;
  method?: string;
  user?: string;
  from?: string;
  to?: string;
  text?: string;
  regex?: boolean;
};

export type LogThresholds = {
  failedLoginThreshold: number;
  windowMinutes: number;
  errorStatusThreshold: number;
  pathTraversalThreshold: number;
  sqliThreshold: number;
  xssThreshold: number;
  scannerThreshold: number;
};

export type LogHeuristic = {
  name: string;
  count: number;
  threshold: number;
  evidence: string;
};

export type LogSummary = {
  topIps: Array<{ value: string; count: number }>;
  topUrls: Array<{ value: string; count: number }>;
  topStatuses: Array<{ value: string; count: number }>;
  topUserAgents: Array<{ value: string; count: number }>;
  topUsers: Array<{ value: string; count: number }>;
  histogram: Array<{ label: string; count: number }>;
};

export type StructuredLogAnalysis = {
  detectedFormat: LogFormat;
  parsedLines: number;
  filteredLines: number;
  entries: ParsedLogEntry[];
  summary: LogSummary;
  heuristics: LogHeuristic[];
};

export const STRUCTURED_LOG_LIMIT = 1_000_000;

const defaultThresholds: LogThresholds = {
  failedLoginThreshold: 5,
  windowMinutes: 10,
  errorStatusThreshold: 10,
  pathTraversalThreshold: 1,
  sqliThreshold: 1,
  xssThreshold: 1,
  scannerThreshold: 1,
};

function parseTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requestParts(request: string): { method: string; path: string } {
  const match = /^([A-Z]+)\s+(\S+)(?:\s+HTTP\/[\d.]+)?$/i.exec(request.trim());
  return match ? { method: match[1].toUpperCase(), path: match[2] } : { method: "", path: request };
}

function parseApacheDate(value: string): number | null {
  return parseTimestamp(value.replace(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4}):/, "$2 $1 $3 "));
}

function parseApacheLine(line: string, lineNumber: number): ParsedLogEntry | null {
  const match = /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})\s+\S+(?:\s+"([^"]*)"\s+"([^"]*)")?/.exec(line);
  if (!match) return null;
  const request = requestParts(match[4]);
  return {
    lineNumber, raw: line, timestamp: parseApacheDate(match[3]), ip: match[1],
    method: request.method, path: request.path, status: match[5],
    user: match[2] === "-" ? "" : match[2], userAgent: match[7] ?? "",
    eventId: "", message: line,
  };
}

function parseNginxLine(line: string, lineNumber: number): ParsedLogEntry | null {
  if (line.trimStart().startsWith("{")) {
    try {
      const item = JSON.parse(line) as Record<string, unknown>;
      const request = requestParts(String(item.request ?? ""));
      const status = String(item.status ?? "");
      return {
        lineNumber, raw: line, timestamp: parseTimestamp(String(item.time_iso8601 ?? item.time ?? "")),
        ip: String(item.remote_addr ?? item.client ?? ""), method: String(item.request_method ?? request.method).toUpperCase(),
        path: String(item.request_uri ?? item.uri ?? request.path), status,
        user: String(item.remote_user ?? item.user ?? ""), userAgent: String(item.http_user_agent ?? item.user_agent ?? ""),
        eventId: "", message: line,
      };
    } catch {
      return null;
    }
  }
  return parseApacheLine(line, lineNumber);
}

function parseSyslogLine(line: string, lineNumber: number): ParsedLogEntry | null {
  const match = /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:[\s]+)(?:\[(\d+)\])?:\s*(.*)$/.exec(line);
  if (!match) return null;
  const message = match[5];
  const [monthName, dayText, timeText] = match[1].split(/\s+/);
  const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthName);
  const [hour, minute, second] = timeText.split(":").map(Number);
  const clockMilliseconds = monthIndex < 0 ? null : Date.UTC(2000, monthIndex, Number(dayText), hour, minute, second) - Date.UTC(2000, 0, 1);
  const ip = /\b(?:from|rhost=)\s*([0-9a-f:.]+)\b/i.exec(message)?.[1] ?? "";
  const user = /\b(?:invalid user\s+|user\s+|for\s+(?:invalid user\s+)?)([A-Za-z0-9_.@-]+)/i.exec(message)?.[1] ?? "";
  return {
    lineNumber, raw: line, timestamp: null, clockMilliseconds, ip, method: "", path: "", status: "",
    user, userAgent: "", eventId: "", message,
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  cells.push(value);
  return cells;
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function csvColumn(headers: string[], ...aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function parseCsvRecords(value: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
      if (character === "\r" && value[index + 1] === "\n") index += 1;
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    records.push(row);
  }
  return records;
}

function parseWindowsCsv(value: string): ParsedLogEntry[] {
  const rows = parseCsvRecords(value);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const eventIdColumn = csvColumn(headers, "eventid", "id");
  const messageColumn = csvColumn(headers, "message", "description");
  const timestampColumn = csvColumn(headers, "timecreated", "datetime", "dateandtime", "timegenerated", "date");
  const userColumn = csvColumn(headers, "user", "targetusername", "subjectusername", "accountname");
  const ipColumn = csvColumn(headers, "ipaddress", "sourceip", "sourcenetworkaddress", "ip");
  return rows.slice(1).flatMap((cells, index) => {
    if (!cells.some((cell) => cell.trim())) return [];
    const line = cells.join(",");
    const cell = (column: number) => column >= 0 ? cells[column] ?? "" : "";
    const message = cell(messageColumn) || line;
    return [{
      lineNumber: index + 2, raw: line, timestamp: parseTimestamp(cell(timestampColumn)),
      ip: cell(ipColumn), method: "", path: "", status: "", user: cell(userColumn),
      userAgent: "", eventId: cell(eventIdColumn), message,
    }];
  });
}

function parseWindowsTextLine(line: string, lineNumber: number): ParsedLogEntry {
  const eventId = /(?:Event\s*ID|EventID|<EventID>)\s*[:=>]\s*(\d+)/i.exec(line)?.[1] ?? "";
  const isoTimestamp = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/.exec(line)?.[0] ?? "";
  const ip = /\b(?:Source Network Address|IpAddress|IP Address)\s*[:=]\s*([0-9a-f:.]+)/i.exec(line)?.[1] ?? "";
  const user = /\b(?:TargetUserName|Account Name|User)\s*[:=]\s*([^\s,;]+)/i.exec(line)?.[1] ?? "";
  return {
    lineNumber, raw: line, timestamp: parseTimestamp(isoTimestamp), ip,
    method: "", path: "", status: "", user, userAgent: "", eventId, message: line,
  };
}

export function detectLogFormat(value: string): LogFormat {
  const samples = value.split(/\r\n?|\n/).filter((line) => line.trim()).slice(0, 30);
  if (!samples.length) return "unknown";
  const first = samples[0];
  if (first.startsWith("{") && /"remote_addr"\s*:/.test(first)) return "nginx";
  if (/Event\s*ID\s*[:=]|EventID\s*[:=]|<EventID>\d+<\/EventID>/i.test(first)) return "windows-text";
  if (/^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+/.test(first)) return "syslog";
  if (/^\S+\s+\S+\s+\S+\s+\[[^\]]+\]\s+"[^"]*"\s+\d{3}\s+/.test(first)) return "apache";
  const headers = parseCsvLine(first).map(normalizeHeader);
  if (headers.includes("eventid") && (headers.includes("message") || headers.includes("description"))) return "windows-csv";
  if (samples.some((line) => /(?:Event\s*ID|EventID)\s*[:=]\s*\d+/i.test(line))) return "windows-text";
  return "unknown";
}

export function parseStructuredLogs(value: string, requestedFormat: LogFormat = "auto"): { format: LogFormat; entries: ParsedLogEntry[] } {
  if (value.length > STRUCTURED_LOG_LIMIT) {
    throw new Error(`El texto de log supera el límite de ${STRUCTURED_LOG_LIMIT.toLocaleString("es-ES")} unidades UTF-16.`);
  }
  const lines = value.split(/\r\n?|\n/);
  const format = requestedFormat === "auto" ? detectLogFormat(value) : requestedFormat;
  if (format === "windows-csv") return { format, entries: parseWindowsCsv(value) };
  if (format === "unknown" || format === "auto") return { format, entries: lines.map((raw, index) => ({ ...parseWindowsTextLine(raw, index + 1), message: raw })) };
  const entries = lines.flatMap((line, index) => {
    if (!line.trim()) return [];
    if (format === "apache") return [parseApacheLine(line, index + 1) ?? { ...parseWindowsTextLine(line, index + 1), message: line }];
    if (format === "nginx") return [parseNginxLine(line, index + 1) ?? { ...parseWindowsTextLine(line, index + 1), message: line }];
    if (format === "syslog") return [parseSyslogLine(line, index + 1) ?? { ...parseWindowsTextLine(line, index + 1), message: line }];
    return [{ ...parseWindowsTextLine(line, index + 1), message: line }];
  });
  return { format, entries };
}

export function filterLogEntries(entries: ParsedLogEntry[], filters: LogFilters = {}): ParsedLogEntry[] {
  const ip = filters.ip?.trim().toLocaleLowerCase() ?? "";
  const status = filters.status?.trim().toLocaleLowerCase() ?? "";
  const method = filters.method?.trim().toLocaleLowerCase() ?? "";
  const user = filters.user?.trim().toLocaleLowerCase() ?? "";
  const text = filters.text?.trim() ?? "";
  let regex: RegExp | null = null;
  if (filters.regex && text) {
    try {
      regex = new RegExp(text, "i");
    } catch {
      throw new Error("La expresión regular del filtro no es válida.");
    }
  }
  const from = filters.from ? Date.parse(`${filters.from}T00:00:00`) : Number.NaN;
  const to = filters.to ? Date.parse(`${filters.to}T23:59:59.999`) : Number.NaN;
  if (filters.from && !Number.isFinite(from)) throw new Error("La fecha inicial no es válida.");
  if (filters.to && !Number.isFinite(to)) throw new Error("La fecha final no es válida.");
  if (Number.isFinite(from) && Number.isFinite(to) && from > to) throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
  return entries.filter((entry) => {
    if (ip && !entry.ip.toLocaleLowerCase().includes(ip)) return false;
    if (status && !(entry.status || entry.eventId).toLocaleLowerCase().includes(status)) return false;
    if (method && !entry.method.toLocaleLowerCase().includes(method)) return false;
    if (user && !entry.user.toLocaleLowerCase().includes(user)) return false;
    if (Number.isFinite(from) && (entry.timestamp === null || entry.timestamp < from)) return false;
    if (Number.isFinite(to) && (entry.timestamp === null || entry.timestamp > to)) return false;
    if (regex && !regex.test(entry.raw)) return false;
    if (text && !regex && !entry.raw.toLocaleLowerCase().includes(text.toLocaleLowerCase())) return false;
    return true;
  });
}

function topValues(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, 10);
}

function buildHistogram(entries: ParsedLogEntry[]): Array<{ label: string; count: number }> {
  const dates = entries.map((entry) => entry.timestamp).filter((value): value is number => value !== null);
  if (!dates.length) return [];
  const { minimum, maximum } = dates.reduce(
    (bounds, date) => ({ minimum: Math.min(bounds.minimum, date), maximum: Math.max(bounds.maximum, date) }),
    { minimum: Number.POSITIVE_INFINITY, maximum: Number.NEGATIVE_INFINITY },
  );
  const binCount = Math.min(24, Math.max(1, Math.ceil((maximum - minimum) / (60 * 60 * 1000))));
  const width = Math.max(1, maximum - minimum + 1);
  const bins = Array.from({ length: binCount }, (_, index) => ({
    label: new Date(minimum + (width * index) / binCount).toISOString(),
    count: 0,
  }));
  for (const date of dates) {
    const index = Math.min(binCount - 1, Math.floor(((date - minimum) / width) * binCount));
    bins[index].count += 1;
  }
  return bins;
}

function buildHeuristics(entries: ParsedLogEntry[], thresholds: LogThresholds): LogHeuristic[] {
  const failedByIp = new Map<string, number[]>();
  const failedPattern = /failed password|authentication failure|invalid user|failed logon|logon failure|event\s*id\s*[:=]?\s*4625|\b4625\b/i;
  for (const entry of entries) {
    const time = entry.timestamp ?? entry.clockMilliseconds ?? null;
    if (entry.ip && time !== null && (entry.status === "401" || failedPattern.test(entry.raw))) {
      const times = failedByIp.get(entry.ip) ?? [];
      times.push(time);
      failedByIp.set(entry.ip, times);
    }
  }
  const failedFindings: LogHeuristic[] = [];
  for (const [ip, times] of failedByIp) {
    times.sort((left, right) => left - right);
    let start = 0;
    let maximum = 0;
    for (let end = 0; end < times.length; end += 1) {
      while (times[end] - times[start] > thresholds.windowMinutes * 60_000) start += 1;
      maximum = Math.max(maximum, end - start + 1);
    }
    if (maximum >= thresholds.failedLoginThreshold) {
      failedFindings.push({ name: "Varios fallos de autenticación desde una IP", count: maximum, threshold: thresholds.failedLoginThreshold, evidence: ip });
    }
  }
  const makeCountFinding = (name: string, evidence: string, expression: RegExp, threshold: number): LogHeuristic | null => {
    const count = entries.filter((entry) => expression.test(entry.raw)).length;
    return count >= threshold ? { name, count, threshold, evidence } : null;
  };
  const traversal = makeCountFinding("Intentos con patrón de path traversal", "Coincidencias de ../ o variantes codificadas", /(?:\.\.\/|%2e%2e(?:%2f|\/|%5c|\\))/i, thresholds.pathTraversalThreshold);
  const sqli = makeCountFinding("Patrones habituales compatibles con SQLi", "Coincidencias heurísticas en texto de log", /\bunion(?:\s+all)?\s+select\b|(?:'|%27)\s*(?:or|and)\s+\d+\s*=\s*\d+/i, thresholds.sqliThreshold);
  const xss = makeCountFinding("Patrones habituales compatibles con XSS", "Coincidencias de <script o javascript:", /<\s*script\b|%3c\s*script|javascript\s*:/i, thresholds.xssThreshold);
  const scanner = makeCountFinding("User-Agent de herramienta de escaneo conocida", "sqlmap, nikto, nmap, masscan, zgrab, nuclei, acunetix o nessus", /\b(?:sqlmap|nikto|nmap|masscan|zgrab|nuclei|acunetix|nessus)\b/i, thresholds.scannerThreshold);
  const errorCount = entries.filter((entry) => /^[45]\d\d$/.test(entry.status)).length;
  const errors = errorCount >= thresholds.errorStatusThreshold
    ? [{ name: "Volumen de estados HTTP 4xx/5xx sobre el umbral", count: errorCount, threshold: thresholds.errorStatusThreshold, evidence: "Códigos HTTP presentes en las entradas analizadas" }]
    : [];
  return [...failedFindings, traversal, sqli, xss, scanner, ...errors].filter((finding): finding is LogHeuristic => finding !== null);
}

export function analyzeStructuredLogs(
  value: string,
  requestedFormat: LogFormat = "auto",
  filters: LogFilters = {},
  thresholds: LogThresholds = defaultThresholds,
): StructuredLogAnalysis {
  for (const [name, threshold] of Object.entries(thresholds)) {
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 10_000) {
      throw new Error(`El umbral «${name}» debe ser un entero entre 1 y 10.000.`);
    }
  }
  if (thresholds.windowMinutes > 1440) throw new Error("La ventana de autenticación no puede superar 1.440 minutos.");
  const parsed = parseStructuredLogs(value, requestedFormat);
  const filtered = filterLogEntries(parsed.entries, filters);
  const summary: LogSummary = {
    topIps: topValues(filtered.map((entry) => entry.ip)),
    topUrls: topValues(filtered.map((entry) => entry.path)),
    topStatuses: topValues(filtered.map((entry) => entry.status)),
    topUserAgents: topValues(filtered.map((entry) => entry.userAgent)),
    topUsers: topValues(filtered.map((entry) => entry.user)),
    histogram: buildHistogram(filtered),
  };
  return {
    detectedFormat: parsed.format,
    parsedLines: parsed.entries.length,
    filteredLines: filtered.length,
    entries: filtered,
    summary,
    heuristics: buildHeuristics(filtered, thresholds),
  };
}

export function analyzeStructuredLogsInWorker(
  value: string,
  format: LogFormat,
  filters: LogFilters,
  thresholds: LogThresholds,
): Promise<StructuredLogAnalysis> {
  if (typeof Worker === "undefined") return Promise.reject(new Error("Este navegador no admite Web Workers para analizar logs de forma segura."));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./logAnalyzer.worker.ts", import.meta.url), { type: "module" });
    } catch (reason) {
      reject(new Error(`No se pudo iniciar el Worker local de logs: ${reason instanceof Error ? reason.message : "error desconocido"}`));
      return;
    }
    const timeout = globalThis.setTimeout(() => {
      worker.terminate();
      reject(new Error("El análisis excedió 15 segundos y se canceló. Reduce el archivo o ajusta los filtros."));
    }, 15_000);
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<{ result?: StructuredLogAnalysis; error?: string }>) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else if (event.data.result) resolve(event.data.result);
      else reject(new Error("El Worker terminó sin devolver resultados."));
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(`Falló el Worker local de logs: ${event.message || "error de ejecución"}`));
    };
    worker.postMessage({ value, format, filters, thresholds });
  });
}
