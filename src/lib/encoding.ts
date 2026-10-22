export type EncodingOperation =
  | "text-base64"
  | "base64-text"
  | "text-base64url"
  | "base64url-text"
  | "text-hex"
  | "hex-text"
  | "text-binary"
  | "binary-text"
  | "decimal-hex"
  | "hex-decimal"
  | "url-encode"
  | "url-decode"
  | "html-encode"
  | "html-decode"
  | "rot13"
  | "rot47"
  | "caesar"
  | "xor"
  | "reverse"
  | "uppercase"
  | "lowercase"
  | "json-pretty"
  | "json-minify"
  | "json-escape"
  | "json-unescape"
  | "bytes-hex";

export type EncodingOptions = {
  shift?: number;
  xorKey?: string;
};

export const encodingOperations: Array<{ id: EncodingOperation; label: string; group: string }> = [
  { id: "text-base64", label: "Texto → Base64", group: "Base64" },
  { id: "base64-text", label: "Base64 → texto UTF-8", group: "Base64" },
  { id: "text-base64url", label: "Texto → Base64 URL-safe", group: "Base64" },
  { id: "base64url-text", label: "Base64 URL-safe → texto UTF-8", group: "Base64" },
  { id: "text-hex", label: "Texto → hexadecimal", group: "Bytes" },
  { id: "hex-text", label: "Hexadecimal → texto UTF-8", group: "Bytes" },
  { id: "text-binary", label: "Texto → binario", group: "Bytes" },
  { id: "binary-text", label: "Binario → texto UTF-8", group: "Bytes" },
  { id: "decimal-hex", label: "Decimal → hexadecimal", group: "Números" },
  { id: "hex-decimal", label: "Hexadecimal → decimal", group: "Números" },
  { id: "url-encode", label: "URL encode", group: "Texto" },
  { id: "url-decode", label: "URL decode", group: "Texto" },
  { id: "html-encode", label: "HTML entities encode", group: "Texto" },
  { id: "html-decode", label: "HTML entities decode", group: "Texto" },
  { id: "rot13", label: "ROT13", group: "Cifrado educativo" },
  { id: "rot47", label: "ROT47", group: "Cifrado educativo" },
  { id: "caesar", label: "César (educativo)", group: "Cifrado educativo" },
  { id: "xor", label: "XOR con clave (salida hex)", group: "Cifrado educativo" },
  { id: "reverse", label: "Invertir cadena", group: "Texto" },
  { id: "uppercase", label: "Mayúsculas", group: "Texto" },
  { id: "lowercase", label: "Minúsculas", group: "Texto" },
  { id: "json-pretty", label: "JSON pretty print", group: "JSON" },
  { id: "json-minify", label: "JSON minify", group: "JSON" },
  { id: "json-escape", label: "Escapar cadena JSON", group: "JSON" },
  { id: "json-unescape", label: "Unescape cadena JSON", group: "JSON" },
  { id: "bytes-hex", label: "Bytes UTF-8 → representación hex", group: "Bytes" },
];

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    throw new Error("Base64 inválido: revisa los caracteres y el padding.");
  }
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Los bytes no representan una secuencia UTF-8 válida.");
  }
}

function fromHex(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, "");
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(normalized)) {
    throw new Error("Hexadecimal inválido: usa pares de dígitos hexadecimales.");
  }
  return Uint8Array.from({ length: normalized.length / 2 }, (_, index) =>
    Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16),
  );
}

function rot13(value: string): string {
  return value.replace(/[A-Za-z]/g, (character) => {
    const base = character >= "a" ? 97 : 65;
    return String.fromCharCode(base + ((character.charCodeAt(0) - base + 13) % 26));
  });
}

function rot47(value: string): string {
  return value.replace(/[!-~]/g, (character) =>
    String.fromCharCode(33 + ((character.charCodeAt(0) - 33 + 47) % 94)),
  );
}

function encodeHtmlEntitiesInternal(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function decodeHtmlEntitiesInternal(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
  };
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi, (entity, name: string) => {
    if (!name.startsWith("#")) return named[name.toLowerCase()] ?? entity;
    const isHex = name[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(name.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      throw new Error(`Entidad HTML numérica inválida: ${entity}`);
    }
    return String.fromCodePoint(codePoint);
  });
}

function convertDecimalToHex(value: string): string {
  const values = value.trim().split(/[\s,]+/).filter(Boolean);
  if (!values.length || values.some((entry) => !/^\d+$/.test(entry))) {
    throw new Error("Introduce uno o más enteros decimales separados por espacios o comas.");
  }
  return values.map((entry) => BigInt(entry).toString(16)).join(" ");
}

function convertHexToDecimal(value: string): string {
  const values = value.trim().split(/[\s,]+/).filter(Boolean);
  if (!values.length || values.some((entry) => !/^(?:0x)?[0-9a-f]+$/i.test(entry))) {
    throw new Error("Introduce uno o más enteros hexadecimales separados por espacios o comas.");
  }
  return values.map((entry) => BigInt(entry.startsWith("0x") || entry.startsWith("0X") ? entry : `0x${entry}`).toString(10)).join(" ");
}

