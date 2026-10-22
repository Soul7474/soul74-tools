export function toUnixSeconds(value: string | number): number | null {
  const asNumber = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(asNumber)) return null;
  return Math.trunc(asNumber);
}

export function isoFromTimestamp(value: string | number): string {
  const seconds = toUnixSeconds(value);
  if (seconds === null) return "Entrada inválida";
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? "Fecha inválida" : date.toISOString();
}

export function timestampFromIso(value: string): number | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Math.trunc(date.getTime() / 1000);
}

export function toUtcDisplay(value: string | number): string {
  const date = new Date(typeof value === "number" ? value : Number(value));
  return Number.isNaN(date.getTime()) ? "Fecha inválida" : date.toUTCString();
}

export function toLocalDisplay(value: string | number): string {
  const date = new Date(typeof value === "number" ? value : Number(value));
  return Number.isNaN(date.getTime()) ? "Fecha inválida" : date.toString();
}
