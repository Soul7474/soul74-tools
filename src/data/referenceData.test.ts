import { describe, expect, it } from "vitest";
import { referenceRecords } from "./referenceData";

describe("local reference database", () => {
  it("derives its total and category counts from unique entries", () => {
    const identifiers = referenceRecords.map((entry) => entry.id);
    const categories = new Set(referenceRecords.map((entry) => entry.category));
    expect(new Set(identifiers).size).toBe(referenceRecords.length);
    expect(categories).toEqual(new Set([
      "Redes",
      "Puertos",
      "HTTP",
      "Hashes",
      "JWT",
      "Codificación",
      "Conceptos",
      "Windows Security Event IDs",
      "Sysmon Event IDs",
      "Syslog Severities",
      "HTTP Security Headers",
      "Hashcat Modes",
    ]));
  });

  it("includes the requested well-known entries with internal related-tool links", () => {
    const byId = new Map(referenceRecords.map((entry) => [entry.id, entry]));
    for (const id of [
      "windows-security-event-4624",
      "windows-security-event-4625",
      "windows-security-event-4688",
      "windows-security-event-4720",
      "windows-security-event-4672",
      "windows-security-event-1102",
      "sysmon-event-1",
      "sysmon-event-3",
      "sysmon-event-22",
      "syslog-severity-0",
      "syslog-severity-7",
      "http-security-header-content-security-policy",
      "hashcat-mode-3200",
    ]) {
      expect(byId.get(id)?.relatedTool).toBeDefined();
    }
    expect(byId.get("windows-security-event-4625")?.details).toContain("Correlaciona");
    expect(byId.get("hashcat-mode-3200")?.details).toContain("no se realiza descifrado");
  });
});
