export type PermissionMode = {
  octal: string;
  symbolic: string;
  owner: number;
  group: number;
  others: number;
};

export type UmaskResult = {
  mask: string;
  files: { octal: string; symbolic: string };
  directories: { octal: string; symbolic: string };
};

export type CronField = {
  values: Set<number>;
  wildcard: boolean;
};

export type ParsedCron = {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
  source: string;
};

const permissionBits = [
  { bit: 4, symbol: "r" },
  { bit: 2, symbol: "w" },
  { bit: 1, symbol: "x" },
] as const;

function modeString(value: number): string {
  return value.toString(8).padStart(3, "0");
}

export function permissionsToRwx(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0o777) throw new Error("El modo debe estar entre 000 y 777.");
  return [6, 3, 0].map((shift) => {
    const digit = (value >> shift) & 7;
    return permissionBits.map(({ bit, symbol }) => digit & bit ? symbol : "-").join("");
  }).join("");
}

export function rwxToOctal(value: string): number {
  const normalized = value.startsWith("-") ? value.slice(1) : value;
  if (!/^(?:[r-][w-][x-]){3}$/.test(normalized)) {
    throw new Error("Introduce permisos de nueve caracteres, por ejemplo rwxr-xr--.");
  }
  const digits = normalized.match(/.{3}/g) ?? [];
  return digits.reduce((mode, group) => {
    const digit = (group[0] === "r" ? 4 : 0) + (group[1] === "w" ? 2 : 0) + (group[2] === "x" ? 1 : 0);
    return mode * 8 + digit;
  }, 0);
}

export function parsePermissionMode(input: string): PermissionMode {
  const value = input.trim();
  const normalized = value.startsWith("-") && value.length === 10 ? value.slice(1) : value;
  if (/^0?[0-7]{3}$/.test(normalized)) {
    const octal = normalized.slice(-3);
    const mode = Number.parseInt(octal, 8);
    return {
      octal,
      symbolic: permissionsToRwx(mode),
      owner: (mode >> 6) & 7,
      group: (mode >> 3) & 7,
      others: mode & 7,
    };
  }
  const mode = rwxToOctal(normalized);
  return {
    octal: modeString(mode),
    symbolic: permissionsToRwx(mode),
    owner: (mode >> 6) & 7,
    group: (mode >> 3) & 7,
    others: mode & 7,
  };
}

function parseUmask(input: string): number {
  const normalized = input.trim().replace(/^0(?=[0-7]{3}$)/, "");
  if (!/^[0-7]{3}$/.test(normalized)) throw new Error("La umask debe tener tres dígitos octales (000–777), por ejemplo 027.");
  return Number.parseInt(normalized, 8);
}

export function calculateUmask(input: string): UmaskResult {
  const mask = parseUmask(input);
  const files = 0o666 & ~mask;
  const directories = 0o777 & ~mask;
  return {
    mask: modeString(mask),
    files: { octal: modeString(files), symbolic: permissionsToRwx(files) },
    directories: { octal: modeString(directories), symbolic: permissionsToRwx(directories) },
  };
}

function parseCronField(source: string, minimum: number, maximum: number, fieldName: string, normalizeSunday = false): CronField {
  if (!source) throw new Error(`Falta el campo ${fieldName}.`);
  const wildcard = source === "*";
  const values = new Set<number>();
  for (const item of source.split(",")) {
    if (!item) throw new Error(`El campo ${fieldName} contiene una lista vacía.`);
    const [rangePart, stepPart, ...extra] = item.split("/");
    if (extra.length) throw new Error(`Sintaxis de paso inválida en el campo ${fieldName}.`);
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1 || step > maximum - minimum + 1) {
      throw new Error(`El paso del campo ${fieldName} debe ser un entero positivo válido.`);
    }
    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = minimum;
      end = maximum;
    } else if (rangePart.includes("-")) {
      const range = rangePart.split("-");
      if (range.length !== 2) throw new Error(`Rango inválido en el campo ${fieldName}.`);
      start = Number(range[0]);
      end = Number(range[1]);
    } else {
      start = Number(rangePart);
      end = stepPart === undefined ? start : maximum;
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < minimum || end > maximum || start > end) {
      throw new Error(`Valor fuera de rango en el campo ${fieldName} (${minimum}–${maximum}).`);
    }
    for (let value = start; value <= end; value += step) {
      values.add(normalizeSunday && value === 7 ? 0 : value);
    }
  }
  return { values, wildcard };
}

