import { describe, expect, it } from "vitest";
import { crc32Text, hmacText, identifyHashFormat, md5Text } from "./hash";

describe("legacy checksum compatibility", () => {
  it("matches standard MD5 vectors including multi-block and UTF-8 inputs", () => {
    expect(md5Text("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5Text("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(md5Text("The quick brown fox jumps over the lazy dog")).toBe("9e107d9d372bb6826bd81d3542a419d6");
  });

  it("matches the standard CRC-32 check value", () => {
    expect(crc32Text("123456789")).toBe("cbf43926");
  });

  it("matches RFC HMAC test vectors using Web Crypto", async () => {
    expect(await hmacText("SHA-256", "Jefe", "what do ya want for nothing?"))
      .toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
    expect(await hmacText("SHA-1", "Jefe", "what do ya want for nothing?"))
      .toBe("effcdf6ae5eb2fa2d27416d5f184df9c259a7c79");
  });
});

describe("heuristic hash format identification", () => {
  it("reports ambiguity and known modes for raw digest lengths", () => {
    const candidates = identifyHashFormat("900150983cd24fb0d6963f7d28e17f72");
    expect(candidates.map((candidate) => candidate.name)).toContain("MD5");
    expect(candidates.map((candidate) => candidate.name)).toContain("NTLM");
    expect(candidates.find((candidate) => candidate.name === "MD5")?.hashcatMode).toBe("0");
    expect(candidates.find((candidate) => candidate.name === "NTLM")?.hashcatMode).toBe("1000");
  });

  it("recognizes common modular formats without implying verification", () => {
    expect(identifyHashFormat(`$2b$12$${"a".repeat(53)}`)[0]).toMatchObject({ name: "bcrypt", hashcatMode: "3200", johnFormat: "bcrypt" });
    expect(identifyHashFormat(`$6$salt$${"a".repeat(86)}`)[0]).toMatchObject({ name: "sha512crypt", hashcatMode: "1800", johnFormat: "sha512crypt" });
    expect(identifyHashFormat("$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$YWJj")).toMatchObject([{ name: "Argon2", confidence: "probable" }]);
  });
});
