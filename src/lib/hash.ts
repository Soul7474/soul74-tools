export type SupportedDigest = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export const digestAlgorithms: SupportedDigest[] = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"];
export const MAX_HASH_FILE_SIZE = 50 * 1024 * 1024;

export function compareHashes(first: string, second: string): boolean {
  if (!first.trim() || !second.trim()) {
    throw new Error("Introduce ambos hashes para compararlos.");
  }
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireSubtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API no está disponible. Abre la aplicación en un contexto seguro (HTTPS o localhost).");
  }
  return globalThis.crypto.subtle;
}

export async function digestText(algorithm: SupportedDigest, text: string): Promise<string> {
  const subtle = requireSubtleCrypto();
  return toHex(await subtle.digest(algorithm, new TextEncoder().encode(text)));
}

export async function digestFile(algorithm: SupportedDigest, file: File): Promise<string> {
  if (file.size > MAX_HASH_FILE_SIZE) {
    throw new Error(`El archivo supera el límite de 50 MiB. Para obtener el digest del archivo completo, usa una herramienta local con procesamiento por streaming; no se debe calcular el hash por separado de cada parte.`);
  }
  const subtle = requireSubtleCrypto();
  return toHex(await subtle.digest(algorithm, await file.arrayBuffer()));
}

const md5Shifts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const md5Constants = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x1_0000_0000) >>> 0,
);
const crc32Table = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  return crc >>> 0;
});

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function md5Text(text: string): string {
  const input = new TextEncoder().encode(text);
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const message = new Uint8Array(paddedLength);
  message.set(input);
  message[input.length] = 0x80;
  const view = new DataView(message.buffer);
  view.setUint32(paddedLength - 8, (input.length * 8) >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor((input.length * 8) / 0x1_0000_0000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);

  for (let offset = 0; offset < message.length; offset += 64) {
    for (let word = 0; word < 16; word += 1) words[word] = view.getUint32(offset + word * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let functionValue: number;
      let wordIndex: number;
      if (index < 16) {
        functionValue = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        functionValue = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        functionValue = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        functionValue = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }
      const sum = (a + functionValue + md5Constants[index] + words[wordIndex]) >>> 0;
      const shift = md5Shifts[index];
      const rotated = ((sum << shift) | (sum >>> (32 - shift))) >>> 0;
      const nextB = (b + rotated) >>> 0;
      a = d;
      d = c;
      c = b;
      b = nextB;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const result = new Uint8Array(16);
  const resultView = new DataView(result.buffer);
  [a0, b0, c0, d0].forEach((word, index) => resultView.setUint32(index * 4, word, true));
  return bytesToHex(result);
}

export function crc32Text(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export async function hmacText(
  algorithm: SupportedDigest,
  key: string,
  text: string,
): Promise<string> {
  const subtle = requireSubtleCrypto();
  const cryptoKey = await subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(text));
  return toHex(signature);
}

export type HashFormatGuess = {
  name: string;
  confidence: "probable";
  reason: string;
  hashcatMode?: string;
  johnFormat?: string;
};

export function identifyHashFormat(value: string): HashFormatGuess[] {
  const input = value.trim();
  const candidates: HashFormatGuess[] = [];
  const addDigestCandidates = (
    length: number,
    candidatesForLength: Array<{ name: string; hashcatMode?: string; johnFormat?: string }>,
  ) => {
    if (new RegExp(`^[a-fA-F0-9]{${length}}$`).test(input)) {
      for (const candidate of candidatesForLength) {
        candidates.push({
          ...candidate,
          confidence: "probable",
          reason: `La longitud de ${length} caracteres hexadecimales es compatible; no confirma el algoritmo.`,
        });
      }
    }
  };

  addDigestCandidates(32, [
    { name: "MD5", hashcatMode: "0", johnFormat: "raw-md5" },
    { name: "MD4", hashcatMode: "900" },
    { name: "NTLM", hashcatMode: "1000", johnFormat: "NT" },
  ]);
  addDigestCandidates(40, [
    { name: "SHA-1", hashcatMode: "100", johnFormat: "raw-sha1" },
    { name: "RIPEMD-160" },
  ]);
  addDigestCandidates(64, [
    { name: "SHA-256", hashcatMode: "1400", johnFormat: "raw-sha256" },
    { name: "SHA3-256" },
    { name: "BLAKE2s-256" },
  ]);
  addDigestCandidates(96, [
    { name: "SHA-384", hashcatMode: "10800" },
    { name: "SHA3-384" },
  ]);
  addDigestCandidates(128, [
    { name: "SHA-512", hashcatMode: "1700", johnFormat: "raw-sha512" },
    { name: "SHA3-512" },
    { name: "BLAKE2b-512" },
    { name: "Whirlpool" },
  ]);
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(input)) {
    candidates.push({ name: "bcrypt", confidence: "probable", reason: "Coincide con la estructura habitual de un hash bcrypt.", hashcatMode: "3200", johnFormat: "bcrypt" });
  }
  if (/^\$1\$[./A-Za-z0-9]{1,8}\$[./A-Za-z0-9]{22}$/.test(input)) {
    candidates.push({ name: "md5crypt", confidence: "probable", reason: "Coincide con el formato modular md5crypt; no confirma el origen.", hashcatMode: "500", johnFormat: "md5crypt" });
  }
  if (/^\$5\$(?:rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{43}$/.test(input)) {
    candidates.push({ name: "sha256crypt", confidence: "probable", reason: "Coincide con la estructura modular sha256crypt.", hashcatMode: "7400", johnFormat: "sha256crypt" });
  }
  if (/^\$6\$(?:rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{86}$/.test(input)) {
    candidates.push({ name: "sha512crypt", confidence: "probable", reason: "Coincide con la estructura modular sha512crypt.", hashcatMode: "1800", johnFormat: "sha512crypt" });
  }
  if (/^\$argon2(?:id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/.test(input)) {
    candidates.push({ name: "Argon2", confidence: "probable", reason: "Coincide con la estructura PHC habitual de Argon2; no se informa un modo de herramienta por posibles diferencias de soporte." });
  }
  return candidates;
}
