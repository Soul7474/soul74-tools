import { describe, expect, it } from "vitest";
import { autodetectUnixTimestamp, convertForensicTimestamp } from "./timestampTools";

describe("forensic timestamp conversion", () => {
  it("converts known epoch offsets to the Unix epoch", () => {
    expect(convertForensicTimestamp("filetime", "116444736000000000").iso).toBe("1970-01-01T00:00:00.000Z");
    expect(convertForensicTimestamp("webkit", "11644473600000000").iso).toBe("1970-01-01T00:00:00.000Z");
    expect(convertForensicTimestamp("dotnet", "621355968000000000").iso).toBe("1970-01-01T00:00:00.000Z");
    expect(convertForensicTimestamp("mac", "0").iso).toBe("2001-01-01T00:00:00.000Z");
  });

  it("rejects invalid counters and flags ambiguous Unix autodetection", () => {
    expect(() => convertForensicTimestamp("filetime", "not-a-number")).toThrow();
    expect(autodetectUnixTimestamp("0")).toMatchObject({ ambiguous: true, iso: "1970-01-01T00:00:00.000Z" });
    expect(autodetectUnixTimestamp("1700000000")).toMatchObject({ ambiguous: false, iso: "2023-11-14T22:13:20.000Z" });
    expect(autodetectUnixTimestamp("1700000000000")).toMatchObject({ ambiguous: false, iso: "2023-11-14T22:13:20.000Z" });
  });
});
