import { describe, expect, it } from "vitest";
import {
  analyzeIocs,
  defangIocText,
  formatIocsCsv,
  formatIocsText,
  iocsByCategory,
  refangIocText,
} from "./iocAnalyzer";

describe("IOC Analyzer", () => {
  it("refangs common defanged indicators and extracts supported categories", () => {
    const analysis = analyzeIocs("hxxps://example[.]org/a 192.168.1.10 2001:db8::1 analyst[at]example.org CVE-2024-12345 d41d8cd98f00b204e9800998ecf8427e");

    expect(analysis.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "url", value: "https://example.org/a" }),
      expect.objectContaining({ category: "ipv4", value: "192.168.1.10", ipClassification: "privada" }),
      expect.objectContaining({ category: "ipv6", value: "2001:db8::1", ipClassification: "reservada" }),
      expect.objectContaining({ category: "email", value: "analyst@example.org" }),
      expect.objectContaining({ category: "cve", value: "CVE-2024-12345" }),
      expect.objectContaining({ category: "hash", value: "d41d8cd98f00b204e9800998ecf8427e" }),
    ]));
  });

  it("classifies IPv4 indicators locally and deduplicates case-insensitively", () => {
    const analysis = analyzeIocs("10.0.0.1 10.0.0.1 127.0.0.1 169.254.1.2 8.8.8.8");
    expect(analysis.counts.ipv4).toBe(4);
    expect(iocsByCategory(analysis, "ipv4")).toEqual(["10.0.0.1", "127.0.0.1", "169.254.1.2", "8.8.8.8"]);
    expect(analysis.records.map((record) => record.ipClassification)).toEqual(["privada", "loopback", "link-local", "pública"]);
  });

  it("extracts paths and exports structured CSV and text", () => {
    const analysis = analyzeIocs("Read C:\\Windows\\System32\\drivers\\etc\\hosts and /var/log/auth.log");
    expect(analysis.counts.path).toBe(2);
    expect(formatIocsCsv(analysis.records)).toContain('"path","C:\\Windows\\System32\\drivers\\etc\\hosts"');
    expect(formatIocsText(analysis.records)).toContain("PATH\t/var/log/auth.log");
  });

  it("does not treat a URL authority as a Unix file path", () => {
    const analysis = analyzeIocs("https://example.org");
    expect(analysis.counts.url).toBe(1);
    expect(analysis.counts.path).toBe(0);
  });

  it("defangs and refangs supported notation", () => {
    expect(refangIocText("hxxp://example[.]org user[at]example[.]org")).toBe("http://example.org user@example.org");
    expect(defangIocText("https://example.org user@example.org")).toBe("hxxps://example[.]org user[at]example[.]org");
  });

  it("rejects input over the explicit processing limit", () => {
    expect(() => analyzeIocs("x".repeat(1_000_001))).toThrow(/límite/);
  });
});
