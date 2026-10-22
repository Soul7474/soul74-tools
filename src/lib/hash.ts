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

export type HashFormatGuess = {
  name: string;
  confidence: "probable";
  reason: string;
};

export function identifyHashFormat(value: string): HashFormatGuess[] {
  const input = value.trim();
  const candidates: HashFormatGuess[] = [];
  const addDigestCandidates = (length: number, names: string[]) => {
    if (new RegExp(`^[a-fA-F0-9]{${length}}$`).test(input)) {
      for (const name of names) {
        candidates.push({ name, confidence: "probable", reason: `La longitud de ${length} caracteres hexadecimales es compatible; no confirma el algoritmo.` });
      }
    }
  };

  addDigestCandidates(32, ["MD5", "MD4", "NTLM"]);
  addDigestCandidates(40, ["SHA-1", "RIPEMD-160"]);
  addDigestCandidates(64, ["SHA-256", "SHA3-256", "BLAKE2s-256"]);
  addDigestCandidates(96, ["SHA-384", "SHA3-384"]);
  addDigestCandidates(128, ["SHA-512", "SHA3-512", "BLAKE2b-512", "Whirlpool"]);
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(input)) {
    candidates.push({ name: "bcrypt", confidence: "probable", reason: "Coincide con la estructura habitual de un hash bcrypt." });
  }
  if (/^\$argon2(?:id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/.test(input)) {
    candidates.push({ name: "Argon2", confidence: "probable", reason: "Coincide con la estructura PHC habitual de Argon2." });
  }
  return candidates;
}