export function applyEncodingOperation(
  operation: EncodingOperation,
  value: string,
  options: EncodingOptions = {},
): string {
  switch (operation) {
    case "text-base64":
      return bytesToBase64(encoder.encode(value));
    case "base64-text":
      return decodeUtf8(base64ToBytes(value));
    case "text-base64url":
      return bytesToBase64(encoder.encode(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    case "base64url-text": {
      const encoded = value.trim();
      if (!/^[A-Za-z0-9_-]*={0,2}$/.test(encoded)) {
        throw new Error("Base64 URL-safe inválido: hay caracteres no permitidos.");
      }
      const unpadded = encoded.replace(/=+$/, "");
      if (unpadded.length % 4 === 1 || (encoded.includes("=") && encoded.length % 4 !== 0)) {
        throw new Error("Base64 URL-safe inválido: padding incorrecto.");
      }
      return decodeUtf8(base64ToBytes(unpadded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - unpadded.length % 4) % 4)));
    }
    case "text-hex":
    case "bytes-hex":
      return bytesToHex(encoder.encode(value));
    case "hex-text":
      return decodeUtf8(fromHex(value));
    case "text-binary":
      return Array.from(encoder.encode(value), (byte) => byte.toString(2).padStart(8, "0")).join(" ");
    case "binary-text": {
      const groups = value.trim().split(/\s+/).filter(Boolean);
      if (!groups.length || groups.some((group) => !/^[01]{8}$/.test(group))) {
        throw new Error("Binario inválido: introduce grupos de exactamente 8 bits.");
      }
      return decodeUtf8(Uint8Array.from(groups, (group) => Number.parseInt(group, 2)));
    }
    case "decimal-hex":
      return convertDecimalToHex(value);
    case "hex-decimal":
      return convertHexToDecimal(value);
    case "url-encode":
      return encodeURIComponent(value);
    case "url-decode":
      try {
        return decodeURIComponent(value);
      } catch {
        throw new Error("URL encoding inválido: hay escapes porcentuales incompletos o incorrectos.");
      }
    case "html-encode":
      return encodeHtmlEntitiesInternal(value);
    case "html-decode":
      return decodeHtmlEntitiesInternal(value);
    case "rot13":
      return rot13(value);
    case "rot47":
      return rot47(value);
    case "caesar": {
      const shift = options.shift ?? 0;
      if (!Number.isInteger(shift) || shift < -25 || shift > 25) {
        throw new Error("El desplazamiento César debe ser un entero entre -25 y 25.");
      }
      return value.replace(/[A-Za-z]/g, (character) => {
        const base = character >= "a" ? 97 : 65;
        return String.fromCharCode(base + ((character.charCodeAt(0) - base + shift + 26) % 26));
      });
    }
    case "xor": {
      if (!options.xorKey) throw new Error("Escribe una clave XOR no vacía.");
      const inputBytes = encoder.encode(value);
      const keyBytes = encoder.encode(options.xorKey);
      return bytesToHex(inputBytes.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]));
    }
    case "reverse":
      return Array.from(value).reverse().join("");
    case "uppercase":
      return value.toLocaleUpperCase();
    case "lowercase":
      return value.toLocaleLowerCase();
    case "json-pretty":
      return JSON.stringify(JSON.parse(value), null, 2);
    case "json-minify":
      return JSON.stringify(JSON.parse(value));
    case "json-escape":
      return JSON.stringify(value);
    case "json-unescape": {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed !== "string") throw new Error("La entrada debe ser una cadena JSON entre comillas.");
      return parsed;
    }
  }
}

export function toBase64(value: string): string {
  return applyEncodingOperation("text-base64", value);
}

export function fromBase64(value: string): string {
  return applyEncodingOperation("base64-text", value);
}

export function toHex(value: string): string {
  return applyEncodingOperation("text-hex", value);
}

export function fromHexText(value: string): string {
  return applyEncodingOperation("hex-text", value);
}

export function rot13Text(value: string): string {
  return applyEncodingOperation("rot13", value);
}

export function xorCipher(value: string, key: string): string {
  return applyEncodingOperation("xor", value, { xorKey: key });
}

export function jsonPretty(value: string): string {
  return applyEncodingOperation("json-pretty", value);
}

export function jsonCompact(value: string): string {
  return applyEncodingOperation("json-minify", value);
}

export function toBinary(value: string): string {
  return applyEncodingOperation("text-binary", value);
}

export function fromBinary(value: string): string {
  return applyEncodingOperation("binary-text", value);
}

export function toUrlEncoded(value: string): string {
  return applyEncodingOperation("url-encode", value);
}

export function fromUrlEncoded(value: string): string {
  return applyEncodingOperation("url-decode", value);
}

export function encodeHtmlEntities(value: string): string {
  return applyEncodingOperation("html-encode", value);
}

export function decodeHtmlEntities(value: string): string {
  return applyEncodingOperation("html-decode", value);
}
