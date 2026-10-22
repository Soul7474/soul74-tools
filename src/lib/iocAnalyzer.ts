import { classifyIpv6, isValidIpv6 } from "./network";
import { extractIndicators } from "./textTools";

export type IocCategory = "ipv4" | "ipv6" | "domain" | "url" | "email" | "hash" | "cve" | "path";
export type IpClassification = "privada" | "loopback" | "link-local" | "reservada" | "pública";

export type IocRecord = {
  category: IocCategory;
  value: string;
  position: number;
  ipClassification?: IpClassification;
};

export type IocAnalysis = {
  records: IocRecord[];
  counts: Record<IocCategory, number>;
  refangedText: string;
};

export const IOC_ANALYZER_EVENT = "soul74:open-iocs";
export const IOC_TEXT_LIMIT = 1_000_000;
export const IOC_FILE_SIZE_LIMIT = 2 * 1024 * 1024;

const ipv6Pattern = /(?<![0-9a-f:])(?:[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){2,7}|::(?:[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){0,6})?)(?![0-9a-f:])/gi;
const cvePattern = /\bCVE-\d{4}-\d{4,7}\b/gi;
const windowsPathPattern = /\b[A-Za-z]:\\(?:[^\\\s<>:"|?*]+\\)*[^\\\s<>:"|?*]*/g;
const unixFilePathPattern = /(?<![:/])\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/g;

const categories: IocCategory[] = ["ipv4", "ipv6", "domain", "url", "email", "hash", "cve", "path"];

export function refangIocText(value: string): string {
  return value
    .replace(/\bhxxps\b/gi, "https")
    .replace(/\bhxxp\b/gi, "http")
    .replace(/\[\.\]|\(\.\)/g, ".")
    .replace(/\[at\]/gi, "@")
    .replace(/\[:\]/g, ":");
}

export function defangIocText(value: string): string {
  return value
    .replace(/https/gi, (scheme) => scheme[0] === scheme[0].toUpperCase() ? "HXXPS" : "hxxps")
    .replace(/http/gi, (scheme) => scheme[0] === scheme[0].toUpperCase() ? "HXXP" : "hxxp")
    .replace(/@/g, "[at]")
    .replace(/\./g, "[.]");
}

function ipv4Classification(address: string): IpClassification {
  const octets = address.split(".").map(Number);
  const [a, b, c] = octets;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "privada";
  if (a === 127) return "loopback";
  if (a === 169 && b === 254) return "link-local";
  if (
    a === 0 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b === 18) ||
    (a === 198 && b === 19) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  ) return "reservada";
  return "pública";
}

function classifyIpv6ForIoc(address: string): IpClassification {
  const type = classifyIpv6(address);
  if (type === "loopback") return "loopback";
  if (type === "link-local") return "link-local";
  if (type === "ULA") return "privada";
  if (type === "global") return "pública";
  return "reservada";
}

function addPatternMatches(
  records: IocRecord[],
  text: string,
  category: "ipv6" | "cve" | "path",
  pattern: RegExp,
): void {
  for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
    const value = match[0].replace(/[),.;!?]+$/, "");
    if (!value) continue;
    if (category === "ipv6" && !isValidIpv6(value)) continue;
    records.push({ category, value, position: match.index ?? 0 });
  }
}

export function analyzeIocs(input: string): IocAnalysis {
  if (input.length > IOC_TEXT_LIMIT) {
    throw new Error(`El texto supera el límite de ${IOC_TEXT_LIMIT.toLocaleString("es-ES")} caracteres.`);
  }
  const refangedText = refangIocText(input);
  const records: IocRecord[] = extractIndicators(
    refangedText,
    ["ipv4", "url", "domain", "email", "hash"],
    false,
  ).map((match) => ({
    category: match.category as Extract<IocCategory, "ipv4" | "url" | "domain" | "email" | "hash">,
    value: match.value,
    position: match.position,
  }));
  addPatternMatches(records, refangedText, "ipv6", ipv6Pattern);
  addPatternMatches(records, refangedText, "cve", cvePattern);
  addPatternMatches(records, refangedText, "path", windowsPathPattern);
  addPatternMatches(records, refangedText, "path", unixFilePathPattern);

  const unique = new Map<string, IocRecord>();
  for (const record of records.sort((left, right) => left.position - right.position)) {
    const normalized = record.value.toLocaleLowerCase("en");
    const key = `${record.category}\0${normalized}`;
    if (!unique.has(key)) {
      unique.set(key, {
        ...record,
        value: record.category === "ipv4" ? record.value : record.value,
        ...(record.category === "ipv4" ? { ipClassification: ipv4Classification(record.value) } : {}),
        ...(record.category === "ipv6" ? { ipClassification: classifyIpv6ForIoc(record.value) } : {}),
      });
    }
  }
  const resultRecords = [...unique.values()];
  const counts = Object.fromEntries(categories.map((category) => [
    category,
    resultRecords.filter((record) => record.category === category).length,
  ])) as Record<IocCategory, number>;
  return { records: resultRecords, counts, refangedText };
}

export function iocsByCategory(analysis: IocAnalysis, category: IocCategory): string[] {
  return analysis.records.filter((record) => record.category === category).map((record) => record.value);
}

export function formatIocsCsv(records: IocRecord[]): string {
  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    ["category", "value", "ip_classification"].join(","),
    ...records.map((record) => [
      record.category,
      record.value,
      record.ipClassification ?? "",
    ].map(escapeCsv).join(",")),
  ].join("\r\n");
}

export function formatIocsText(records: IocRecord[]): string {
  return records.map((record) =>
    `${record.category.toUpperCase()}\t${record.value}${record.ipClassification ? `\t${record.ipClassification}` : ""}`,
  ).join("\n");
}
