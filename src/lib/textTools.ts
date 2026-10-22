export const TEXT_INPUT_LIMIT = 250_000;
export const REGEX_INPUT_LIMIT = 100_000;
export const REGEX_PATTERN_LIMIT = 500;
export const LOG_INPUT_LIMIT = 1_000_000;
export const REGEX_TIMEOUT_MS = 500;
export const DIFF_LINE_LIMIT = 1_000;
export const DIFF_CELL_LIMIT = 500_000;

export type TextMetrics = {
  utf16Units: number;
  codePoints: number;
  graphemes: number | null;
  charactersWithoutWhitespace: number;
  words: number;
  lines: number;
  blankLines: number;
  paragraphs: number;
  utf8Bytes: number;
  numericCharacters: number;
  letters: number;
  whitespaceCharacters: number;
  detectableNonPrintable: number;
};

export type TextTransform =
  | "uppercase"
  | "lowercase"
  | "trim"
  | "normalize-newlines"
  | "remove-blank-lines"
  | "unique-lines"
  | "sort-lines"
  | "reverse-lines"
  | "number-lines"
  | "remove-line-numbers"
  | "prefix-suffix"
  | "collapse-spaces"
  | "tabs-to-spaces"
  | "spaces-to-tabs"
  | "include-lines"
  | "exclude-lines"
  | "regex-lines"
  | "blank-between-lines"
  | "remove-blank-between-lines";

export type TransformOptions = {
  keyword?: string;
  pattern?: string;
  flags?: string;
  prefix?: string;
  suffix?: string;
  spacesPerTab?: number;
};

export type LiteralMatch = {
  start: number;
  end: number;
  value: string;
  line: number;
  column: number;
  contextBefore: string;
  contextAfter: string;
};

export type RegexMatch = {
  start: number;
  end: number;
  value: string;
  groups: string[];
  line: number;
  column: number;
};

export type DiffLine = {
  type: "same" | "added" | "removed" | "modified";
  value: string;
  otherValue?: string;
  leftLine?: number;
  rightLine?: number;
};

export type IndicatorCategory =
  | "ipv4"
  | "mac"
  | "url"
  | "domain"
  | "email"
  | "hex"
  | "hash"
  | "date"
  | "port"
  | "http";

export type IndicatorMatch = {
  category: IndicatorCategory;
  value: string;
  position: number;
  interpretation: "coincidencia sintáctica";
};

export type LogLineMatch = {
  lineNumber: number;
  text: string;
  contextBefore: Array<{ lineNumber: number; text: string }>;
  contextAfter: Array<{ lineNumber: number; text: string }>;
};

export type LogAnalysis = {
  totalLines: number;
  terms: Array<{ term: string; matches: LogLineMatch[] }>;
  matchedLineCount: number;
};

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function graphemeCount(value: string): number | null {
  type SegmenterConstructor = new (
    locale?: string,
    options?: { granularity: "grapheme" },
  ) => { segment: (input: string) => Iterable<unknown> };
  const segmenterApi = Intl as typeof Intl & { Segmenter?: SegmenterConstructor };
  if (!segmenterApi.Segmenter) return null;
  return Array.from(new segmenterApi.Segmenter(undefined, { granularity: "grapheme" }).segment(value)).length;
}

export function analyzeText(value: string): TextMetrics {
  const normalized = normalizeLineEndings(value);
  const lines = value.length === 0 ? [] : normalized.split("\n");
  const codePoints = Array.from(value);
  const words = value.match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu) ?? [];
  const paragraphCount = normalized.trim()
    ? normalized.trim().split(/\n[\t \u00a0]*\n+/).length
    : 0;
  const blankLines = lines.filter((line) => line.trim().length === 0).length;
  const whitespaceCharacters = codePoints.filter((character) => /\s/u.test(character)).length;
  const detectableNonPrintable = codePoints.filter((character) => /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]/u.test(character)).length;

  return {
    utf16Units: value.length,
    codePoints: codePoints.length,
    graphemes: graphemeCount(value),
    charactersWithoutWhitespace: codePoints.length - whitespaceCharacters,
    words: words.length,
    lines: lines.length,
    blankLines,
    paragraphs: paragraphCount,
    utf8Bytes: new TextEncoder().encode(value).length,
    numericCharacters: codePoints.filter((character) => /\p{N}/u.test(character)).length,
    letters: codePoints.filter((character) => /\p{L}/u.test(character)).length,
    whitespaceCharacters,
    detectableNonPrintable,
  };
}

