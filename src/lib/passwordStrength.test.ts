import { describe, expect, it } from "vitest";
import { estimatePasswordStrength } from "./passwordStrength";

describe("password strength estimate", () => {
  it("uses local character classes and repetition as rough indicators", () => {
    const simple = estimatePasswordStrength("aaaaaaaaaaaa");
    const diverse = estimatePasswordStrength("A1!bcDE2gh");
    expect(simple.strength).toBe("muy débil");
    expect(simple.entropyBits).toBeLessThan(diverse.entropyBits);
    expect(diverse.characterPoolSize).toBe(94);
    expect(diverse.entropyBits).toBeGreaterThan(40);
  });

  it("returns a zero estimate for empty input", () => {
    expect(estimatePasswordStrength("")).toMatchObject({
      entropyBits: 0,
      estimatedCombinations: 1,
      strength: "muy débil",
    });
  });
});
