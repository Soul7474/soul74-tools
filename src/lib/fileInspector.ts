export const MAX_FILE_OPERATION_SIZE = 50 * 1024 * 1024;
export const MAX_TEXT_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_SEARCH_RESULTS = 1000;
export const MAX_STRING_RESULTS = 5000;
export const MAX_CSV_DATA_ROWS = 100_000;
const MAX_CSV_ERRORS = 100;
export const HEX_VIEW_BYTES = 4096;
const SEARCH_CHUNK_BYTES = 64 * 1024;

export type FileSignature = {
  name: string;
  bytes: number[];
  offset?: number;
  ascii?: string;
  mask?: number[];
};

export const fileSignatures: FileSignature[] = [
  { name: "PDF", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], ascii: "%PDF-" },
  { name: "PNG", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { name: "JPEG", bytes: [0xff, 0xd8, 0xff] },
  { name: "GIF87a", bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], ascii: "GIF87a" },
  { name: "GIF89a", bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], ascii: "GIF89a" },
  { name: "ZIP", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { name: "ZIP (empty archive)", bytes: [0x50, 0x4b, 0x05, 0x06] },
  { name: "ZIP (spanned archive)", bytes: [0x50, 0x4b, 0x07, 0x08] },
  { name: "GZIP", bytes: [0x1f, 0x8b, 0x08] },
  { name: "RAR", bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00] },
  { name: "RAR 5", bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00] },
  { name: "7z", bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { name: "ELF", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "MZ (DOS/PE candidate)", bytes: [0x4d, 0x5a], ascii: "MZ" },
  { name: "WebP", bytes: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], mask: [255, 255, 255, 255, 0, 0, 0, 0, 255, 255, 255, 255] },
  { name: "SQLite 3", bytes: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00], ascii: "SQLite format 3\\0" },
  { name: "CAB", bytes: [0x4d, 0x53, 0x43, 0x46], ascii: "MSCF" },
];

export type SignatureInspection = {
  hex: string;
  decimal: string;
  ascii: string;
  offset: number;
  matches: string[];
  warning: string;
};

export function inspectSignature(bytes: Uint8Array): SignatureInspection {
  const matches = fileSignatures
    .filter((signature) => {
      if (bytes.length < signature.bytes.length) return false;
      return signature.bytes.every((byte, index) =>
        ((bytes[index] ?? 0) & (signature.mask?.[index] ?? 0xff)) ===
        (byte & (signature.mask?.[index] ?? 0xff)),
      );
    })
    .map((signature) => signature.name);
  const possibleTruncatedSignature = fileSignatures.some((signature) =>
    bytes.length > 0 &&
    bytes.length < signature.bytes.length &&
    bytes.every((byte, index) =>
      (byte & (signature.mask?.[index] ?? 0xff)) ===
      (signature.bytes[index] & (signature.mask?.[index] ?? 0xff)),
    ),
  );
  const ascii = Array.from(bytes, (byte) =>
    byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ".",
  ).join("");
  const warning = bytes.length === 0
    ? "El archivo está vacío; no hay cabecera que inspeccionar."
    : matches.length
      ? ""
      : possibleTruncatedSignature || bytes.length < 2
        ? "La cabecera puede ser insuficiente para reconocer una firma."
        : "No se reconoció una firma conocida. Esto no demuestra que el archivo esté corrupto.";

  return {
    hex: Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" "),
    decimal: Array.from(bytes, String).join(" "),
    ascii,
    offset: 0,
    matches,
    warning,
  };
}