export function transformText(
  operation: TextTransform,
  value: string,
  options: TransformOptions = {},
): string {
  const normalized = normalizeLineEndings(value);
  const lines = normalized.split("\n");
  const tabSize = options.spacesPerTab ?? 4;
  switch (operation) {
    case "uppercase":
      return value.toLocaleUpperCase();
    case "lowercase":
      return value.toLocaleLowerCase();
    case "trim":
      return value.trim();
    case "normalize-newlines":
      return normalized;
    case "remove-blank-lines":
      return lines.filter((line) => line.trim().length > 0).join("\n");
    case "unique-lines": {
      const seen = new Set<string>();
      return lines.filter((line) => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      }).join("\n");
    }
    case "sort-lines":
      return [...lines].sort((left, right) => left.localeCompare(right)).join("\n");
    case "reverse-lines":
      return [...lines].reverse().join("\n");
    case "number-lines":
      return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
    case "remove-line-numbers":
      return lines.map((line) => line.replace(/^\s*\d+\s*[.):\-]\s?/, "")).join("\n");
    case "prefix-suffix":
      return lines.map((line) => `${options.prefix ?? ""}${line}${options.suffix ?? ""}`).join("\n");
    case "collapse-spaces":
      return value.replace(/[^\S\r\n]{2,}/g, " ");
    case "tabs-to-spaces":
      if (!Number.isInteger(tabSize) || tabSize < 1 || tabSize > 16) {
        throw new Error("El ancho de tabulación debe estar entre 1 y 16 espacios.");
      }
      return value.replace(/\t/g, " ".repeat(tabSize));
    case "spaces-to-tabs":
      if (!Number.isInteger(tabSize) || tabSize < 1 || tabSize > 16) {
        throw new Error("El ancho de tabulación debe estar entre 1 y 16 espacios.");
      }
      return value.replace(new RegExp(` {${tabSize}}`, "g"), "\t");
    case "include-lines":
      if (!options.keyword) throw new Error("Introduce el texto que deben contener las líneas.");
      return lines.filter((line) => line.includes(options.keyword ?? "")).join("\n");
    case "exclude-lines":
      if (!options.keyword) throw new Error("Introduce el texto que deben excluir las líneas.");
      return lines.filter((line) => !line.includes(options.keyword ?? "")).join("\n");
    case "regex-lines": {
      throw new Error("El filtrado Regex requiere filterLinesByRegex para ejecutarse en un worker aislado.");
    }
    case "blank-between-lines":
      return lines.join("\n\n");
    case "remove-blank-between-lines":
      return lines.filter((line) => line.trim().length > 0).join("\n");
  }
}

function lineAndColumn(value: string, index: number): { line: number; column: number } {
  const before = value.slice(0, index);
  const lastNewline = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("\r"));
  return {
    line: (before.match(/\r\n|\r|\n/g)?.length ?? 0) + 1,
    column: index - lastNewline,
  };
}

export function searchLiteral(
  value: string,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean; contextLength?: number } = {},
): LiteralMatch[] {
  if (!query) throw new Error("Introduce un término para buscar.");
  if (query.length > 1000) throw new Error("El término de búsqueda no puede superar 1.000 unidades UTF-16.");
  const contextLength = options.contextLength ?? 45;
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options.caseSensitive ? "gu" : "giu");
  const matches: LiteralMatch[] = [];
  for (const match of value.matchAll(regex)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (options.wholeWord) {
      const previous = start > 0 ? Array.from(value.slice(0, start)).at(-1) ?? "" : "";
      const next = Array.from(value.slice(end))[0] ?? "";
      if (/[\p{L}\p{N}_]/u.test(previous) || /[\p{L}\p{N}_]/u.test(next)) continue;
    }
    const { line, column } = lineAndColumn(value, start);
    matches.push({
      start,
      end,
      value: match[0],
      line,
      column,
      contextBefore: value.slice(Math.max(0, start - contextLength), start),
      contextAfter: value.slice(end, Math.min(value.length, end + contextLength)),
    });
    if (matches.length >= 10_000) break;
  }
  return matches;
}

const regexWorkerSource = `
self.onmessage = (event) => {
  const { value, pattern, flags } = event.data;
  try {
    const regex = new RegExp(pattern, flags);
    const matches = [];
    let match;
    do {
      match = regex.exec(value);
      if (!match) break;
      const start = match.index;
      const before = value.slice(0, start);
      const lastNewline = Math.max(before.lastIndexOf("\\n"), before.lastIndexOf("\\r"));
      matches.push({
        start,
        end: start + match[0].length,
        value: match[0],
        groups: Array.from(match).slice(1),
        line: (before.match(/\\r\\n|\\r|\\n/g) || []).length + 1,
        column: start - lastNewline
      });
      if (!regex.global) break;
      if (match[0].length === 0) {
        const codePoint = value.codePointAt(regex.lastIndex);
        regex.lastIndex += codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
      }
      if (matches.length >= 10000) break;
    } while (regex.lastIndex <= value.length);
    self.postMessage({ matches });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Error en la expresión regular." });
  }
};`;

