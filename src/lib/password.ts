export type CharacterSet = "lowercase" | "uppercase" | "numbers" | "symbols";

export const characterSets: Record<CharacterSet, string> = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}:,.?",
};

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 256) {
    throw new Error("Rango aleatorio no válido.");
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Este navegador no ofrece un generador criptográfico seguro.");
  }

  const limit = Math.floor(256 / maxExclusive) * maxExclusive;
  const randomBytes = new Uint8Array(1);
  do {
    globalThis.crypto.getRandomValues(randomBytes);
  } while (randomBytes[0] >= limit);
  return randomBytes[0] % maxExclusive;
}

export function generatePassword(length: number, selectedSets: CharacterSet[]): string {
  const chosenSets = selectedSets.filter((set) => Boolean(characterSets[set]));
  const alphabet = [...new Set(chosenSets.flatMap((set) => [...characterSets[set]]))];
  if (!alphabet.length) {
    throw new Error("Selecciona al menos un tipo de carácter.");
  }
  if (length < 8 || length > 128) {
    throw new Error("La longitud debe estar entre 8 y 128 caracteres.");
  }

  const password: string[] = [];
  for (const set of chosenSets) {
    const setChars = characterSets[set];
    password.push(setChars[secureRandomInt(setChars.length)]);
  }

  while (password.length < length) {
    password.push(alphabet[secureRandomInt(alphabet.length)]);
  }

  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join("");
}

export function generatePassphrase(wordCount: number): string {
  const words = [
    "atlas", "ember", "north", "signal", "oxide", "harbor", "relay", "cipher", "solstice", "aurora",
    "storm", "vector", "saffron", "matrix", "beacon", "horizon", "fusion", "ember", "nexus", "shadow",
    "drift", "vortex", "thunder", "silver", "coastal", "spectrum", "prism", "wicked", "motive", "wizard",
  ];

  const count = Math.max(3, Math.min(8, wordCount));
  const elements: string[] = [];
  for (let index = 0; index < count; index += 1) {
    elements.push(words[secureRandomInt(words.length)]);
  }

  return elements.join("-");
}

export function analyzePassword(password: string): { score: number; label: string; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (password.length >= 12) {
    score += 30;
  } else if (password.length >= 8) {
    score += 15;
    reasons.push("Longitud moderada");
  } else {
    reasons.push("Demasiado corta");
  }

  if (/[a-z]/.test(password)) score += 15;
  else reasons.push("Falta minúsculas");
  if (/[A-Z]/.test(password)) score += 15;
  else reasons.push("Falta mayúsculas");
  if (/\d/.test(password)) score += 15;
  else reasons.push("Falta números");
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  else reasons.push("Falta símbolos");

  if (/(.)\1{2,}/.test(password)) {
    reasons.push("Repeticiones detectadas");
    score -= 15;
  }
  if (/123|abc|password|qwerty/i.test(password)) {
    reasons.push("Patrón común detectado");
    score -= 20;
  }

  const label = score >= 70 ? "Fuerte" : score >= 45 ? "Media" : "Débil";
  return { score: Math.max(0, Math.min(100, score)), label, reasons: reasons.length ? reasons : ["Sin señales de riesgo obvio"] };
}

export function createUuid(): string {
  if (!globalThis.crypto?.randomUUID) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = secureRandomInt(16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }
  return globalThis.crypto.randomUUID();
}

export function randomBytesHex(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
