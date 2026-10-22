export type JwtJsonObject = Record<string, unknown>;

export type JwtClaim = {
  name: "iss" | "sub" | "aud" | "exp" | "nbf" | "iat" | "jti";
  value: unknown;
  readableDate?: string;
  timeStatus?: "expired" | "not-active" | "future-issued";
};

export type JwtAnalysis = {
  header: JwtJsonObject;
  payload: JwtJsonObject;
  signatureSegment: string;
  algorithm: string;
  tokenType: string;
  claims: JwtClaim[];
  warnings: string[];
};

function decodeBase64Url(segment: string, label: string): string {
  if (!segment || !/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) {
    throw new Error(`${label}: segmento Base64URL vacío o inválido.`);
  }
  const standard = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard + "=".repeat((4 - standard.length % 4) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error(`${label}: no es Base64URL válido.`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    );
  } catch {
    throw new Error(`${label}: el contenido decodificado no es UTF-8 válido.`);
  }
}

function parseJsonObject(source: string, label: string): JwtJsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`${label}: el segmento decodificado no contiene JSON válido.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label}: se esperaba un objeto JSON.`);
  }
  return parsed as JwtJsonObject;
}

function readableTimestamp(value: unknown, name: JwtClaim["name"], nowSeconds: number): Pick<JwtClaim, "readableDate" | "timeStatus"> {
  if (typeof value !== "number" || !Number.isFinite(value)) return {};
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) return {};
  let timeStatus: JwtClaim["timeStatus"];
  if (name === "exp" && value <= nowSeconds) timeStatus = "expired";
  if (name === "nbf" && value > nowSeconds) timeStatus = "not-active";
  if (name === "iat" && value > nowSeconds) timeStatus = "future-issued";
  return { readableDate: date.toISOString(), timeStatus };
}

export function inspectJwt(token: string, now = Date.now()): JwtAnalysis {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Estructura incorrecta: el formato compacto debe tener tres segmentos separados por puntos.");
  }
  if (!parts[0] || !parts[1]) {
    throw new Error("Estructura incorrecta: el encabezado y el payload no pueden estar vacíos.");
  }

  const header = parseJsonObject(decodeBase64Url(parts[0], "Header"), "Header");
  const payload = parseJsonObject(decodeBase64Url(parts[1], "Payload"), "Payload");
  if (parts[2] && (!/^[A-Za-z0-9_-]+$/.test(parts[2]) || parts[2].length % 4 === 1)) {
    throw new Error("Estructura incorrecta: el segmento de firma no usa Base64URL válido.");
  }
  const claimNames: JwtClaim["name"][] = ["iss", "sub", "aud", "exp", "nbf", "iat", "jti"];
  const claims = claimNames
    .filter((name) => payload[name] !== undefined)
    .map((name) => ({ name, value: payload[name], ...readableTimestamp(payload[name], name, now / 1000) }));
  const warnings = ["Firma no verificada: decodificar el contenido no demuestra autenticidad ni integridad."];
  if (claims.some((claim) => claim.timeStatus)) {
    warnings.push("Los avisos temporales usan el reloj local y no sustituyen la validación de claims.");
  }

  return {
    header,
    payload,
    signatureSegment: parts[2],
    algorithm: typeof header.alg === "string" ? header.alg : "No declarado",
    tokenType: typeof header.typ === "string" ? header.typ : "No declarado",
    claims,
    warnings,
  };
}

export function decodeJwt(token: string): { header: unknown; payload: unknown; valid: boolean; warnings: string[] } {
  try {
    const result = inspectJwt(token);
    return { header: result.header, payload: result.payload, valid: true, warnings: result.warnings };
  } catch (error) {
    return {
      header: null,
      payload: null,
      valid: false,
      warnings: [error instanceof Error ? error.message : "JWT malformado."],
    };
  }
}

export function describeJwtPayload(payload: JwtJsonObject): Record<string, string> {
  const findings: Record<string, string> = {};
  for (const name of ["iss", "sub", "aud", "exp", "nbf", "iat", "jti"] as const) {
    const value = payload[name];
    if (value === undefined) continue;
    const timestamp = readableTimestamp(value, name, Date.now() / 1000);
    findings[name] = timestamp.readableDate ?? (typeof value === "string" ? value : JSON.stringify(value));
  }
  return findings;
}