export function executeRegex(value: string, pattern: string, flags: string): Promise<RegexMatch[]> {
  if (pattern.length > REGEX_PATTERN_LIMIT) {
    return Promise.reject(new Error(`El patrón supera el límite de ${REGEX_PATTERN_LIMIT} caracteres.`));
  }
  if (value.length > REGEX_INPUT_LIMIT) {
    return Promise.reject(new Error(`El texto supera el límite Regex de ${REGEX_INPUT_LIMIT.toLocaleString("es-ES")} unidades UTF-16.`));
  }
  if (!/^[gimsu]*$/.test(flags) || new Set(flags).size !== flags.length) {
    return Promise.reject(new Error("Flags inválidos o repetidos. Flags compatibles: g, i, m, s y u."));
  }
  if (typeof Worker === "undefined" || typeof URL.createObjectURL !== "function") {
    return Promise.reject(new Error("Este navegador no permite un Web Worker local; se cancela la operación para no ejecutar Regex síncrona en la interfaz."));
  }

  const workerUrl = URL.createObjectURL(new Blob([regexWorkerSource], { type: "text/javascript" }));
  return new Promise<RegexMatch[]>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(workerUrl);
    } catch (error) {
      URL.revokeObjectURL(workerUrl);
      reject(new Error(`No se pudo iniciar el worker aislado para Regex: ${error instanceof Error ? error.message : "error desconocido"}`));
      return;
    }
    const timer = globalThis.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error(`La expresión superó el límite de ${REGEX_TIMEOUT_MS} ms y se canceló. Revisa el patrón; no puede garantizarse que un patrón sea inmune a ReDoS.`));
    }, REGEX_TIMEOUT_MS);
    const cleanup = () => {
      globalThis.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
    worker.onmessage = (event: MessageEvent<{ matches?: RegexMatch[]; error?: string }>) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.matches ?? []);
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(`Falló el worker Regex: ${event.message || "error de ejecución"}`));
    };
    worker.postMessage({ value, pattern, flags });
  });
}

export async function filterLinesByRegex(value: string, pattern: string, flags: string): Promise<string> {
  if (!pattern) throw new Error("Introduce una expresión regular para filtrar las líneas.");
  const safeFlags = `${flags.replace(/g/g, "")}g`;
  const matches = await executeRegex(value, pattern, safeFlags);
  const matchedLines = new Set(matches.map((match) => match.line));
  return normalizeLineEndings(value).split("\n").filter((_, index) => matchedLines.has(index + 1)).join("\n");
}

export function diffLines(
  leftText: string,
  rightText: string,
  options: { ignoreOuterWhitespace?: boolean; ignoreCase?: boolean } = {},
): DiffLine[] {
  const normalizedLeft = normalizeLineEndings(leftText);
  const normalizedRight = normalizeLineEndings(rightText);
  const left = normalizedLeft.length ? normalizedLeft.split("\n") : [];
  const right = normalizedRight.length ? normalizedRight.split("\n") : [];
  if (Math.max(left.length, right.length) > DIFF_LINE_LIMIT || left.length * right.length > DIFF_CELL_LIMIT) {
    throw new Error(`La comparación se limita a ${DIFF_LINE_LIMIT} líneas y ${DIFF_CELL_LIMIT.toLocaleString("es-ES")} celdas LCS.`);
  }
  const normalize = (line: string) => {
    let normalized = options.ignoreOuterWhitespace ? line.trim() : line;
    if (options.ignoreCase) normalized = normalized.toLocaleLowerCase();
    return normalized;
  };
  const rows = left.length + 1;
  const columns = right.length + 1;
  const table = Array.from({ length: rows }, () => new Uint16Array(columns));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = normalize(left[i]) === normalize(right[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let leftLine = 1;
  let rightLine = 1;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && normalize(left[i]) === normalize(right[j])) {
      result.push({ type: "same", value: left[i], leftLine, rightLine });
      i += 1;
      j += 1;
      leftLine += 1;
      rightLine += 1;
      continue;
    }
    const removed: Array<{ value: string; line: number }> = [];
    const added: Array<{ value: string; line: number }> = [];
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && normalize(left[i]) === normalize(right[j])) break;
      if (j >= right.length || (i < left.length && table[i + 1][j] >= table[i][j + 1])) {
        removed.push({ value: left[i], line: leftLine++ });
        i += 1;
      } else {
        added.push({ value: right[j], line: rightLine++ });
        j += 1;
      }
    }
    if (removed.length === 1 && added.length === 1) {
      for (let index = 0; index < removed.length; index += 1) {
        result.push({
          type: "modified",
          value: removed[index].value,
          otherValue: added[index].value,
          leftLine: removed[index].line,
          rightLine: added[index].line,
        });
      }
    } else {
      for (const item of removed) result.push({ type: "removed", value: item.value, leftLine: item.line });
      for (const item of added) result.push({ type: "added", value: item.value, rightLine: item.line });
    }
  }
  return result;
}