export function hexDump(bytes: Uint8Array, startOffset: number, bytesPerRow: number): string {
  const rows: string[] = [];
  for (let index = 0; index < bytes.length; index += bytesPerRow) {
    const row = bytes.slice(index, index + bytesPerRow);
    const hex = Array.from(row, (byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ").padEnd(bytesPerRow * 3 - 1, " ");
    const ascii = Array.from(row, (byte) => byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ".").join("");
    rows.push(`${(startOffset + index).toString(16).padStart(8, "0").toUpperCase()}  ${hex}  ${ascii}`);
  }
  return rows.join("\n");
}

export function parseHexPattern(input: string): Uint8Array {
  const compact = input.trim().replace(/0x/gi, "").replace(/[\s,:-]/g, "");
  if (!compact || compact.length % 2 !== 0 || !/^[a-f\d]+$/i.test(compact)) {
    throw new Error("Introduce bytes hexadecimales completos, por ejemplo 50 4B 03 04.");
  }
  return Uint8Array.from(compact.match(/.{2}/g) ?? [], (part) => Number.parseInt(part, 16));
}

function assertSearchable(file: Blob): void {
  if (file.size > MAX_FILE_OPERATION_SIZE) {
    throw new Error("La búsqueda está limitada a archivos de 50 MiB para controlar memoria y tiempo.");
  }
}

export async function searchFileBytes(
  file: Blob,
  pattern: Uint8Array,
  signal?: AbortSignal,
): Promise<number[]> {
  assertSearchable(file);
  if (pattern.length === 0) throw new Error("El patrón de búsqueda no puede estar vacío.");
  const results: number[] = [];
  for (let offset = 0; offset < file.size; offset += SEARCH_CHUNK_BYTES) {
    if (signal?.aborted) throw new DOMException("Búsqueda cancelada.", "AbortError");
    const end = Math.min(file.size, offset + SEARCH_CHUNK_BYTES + pattern.length - 1);
    const bytes = new Uint8Array(await file.slice(offset, end).arrayBuffer());
    const searchableLength = Math.min(SEARCH_CHUNK_BYTES, file.size - offset);
    for (let index = 0; index < searchableLength && index + pattern.length <= bytes.length; index += 1) {
      let matched = true;
      for (let patternIndex = 0; patternIndex < pattern.length; patternIndex += 1) {
        if (bytes[index + patternIndex] !== pattern[patternIndex]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        results.push(offset + index);
        if (results.length >= MAX_SEARCH_RESULTS) return results;
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return results;
}

export function extractAsciiStrings(
  bytes: Uint8Array,
  minimumLength: number,
  filter: string,
  caseSensitive: boolean,
): Array<{ offset: number; value: string }> {
  if (!Number.isInteger(minimumLength) || minimumLength < 1 || minimumLength > 128) {
    throw new Error("La longitud mínima debe estar entre 1 y 128.");
  }
  const results: Array<{ offset: number; value: string }> = [];
  const needle = caseSensitive ? filter : filter.toLocaleLowerCase();
  let start = -1;
  let current = "";
  const flush = () => {
    if (current.length >= minimumLength) {
      const candidate = caseSensitive ? current : current.toLocaleLowerCase();
      if (!needle || candidate.includes(needle)) results.push({ offset: start, value: current });
    }
    start = -1;
    current = "";
  };

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte >= 0x20 && byte <= 0x7e) {
      if (start === -1) start = index;
      current += String.fromCharCode(byte);
    } else {
      flush();
      if (results.length >= MAX_STRING_RESULTS) break;
    }
  }
  flush();
  return results.slice(0, MAX_STRING_RESULTS);
}

export async function extractAsciiStringsFromBlob(
  file: Blob,
  minimumLength: number,
  filter: string,
  caseSensitive: boolean,
  signal?: AbortSignal,
): Promise<Array<{ offset: number; value: string }>> {
  if (file.size > MAX_FILE_OPERATION_SIZE) {
    throw new Error("La extracción está limitada a archivos de 50 MiB.");
  }
  if (!Number.isInteger(minimumLength) || minimumLength < 1 || minimumLength > 128) {
    throw new Error("La longitud mínima debe estar entre 1 y 128.");
  }
  const results: Array<{ offset: number; value: string }> = [];
  const needle = caseSensitive ? filter : filter.toLocaleLowerCase();
  let start = -1;
  let current = "";
  const flush = () => {
    if (current.length >= minimumLength) {
      const candidate = caseSensitive ? current : current.toLocaleLowerCase();
      if (!needle || candidate.includes(needle)) results.push({ offset: start, value: current });
    }
    start = -1;
    current = "";
  };

  for (let offset = 0; offset < file.size && results.length < MAX_STRING_RESULTS; offset += SEARCH_CHUNK_BYTES) {
    if (signal?.aborted) throw new DOMException("Extracción cancelada.", "AbortError");
    const bytes = new Uint8Array(await file.slice(offset, offset + SEARCH_CHUNK_BYTES).arrayBuffer());
    for (let index = 0; index < bytes.length; index += 1) {
      const byte = bytes[index];
      if (byte >= 0x20 && byte <= 0x7e) {
        if (start === -1) start = offset + index;
        current += String.fromCharCode(byte);
      } else {
        flush();
        if (results.length >= MAX_STRING_RESULTS) break;
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  flush();
  return results.slice(0, MAX_STRING_RESULTS);
}

export type CsvParseResult = {
  headers: string[];
  rows: string[][];
  dataRowCount: number;
  errors: string[];
  truncated: boolean;
};

export type InspectionReportData = {
  analyzedAt: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  signatureMatches: string[];
  signatureWarning: string;
  sha256: string;
  hexRange: { offset: number; length: number } | null;
  search: { kind: "hex" | "text"; query: string; offsets: number[] };
  stringCount: number;
  stringMinimum: number;
  json: { rootType: string; keys: string[]; error: string } | null;
  csv: { headers: string[]; dataRowCount: number; errors: string[]; truncated: boolean } | null;
  observations: string;
};

export function buildInspectionReport(data: InspectionReportData): string {
  const signature = data.signatureMatches.length ? data.signatureMatches.join(", ") : "ninguna reconocida";
  const search = data.search.query
    ? `${data.search.kind}; patrón "${data.search.query}"; ${data.search.offsets.length} coincidencia(s)${data.search.offsets.length === MAX_SEARCH_RESULTS ? " (límite de resultados alcanzado)" : ""}`
    : "no realizada";
  const json = data.json
    ? data.json.error
      ? `error: ${data.json.error}`
      : `válido; raíz ${data.json.rootType}; claves: ${data.json.keys.join(", ") || "ninguna"}`
    : "no aplicable o no analizado";
  const csv = data.csv
    ? `${data.csv.truncated ? "al menos " : ""}${data.csv.dataRowCount} filas de datos${data.csv.truncated ? ` (límite de ${MAX_CSV_DATA_ROWS})` : ""}; columnas: ${data.csv.headers.join(", ") || "ninguna"}; ${data.csv.errors.length} observación(es)${data.csv.errors.length ? `: ${data.csv.errors.join(" | ")}` : ""}`
    : "no aplicable o no analizado";

  return [
    "S0ul74-Tools — INFORME DE INSPECCIÓN LOCAL",
    `Fecha del análisis: ${data.analyzedAt}`,
    `Nombre: ${data.fileName}`,
    `Tamaño: ${data.fileSize} bytes (${formatFileSize(data.fileSize)})`,
    `Tipo MIME declarado: ${data.mimeType || "no declarado"}`,
    `Extensión: ${fileExtension(data.fileName)}`,
    `Firma detectada: ${signature}`,
    `Candidatos: ${signature}`,
    `Aviso de cabecera: ${data.signatureWarning || "ninguno"}`,
    `SHA-256: ${data.sha256 || "no calculado"}`,
    `Rango hexadecimal visible: ${data.hexRange ? `${data.hexRange.offset}–${data.hexRange.offset + data.hexRange.length - 1} (${data.hexRange.length} bytes)` : "no cargado"}`,
    `Búsqueda: ${search}`,
    `Extracción ASCII: ${data.stringCount} resultados; longitud mínima ${data.stringMinimum}`,
    `JSON: ${json}`,
    `CSV: ${csv}`,
    `Observaciones del usuario: ${data.observations.trim() || "ninguna"}`,
    "",
    "Limitaciones: el reconocimiento de firma es orientativo; no confirma seguridad, autenticidad ni integridad. Un formato desconocido no implica corrupción. El análisis no es una certificación forense ni garantiza cadena de custodia. Las cadenas extraídas se limitan a ASCII imprimible.",
  ].join("\n");
}

export function parseCsv(input: string, delimiter: string): CsvParseResult {
  if (delimiter.length !== 1 || delimiter === "\r" || delimiter === "\n" || delimiter === '"') {
    throw new Error("El separador debe ser un carácter distinto de comillas o salto de línea.");
  }
  const rows: string[][] = [];
  const errors: string[] = [];
  let errorLimitReached = false;
  let truncated = false;
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  let recordNumber = 1;

  const addError = (message: string) => {
    if (errors.length < MAX_CSV_ERRORS) errors.push(message);
    else errorLimitReached = true;
  };
  const pushField = () => {
    row.push(field);
    field = "";
    afterQuote = false;
  };
  const pushRow = () => {
    pushField();
    if (rows.length >= MAX_CSV_DATA_ROWS + 1) {
      truncated = true;
      return;
    }
    rows.push(row);
    row = [];
    recordNumber += 1;
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += char;
      }
      continue;
    }
    if (afterQuote && char !== delimiter && char !== "\r" && char !== "\n") {
      addError(`Registro ${recordNumber}: contenido inesperado después de cerrar un campo entrecomillado.`);
      afterQuote = false;
    }
    if (char === '"' && field.length === 0 && !afterQuote) {
      quoted = true;
    } else if (char === '"') {
      addError(`Registro ${recordNumber}: comilla en un campo no entrecomillado.`);
      field += char;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      pushRow();
      if (truncated) break;
    } else {
      field += char;
    }
  }
  if (quoted && !truncated) addError(`Registro ${recordNumber}: campo entrecomillado sin cierre.`);
  if (field.length > 0 || row.length > 0 || afterQuote) pushRow();
  if (truncated) addError(`Se alcanzó el límite de ${MAX_CSV_DATA_ROWS} filas de datos; las filas siguientes no se analizaron.`);

  const nonEmptyRows = rows.filter((candidate) => candidate.some((value) => value.length > 0));
  const headers = nonEmptyRows[0] ?? [];
  const dataRows = nonEmptyRows.slice(1);
  for (const [index, dataRow] of dataRows.entries()) {
    if (dataRow.length !== headers.length) {
      addError(`Fila de datos ${index + 1}: ${dataRow.length} campos; se esperaban ${headers.length}.`);
    }
  }
  if (errorLimitReached) errors.push(`Se limitaron los avisos a ${MAX_CSV_ERRORS}; pueden existir más inconsistencias.`);
  return { headers, rows: dataRows, dataRowCount: dataRows.length, errors, truncated };
}

export function detectCsvDelimiter(input: string): { delimiter: string; conclusive: boolean } {
  const sample = input.slice(0, 20_000);
  const scores = [",", ";", "\t", "|"].map((delimiter) => {
    const rows = sample.split(/\r\n|\r|\n/).slice(0, 20).filter((line) => line.length > 0);
    const counts = rows.map((line) => {
      let quoted = false;
      let fields = 1;
      for (let index = 0; index < line.length; index += 1) {
        if (line[index] === '"' && line[index + 1] === '"' && quoted) index += 1;
        else if (line[index] === '"') quoted = !quoted;
        else if (!quoted && line[index] === delimiter) fields += 1;
      }
      return fields;
    });
    const average = counts.reduce((sum, count) => sum + count, 0) / Math.max(counts.length, 1);
    const consistency = counts.filter((count) => count === counts[0]).length / Math.max(counts.length, 1);
    return { delimiter, average, consistency, score: average > 1 ? average * consistency : 0 };
  }).sort((left, right) => right.score - left.score);
  return {
    delimiter: scores[0].delimiter,
    conclusive: scores[0].score > 0 && scores[0].score > scores[1].score,
  };
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "—";
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} bytes`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]} (${size.toLocaleString("en-US")} bytes)`;
}
