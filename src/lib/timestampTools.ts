export const MAX_JAVASCRIPT_DATE_MS = 8.64e15;

export type TimestampUnit = "seconds" | "milliseconds";

export type UnixTimestampResult = {
  original: string;
  unit: TimestampUnit;
  milliseconds: number;
  date: Date;
  iso: string;
  utc: string;
  local: string;
  weekdayUtc: string;
  partsUtc: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
  };
};

export type LocalDateTimeResult = {
  date: Date;
  iso: string;
  local: string;
  milliseconds: number;
  seconds: number;
  warning: string;
};

export type IsoTimestampResult = {
  date: Date;
  iso: string;
  utc: string;
  local: string;
  milliseconds: number;
  seconds: number;
  offset: string;
  timezoneKind: "explicit" | "local-assumed";
  warning: string;
};

export type TimeDifference = {
  earlier: Date;
  later: Date;
  differenceMs: number;
  differenceSeconds: number;
  differenceMinutes: number;
  differenceHours: number;
  differenceDays: number;
  breakdown: { days: number; hours: number; minutes: number; seconds: number; milliseconds: number };
};

type DateTimeParts = [year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number];

function parseNumeric(value: string): number {
  const trimmed = value.trim();
  if (!trimmed || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) {
    throw new Error("Introduce un timestamp numérico válido.");
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) throw new Error("El timestamp debe ser un número finito.");
  return parsed;
}

function validateDateRange(milliseconds: number): Date {
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > MAX_JAVASCRIPT_DATE_MS) {
    throw new Error("La fecha está fuera del rango admitido por JavaScript Date.");
  }
  const date = new Date(milliseconds);
  if (!Number.isFinite(date.getTime())) throw new Error("No se puede representar la fecha con JavaScript Date.");
  return date;
}

export function unixTimestampToDate(value: string, unit: TimestampUnit): UnixTimestampResult {
  const parsed = parseNumeric(value);
  const milliseconds = unit === "seconds" ? parsed * 1000 : parsed;
  const date = validateDateRange(milliseconds);
  return {
    original: value.trim(),
    unit,
    milliseconds,
    date,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    weekdayUtc: new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date),
    partsUtc: {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      millisecond: date.getUTCMilliseconds(),
    },
  };
}

function parseDateTimeParts(value: string): DateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!match) {
    throw new Error("Fecha inválida: usa YYYY-MM-DDTHH:mm, como el formato datetime-local.");
  }
  const [year, month, day, hour, minute, second = "0", fraction = ""] = match.slice(1);
  const parts: DateTimeParts = [
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number((fraction + "000").slice(0, 3)),
  ];
  const [y, m, d, h, min, sec] = parts;
  const calendar = new Date(0);
  calendar.setUTCFullYear(y, m - 1, d);
  calendar.setUTCHours(h, min, sec, parts[6]);
  if (
    m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 || sec > 59
    || calendar.getUTCFullYear() !== y || calendar.getUTCMonth() !== m - 1 || calendar.getUTCDate() !== d
    || calendar.getUTCHours() !== h || calendar.getUTCMinutes() !== min || calendar.getUTCSeconds() !== sec
  ) {
    throw new Error("La fecha y la hora contienen componentes fuera de rango.");
  }
  return parts;
}

function sameLocalParts(date: Date, parts: DateTimeParts): boolean {
  return date.getFullYear() === parts[0]
    && date.getMonth() + 1 === parts[1]
    && date.getDate() === parts[2]
    && date.getHours() === parts[3]
    && date.getMinutes() === parts[4]
    && date.getSeconds() === parts[5]
    && date.getMilliseconds() === parts[6];
}

function detectLocalTimeAmbiguity(parts: DateTimeParts): "ambiguous" | "nonexistent" | "ordinary" {
  const [year, month, day, hour, minute, second, millisecond] = parts;
  const wallTime = new Date(0);
  wallTime.setUTCFullYear(year, month - 1, day);
  wallTime.setUTCHours(hour, minute, second, millisecond);
  const candidateInstants = new Set<number>();
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 3) {
    offsets.add(new Date(wallTime.getTime() + hours * 60 * 60 * 1000).getTimezoneOffset());
  }
  for (const offset of offsets) {
    const candidate = new Date(wallTime.getTime() + offset * 60_000);
    if (sameLocalParts(candidate, parts)) candidateInstants.add(candidate.getTime());
  }
  if (candidateInstants.size === 0) return "nonexistent";
  if (candidateInstants.size > 1) return "ambiguous";
  return "ordinary";
}

export function localDateTimeToTimestamp(value: string): LocalDateTimeResult {
  const parts = parseDateTimeParts(value);
  const date = new Date(0);
  date.setFullYear(parts[0], parts[1] - 1, parts[2]);
  date.setHours(parts[3], parts[4], parts[5], parts[6]);
  if (!sameLocalParts(date, parts)) {
    throw new Error("Esta hora local no existe en la zona horaria del dispositivo, probablemente por un cambio de horario. Elige otra hora o proporciona una fecha con offset explícito.");
  }
  const ambiguity = detectLocalTimeAmbiguity(parts);
  const warning = ambiguity === "ambiguous"
    ? "Esta hora local puede ocurrir dos veces durante un cambio de horario. datetime-local no incluye zona ni offset y el navegador elige una interpretación."
    : "datetime-local no incluye zona horaria; se interpreta en la zona local del dispositivo. El resultado no representa una entrada UTC.";
  return {
    date,
    iso: date.toISOString(),
    local: date.toString(),
    milliseconds: date.getTime(),
    seconds: date.getTime() / 1000,
    warning,
  };
}

