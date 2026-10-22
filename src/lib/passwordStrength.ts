export type PasswordStrength = "muy débil" | "débil" | "moderada" | "fuerte" | "muy fuerte";

export type PasswordStrengthEstimate = {
  entropyBits: number;
  characterPoolSize: number;
  estimatedCombinations: number;
  strength: PasswordStrength;
  uniqueCharacterRatio: number;
};

export function estimatePasswordStrength(password: string): PasswordStrengthEstimate {
  if (!password) {
    return {
      entropyBits: 0,
      characterPoolSize: 0,
      estimatedCombinations: 1,
      strength: "muy débil",
      uniqueCharacterRatio: 0,
    };
  }

  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 32;
  const uniqueCharacterRatio = new Set(password).size / password.length;
  const entropyBits = Math.max(0, password.length * Math.log2(Math.max(pool, 1)) * uniqueCharacterRatio);
  const strength: PasswordStrength = entropyBits < 28
    ? "muy débil"
    : entropyBits < 36
      ? "débil"
      : entropyBits < 60
        ? "moderada"
        : entropyBits < 80
          ? "fuerte"
          : "muy fuerte";

  return {
    entropyBits,
    characterPoolSize: pool,
    estimatedCombinations: 2 ** Math.min(entropyBits, 1023),
    strength,
    uniqueCharacterRatio,
  };
}
