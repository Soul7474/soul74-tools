import { describe, expect, it } from "vitest";
import {
  calculateUmask,
  describeCronExpression,
  getNextCronRuns,
  parseCronExpression,
  parsePermissionMode,
  permissionsToRwx,
  rwxToOctal,
} from "./sysadminTools";

describe("sysadmin tools", () => {
  it("converts symbolic and octal permissions", () => {
    expect(parsePermissionMode("0755")).toMatchObject({ octal: "755", symbolic: "rwxr-xr-x", owner: 7, group: 5, others: 5 });
    expect(parsePermissionMode("rw-r-----")).toMatchObject({ octal: "640", symbolic: "rw-r-----" });
    expect(parsePermissionMode("-rwxr-xr--").octal).toBe("754");
    expect(permissionsToRwx(0o644)).toBe("rw-r--r--");
    expect(rwxToOctal("rwxr-x---")).toBe(0o750);
  });

  it("calculates umask for ordinary files and directories", () => {
    expect(calculateUmask("027")).toEqual({
      mask: "027",
      files: { octal: "640", symbolic: "rw-r-----" },
      directories: { octal: "750", symbolic: "rwxr-x---" },
    });
    expect(calculateUmask("0022").files.octal).toBe("644");
  });

  it("rejects invalid permission and umask input", () => {
    expect(() => parsePermissionMode("888")).toThrow();
    expect(() => parsePermissionMode("rwxr-x")).toThrow();
    expect(() => calculateUmask("089")).toThrow(/octales/);
  });

  it("parses five-field cron syntax and describes common schedules", () => {
    const cron = parseCronExpression("*/15 9-17 * * 1-5");
    expect(cron.minute.values).toEqual(new Set([0, 15, 30, 45]));
    expect(cron.hour.values.has(17)).toBe(true);
    expect(cron.dayOfWeek.values.has(5)).toBe(true);
    expect(describeCronExpression(cron)).toContain("cada 15 minutos");
  });

  it("calculates the next local executions and handles day-of-week 7 as Sunday", () => {
    const from = new Date(2024, 0, 1, 9, 7, 43);
    expect(getNextCronRuns("*/5 * * * *", from, 2).map((date) => [date.getHours(), date.getMinutes()])).toEqual([[9, 10], [9, 15]]);
    const sunday = new Date(2024, 0, 6, 23, 59);
    expect(getNextCronRuns("0 0 * * 7", sunday, 1)[0].getDay()).toBe(0);
  });

  it("reports cron syntax errors clearly", () => {
    expect(() => parseCronExpression("* * * *")).toThrow(/cinco campos/);
    expect(() => parseCronExpression("60 * * * *")).toThrow(/rango/);
    expect(() => parseCronExpression("*/0 * * * *")).toThrow(/paso/);
  });
});