function validateCalendarDate(year: number, month: number, day: number): void {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (month < 1 || month > 12 || day < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("La fecha ISO contiene una fecha de calendario inválida.");
  }
}

export function parseIsoTimestamp(value: string): IsoTimestampResult {
  const input = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?)?$/i.exec(input);
  if (!match) {
    throw new Error("Formato no reconocido. Usa ISO 8601 como 2025-03-08T12:30:00Z, con offset, o una fecha sin zona.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  validateCalendarDate(year, month, day);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error("La hora ISO contiene componentes fuera de rango.");
  }
  const zone = match[8] ?? "";
  if (zone && zone.toUpperCase() !== "Z") {
    const offset = /^([+-])(\d{2}):(\d{2})$/.exec(zone);
    if (!offset || Number(offset[2]) > 23 || Number(offset[3]) > 59) {
      throw new Error("El offset ISO debe tener el formato ±HH:MM.");
    }
  }
  const isDateOnly = match[4] === undefined;
  const dateTimeInput = isDateOnly
    ? `${match[1]}-${match[2]}-${match[3]}T00:00`
    : `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] ?? "00"}${match[7] ? `.${match[7].slice(0, 3)}` : ""}`;

  let date: Date;
  let timezoneKind: IsoTimestampResult["timezoneKind"];
  let warning: string;
  const precisionWarning = (match[7]?.length ?? 0) > 3
    ? " La precisión superior a milisegundos se ha truncado porque JavaScript Date solo representa milisegundos."
    : "";
  if (zone) {
    date = validateDateRange(Date.parse(input));
    timezoneKind = "explicit";
    warning = `La zona u offset explícito define el instante representado.${precisionWarning}`;
  } else {
    const localResult = localDateTimeToTimestamp(dateTimeInput);
    date = localResult.date;
    timezoneKind = "local-assumed";
    warning = `No hay zona horaria explícita. Se interpretó como hora local: ${localResult.warning}${precisionWarning}`;
  }
  return {
    date,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    milliseconds: date.getTime(),
    seconds: date.getTime() / 1000,
    offset: zone || "sin offset explícito",
    timezoneKind,
    warning,
  };
}

export function calculateTimeDifference(first: Date, second: Date): TimeDifference {
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(second.getTime())) {
    throw new Error("Ambas fechas deben ser válidas.");
  }
  const differenceMs = Math.abs(second.getTime() - first.getTime());
  let remaining = differenceMs;
  const days = Math.floor(remaining / 86_400_000);
  remaining -= days * 86_400_000;
  const hours = Math.floor(remaining / 3_600_000);
  remaining -= hours * 3_600_000;
  const minutes = Math.floor(remaining / 60_000);
  remaining -= minutes * 60_000;
  const seconds = Math.floor(remaining / 1000);
  remaining -= seconds * 1000;
  return {
    earlier: first.getTime() <= second.getTime() ? first : second,
    later: first.getTime() <= second.getTime() ? second : first,
    differenceMs,
    differenceSeconds: differenceMs / 1000,
    differenceMinutes: differenceMs / 60_000,
    differenceHours: differenceMs / 3_600_000,
    differenceDays: differenceMs / 86_400_000,
    breakdown: { days, hours, minutes, seconds, milliseconds: remaining },
  };
}

export function convertEpochValue(value: string, direction: "seconds-to-milliseconds" | "milliseconds-to-seconds"): {
  original: string;
  converted: number;
  wholeSeconds: number;
  remainderMilliseconds: number;
  date: Date;
  iso: string;
} {
  const numeric = parseNumeric(value);
  const milliseconds = direction === "seconds-to-milliseconds" ? numeric * 1000 : numeric;
  const date = validateDateRange(milliseconds);
  const converted = direction === "seconds-to-milliseconds" ? milliseconds : numeric / 1000;
  const wholeSeconds = Math.trunc(milliseconds / 1000);
  return {
    original: value.trim(),
    converted,
    wholeSeconds,
    remainderMilliseconds: milliseconds - wholeSeconds * 1000,
    date,
    iso: date.toISOString(),
  };
}

export function formatInTimeZone(date: Date, timeZone: string): { formatted: string; offset: string } {
  if (!Number.isFinite(date.getTime())) throw new Error("La fecha no es válida.");
  let formatted: string;
  let offset: string;
  try {
    formatted = new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
      timeStyle: "long",
      timeZone,
    }).format(date);
    offset = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
      hour: "2-digit",
    }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "Offset no disponible";
  } catch {
    throw new Error(`La zona horaria IANA "${timeZone}" no es válida o no está disponible en este navegador.`);
  }
  return { formatted, offset };
}
