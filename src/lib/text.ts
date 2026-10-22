export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countLines(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r\n|\n|\r/).length;
}

export function countUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function regexSearch(value: string, pattern: string, flags: string): { matches: string[]; error?: string } {
  try {
    const regex = new RegExp(pattern, flags);
    const matches = value.match(regex) ?? [];
    return { matches };
  } catch (error) {
    return { matches: [], error: error instanceof Error ? error.message : "Regex inválida" };
  }
}

export function extractIPv4(value: string): string[] {
  return [...value.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)].map((match) => match[0]);
}

export function extractMac(value: string): string[] {
  return [...value.matchAll(/(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/g)].map((match) => match[0]);
}

export function extractUrls(value: string): string[] {
  return [...value.matchAll(/https?:\/\/[^\s]+/gi)].map((match) => match[0]);
}

export function extractDomains(value: string): string[] {
  return [...value.matchAll(/(?:[a-z0-9-]+\.)+[a-z]{2,}/gi)].map((match) => match[0]);
}

export function diffLines(a: string, b: string): Array<{ type: "same" | "added" | "removed"; value: string }> {
  const left = normalizeLineEndings(a).split(/\n/);
  const right = normalizeLineEndings(b).split(/\n/);
  const max = Math.max(left.length, right.length);
  const results: Array<{ type: "same" | "added" | "removed"; value: string }> = [];

  for (let index = 0; index < max; index += 1) {
    const oldLine = left[index];
    const newLine = right[index];
    if (oldLine === newLine) {
      results.push({ type: "same", value: oldLine ?? "" });
      continue;
    }
    if (oldLine !== undefined) results.push({ type: "removed", value: oldLine });
    if (newLine !== undefined) results.push({ type: "added", value: newLine });
  }

  return results;
}