export function parseCronExpression(expression: string): ParsedCron {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("La expresión cron debe contener exactamente cinco campos: minuto hora día-del-mes mes día-de-semana.");
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  return {
    minute: parseCronField(minute, 0, 59, "minuto"),
    hour: parseCronField(hour, 0, 23, "hora"),
    dayOfMonth: parseCronField(dayOfMonth, 1, 31, "día del mes"),
    month: parseCronField(month, 1, 12, "mes"),
    dayOfWeek: parseCronField(dayOfWeek, 0, 7, "día de la semana", true),
    source: fields.join(" "),
  };
}

function describeField(field: CronField, unit: string, origin: number): string {
  const values = [...field.values].sort((left, right) => left - right);
  if (field.wildcard && values.length === 60 && unit === "minuto") return "cada minuto";
  if (field.wildcard) return `cada ${unit}`;
  if (values.length === 1) return `${unit} ${values[0]}`;
  const step = values[1] - values[0];
  if (values.length > 2 && step > 1 && values.every((value, index) => index === 0 || value - values[index - 1] === step)) {
    return `cada ${step} ${unit}s`;
  }
  if (values.length === 2) return `${unit}s ${values[0]} y ${values[1]}`;
  if (values.length > 2 && values.every((value, index) => index === 0 || value - values[index - 1] === 1)) {
    return `${unit}s ${values[0]}–${values[values.length - 1]}`;
  }
  return `${unit}s ${values.map((value) => value - origin).join(", ")}`;
}

export function describeCronExpression(cron: ParsedCron): string {
  return `A ${describeField(cron.minute, "minuto", 0)}; a ${describeField(cron.hour, "hora", 0)}; días del mes ${cron.dayOfMonth.wildcard ? "cualquiera" : [...cron.dayOfMonth.values].sort((a, b) => a - b).join(", ")}; meses ${cron.month.wildcard ? "todos" : [...cron.month.values].sort((a, b) => a - b).join(", ")}; días de semana ${cron.dayOfWeek.wildcard ? "cualquiera" : [...cron.dayOfWeek.values].sort((a, b) => a - b).join(", ")}.`;
}

function matchesCronDate(cron: ParsedCron, date: Date): boolean {
  if (!cron.minute.values.has(date.getMinutes()) || !cron.hour.values.has(date.getHours()) || !cron.month.values.has(date.getMonth() + 1)) return false;
  const matchesDayOfMonth = cron.dayOfMonth.values.has(date.getDate());
  const matchesDayOfWeek = cron.dayOfWeek.values.has(date.getDay());
  const dayMatches = cron.dayOfMonth.wildcard
    ? matchesDayOfWeek
    : cron.dayOfWeek.wildcard
      ? matchesDayOfMonth
      : matchesDayOfMonth || matchesDayOfWeek;
  return dayMatches;
}

export function getNextCronRuns(expression: string | ParsedCron, from = new Date(), count = 5): Date[] {
  const cron = typeof expression === "string" ? parseCronExpression(expression) : expression;
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Solicita entre 1 y 20 próximas ejecuciones.");
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const results: Date[] = [];
  const maxMinutes = 366 * 24 * 60 * 2;
  for (let checked = 0; checked < maxMinutes && results.length < count; checked += 1) {
    if (matchesCronDate(cron, cursor)) results.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  if (results.length < count) throw new Error("No se pudieron calcular suficientes ejecuciones en los próximos dos años.");
  return results;
}
