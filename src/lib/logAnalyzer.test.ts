import { describe, expect, it } from "vitest";
import {
  analyzeStructuredLogs,
  detectLogFormat,
  filterLogEntries,
  parseStructuredLogs,
} from "./logAnalyzer";

describe("structured log analyzer", () => {
  it("detects and parses Apache combined access logs", () => {
    const line = '192.0.2.10 - alice [10/Oct/2000:13:55:36 -0700] "GET /index.html HTTP/1.1" 404 232 "-" "ExampleBrowser/1.0"';
    expect(detectLogFormat(line)).toBe("apache");
    const result = analyzeStructuredLogs(line);
    expect(result.entries[0]).toMatchObject({
      ip: "192.0.2.10",
      user: "alice",
      method: "GET",
      path: "/index.html",
      status: "404",
      userAgent: "ExampleBrowser/1.0",
    });
    expect(result.entries[0].timestamp).toBe(Date.parse("2000-10-10T20:55:36.000Z"));
  });

  it("parses Nginx JSON access logs", () => {
    const input = '{"time_iso8601":"2024-01-02T03:04:05+00:00","remote_addr":"198.51.100.7","request":"POST /login HTTP/1.1","status":401,"http_user_agent":"TestAgent"}';
    expect(detectLogFormat(input)).toBe("nginx");
    const { entries } = parseStructuredLogs(input);
    expect(entries[0]).toMatchObject({ ip: "198.51.100.7", method: "POST", path: "/login", status: "401", userAgent: "TestAgent" });
  });

  it("parses Linux syslog authentication failures", () => {
    const input = "Oct 11 22:14:15 server sshd[123]: Failed password for invalid user admin from 203.0.113.4 port 22 ssh2";
    expect(detectLogFormat(input)).toBe("syslog");
    const { entries } = parseStructuredLogs(input);
    expect(entries[0]).toMatchObject({ ip: "203.0.113.4", user: "admin" });
    expect(entries[0].timestamp).toBeNull();
  });

  it("flags repeated syslog login failures using yearless clock times without fabricating dates", () => {
    const input = [
      "Oct 11 22:14:15 server sshd[1]: Failed password for admin from 203.0.113.4 port 22 ssh2",
      "Oct 11 22:15:15 server sshd[2]: Failed password for admin from 203.0.113.4 port 22 ssh2",
      "Oct 11 22:16:15 server sshd[3]: Failed password for admin from 203.0.113.4 port 22 ssh2",
    ].join("\n");
    const result = analyzeStructuredLogs(input, "syslog", {}, {
      failedLoginThreshold: 3,
      windowMinutes: 10,
      errorStatusThreshold: 10,
      pathTraversalThreshold: 1,
      sqliThreshold: 1,
      xssThreshold: 1,
      scannerThreshold: 1,
    });
    expect(result.entries.every((entry) => entry.timestamp === null)).toBe(true);
    expect(result.heuristics).toContainEqual(expect.objectContaining({
      name: "Varios fallos de autenticación desde una IP",
      count: 3,
      evidence: "203.0.113.4",
    }));
  });

  it("parses Windows Event Viewer CSV and text Event IDs", () => {
    const csv = 'TimeCreated,Event ID,Account Name,IpAddress,Message\n"2024-01-02T03:04:05Z",4625,guest,192.0.2.22,"Failed logon"';
    expect(detectLogFormat(csv)).toBe("windows-csv");
    const csvEntry = parseStructuredLogs(csv).entries[0];
    expect(csvEntry).toMatchObject({ eventId: "4625", user: "guest", ip: "192.0.2.22", message: "Failed logon" });
    expect(filterLogEntries([csvEntry], { status: "4625" })).toHaveLength(1);
    const text = "2024-01-02T03:04:05Z Event ID: 4624 Account Name: analyst";
    expect(detectLogFormat(text)).toBe("windows-text");
    expect(parseStructuredLogs(text).entries[0]).toMatchObject({ eventId: "4624", user: "analyst" });
  });

  it("filters records and derives summaries and heuristic indicators", () => {
    const input = [
      '192.0.2.44 - - [10/Oct/2000:13:55:36 -0700] "GET /../../etc/passwd HTTP/1.1" 404 12 "-" "sqlmap/1.0"',
      '192.0.2.44 - - [10/Oct/2000:13:56:36 -0700] "GET /../../etc/passwd HTTP/1.1" 500 12 "-" "sqlmap/1.0"',
    ].join("\n");
    const result = analyzeStructuredLogs(input, "apache", { method: "GET" }, {
      failedLoginThreshold: 2,
      windowMinutes: 10,
      errorStatusThreshold: 2,
      pathTraversalThreshold: 1,
      sqliThreshold: 1,
      xssThreshold: 1,
      scannerThreshold: 1,
    });
    expect(result.filteredLines).toBe(2);
    expect(result.summary.topIps[0]).toEqual({ value: "192.0.2.44", count: 2 });
    expect(result.summary.topUrls[0].value).toBe("/../../etc/passwd");
    expect(result.summary.histogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(2);
    expect(result.heuristics.map((finding) => finding.name)).toEqual(expect.arrayContaining([
      "Intentos con patrón de path traversal",
      "User-Agent de herramienta de escaneo conocida",
      "Volumen de estados HTTP 4xx/5xx sobre el umbral",
    ]));
    expect(filterLogEntries(result.entries, { status: "500" })).toHaveLength(1);
  });

  it("validates date filters and rejects invalid regular expressions", () => {
    const entry = parseStructuredLogs('192.0.2.1 - - [10/Oct/2000:13:55:36 -0700] "GET / HTTP/1.1" 200 1 "-" "-"', "apache").entries;
    expect(() => filterLogEntries(entry, { from: "bad-date" })).toThrow(/fecha inicial/);
    expect(() => filterLogEntries(entry, { text: "[", regex: true })).toThrow(/regular/);
  });
});