const indicatorPatterns: Record<IndicatorCategory, RegExp> = {
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  mac: /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi,
  url: /https?:\/\/[^\s<>"']+/gi,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/gi,
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  hex: /\b(?:0x)?[0-9a-f]{8,}\b/gi,
  hash: /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}|\$argon2(?:id|i|d)\$[^\s]+|\b(?:[0-9a-f]{32}|[0-9a-f]{40}|[0-9a-f]{64}|[0-9a-f]{96}|[0-9a-f]{128})\b/gi,
  date: /\b(?:\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-][0-2]\d:?[0-5]\d)?)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/g,
  port: /\b(?:port\s*[:=]?\s*|:\s*)(\d{1,5})\b/gi,
  http: /\b(?:HTTP\/\d(?:\.\d)?\s+\d{3}\b|\b[1-5]\d{2}\b(?=\s+(?:HTTP|OK\b|Created\b|Not Found\b|Bad Request\b|Unauthorized\b|Forbidden\b|Internal Server Error\b)))/gi,
};

export const indicatorCategories: Array<{ id: IndicatorCategory; label: string }> = [
  { id: "ipv4", label: "IPv4" },
  { id: "mac", label: "MAC" },
  { id: "url", label: "URLs" },
  { id: "domain", label: "Dominios" },
  { id: "email", label: "Correos" },
  { id: "hex", label: "Hexadecimal" },
  { id: "hash", label: "Posibles hashes" },
  { id: "date", label: "Fechas" },
  { id: "port", label: "Puertos" },
  { id: "http", label: "Códigos HTTP" },
];

export function extractIndicators(
  value: string,
  categories: IndicatorCategory[],
  deduplicate = false,
): IndicatorMatch[] {
  const matches: IndicatorMatch[] = [];
  for (const category of categories) {
    const regex = new RegExp(indicatorPatterns[category].source, indicatorPatterns[category].flags);
    for (const match of value.matchAll(regex)) {
      const position = match.index ?? 0;
      let candidate = match[1] ?? match[0];
      const candidatePosition = position + (match[1] ? match[0].lastIndexOf(candidate) : 0);
      if (category === "ipv4") {
        if (candidate.split(".").some((part) => Number(part) > 255)) continue;
      }
      if (category === "url") candidate = candidate.replace(/[),.;!?]+$/, "");
      if (category === "port" && (Number(candidate) < 0 || Number(candidate) > 65535)) continue;
      if (category === "hash") {
        const length = candidate.length;
        if (!candidate.startsWith("$") && ![32, 40, 64, 96, 128].includes(length)) continue;
      }
      matches.push({ category, value: candidate, position: candidatePosition, interpretation: "coincidencia sintáctica" });
    }
  }
  matches.sort((left, right) => left.position - right.position || left.category.localeCompare(right.category));
  if (!deduplicate) return matches;
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.category}\0${match.value.toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function analyzeLogs(
  value: string,
  termsInput: string,
  contextSize = 1,
): LogAnalysis {
  if (value.length > LOG_INPUT_LIMIT) {
    throw new Error(`El texto de log supera el límite de ${LOG_INPUT_LIMIT.toLocaleString("es-ES")} unidades UTF-16.`);
  }
  if (!Number.isInteger(contextSize) || contextSize < 0 || contextSize > 10) {
    throw new Error("El contexto debe estar entre 0 y 10 líneas.");
  }
  const lines = normalizeLineEndings(value).split("\n");
  const terms = termsInput.split(",").map((term) => term.trim()).filter(Boolean);
  if (!terms.length) throw new Error("Introduce al menos una palabra clave, separada por comas.");
  const termResults = terms.map((term) => {
    const matches: LogLineMatch[] = [];
    lines.forEach((line, index) => {
      if (!line.toLocaleLowerCase().includes(term.toLocaleLowerCase())) return;
      matches.push({
        lineNumber: index + 1,
        text: line,
        contextBefore: lines.slice(Math.max(0, index - contextSize), index).map((text, offset) => ({
          lineNumber: Math.max(0, index - contextSize) + offset + 1,
          text,
        })),
        contextAfter: lines.slice(index + 1, index + 1 + contextSize).map((text, offset) => ({
          lineNumber: index + offset + 2,
          text,
        })),
      });
    });
    return { term, matches };
  });
  const matchedNumbers = new Set(termResults.flatMap((term) => term.matches.map((match) => match.lineNumber)));
  return { totalLines: lines.length, terms: termResults, matchedLineCount: matchedNumbers.size };
}
