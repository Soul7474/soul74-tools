import { useEffect, useState } from "react";
import { copyToClipboard } from "../lib/feedback";
import { SectionHeader } from "../components/SectionHeader";
import {
  calculateTimeDifference,
  autodetectUnixTimestamp,
  convertForensicTimestamp,
  convertEpochValue,
  formatInTimeZone,
  localDateTimeToTimestamp,
  parseIsoTimestamp,
  unixTimestampToDate,
  type IsoTimestampResult,
  type ForensicTimestampKind,
  type ForensicTimestampResult,
  type LocalDateTimeResult,
  type TimeDifference,
  type TimestampUnit,
  type UnixTimestampResult,
} from "../lib/timestampTools";

type TimestampTab = "unix" | "date" | "iso" | "difference" | "zones" | "epoch" | "forensic" | "clock";

const tabs: Array<{ id: TimestampTab; label: string }> = [
  { id: "unix", label: "Unix → fecha" },
  { id: "date", label: "Fecha → Unix" },
  { id: "iso", label: "ISO 8601" },
  { id: "difference", label: "Diferencias" },
  { id: "zones", label: "Zonas horarias" },
  { id: "epoch", label: "Epoch avanzado" },
  { id: "forensic", label: "Forense" },
  { id: "clock", label: "Reloj" },
];

const zones = ["UTC", "Europe/Madrid", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"];

function copyText(value: string): Promise<void> {
  return copyToClipboard(value, "Timestamp");
}

function ResultValue({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  return <div className="timestamp-value"><span>{label}</span><strong className={mono ? "mono-value" : ""}>{value}</strong></div>;
}

function TimestampResults({
  values,
  onCopy,
  copyValue,
}: {
  values: Array<[string, string | number]>;
  onCopy?: (value: string) => void;
  copyValue?: string;
}) {
  return (
    <div className="timestamp-results">
      {values.map(([label, value]) => <ResultValue label={label} value={value} key={label} />)}
      {onCopy && values.length > 0 && <button type="button" className="secondary-button" onClick={() => onCopy(copyValue ?? String(values[0][1]))}>Copiar resultado</button>}
    </div>
  );
}

function ClockPanel() {
  const [now, setNow] = useState(() => new Date());
  const [message, setMessage] = useState("");

  useEffect(() => {
    const interval = globalThis.setInterval(() => setNow(new Date()), 1000);
    return () => globalThis.clearInterval(interval);
  }, []);

  async function copyEpoch() {
    try {
      await copyText(String(Math.floor(now.getTime() / 1000)));
      setMessage("Timestamp actual copiado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo copiar.");
    }
  }

  return (
    <div className="clock-grid">
      <section className="panel clock-card">
        <div className="eyebrow"><span className="eyebrow-line" /> UTC CLOCK</div>
        <strong className="clock-display">{now.toISOString().slice(11, 19)}</strong>
        <span className="clock-date">{now.toISOString().slice(0, 10)} UTC</span>
      </section>
      <section className="panel clock-card local-clock-card">
        <div className="eyebrow"><span className="eyebrow-line violet-line" /> LOCAL CLOCK</div>
        <strong className="clock-display">{now.toLocaleTimeString()}</strong>
        <span className="clock-date">{now.toLocaleDateString()} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
      </section>
      <section className="panel clock-epoch-panel">
        <span className="panel-kicker">CURRENT UNIX TIMESTAMP</span>
        <strong className="clock-epoch">{Math.floor(now.getTime() / 1000)}</strong>
        <button type="button" className="secondary-button" onClick={() => void copyEpoch()}>Copiar timestamp</button>
        {message && <p className="microcopy" role="status">{message}</p>}
        <span className="clock-refresh"><i /> Refresco del reloj del sistema · 1 s</span>
      </section>
    </div>
  );
}

export function TimestampSection() {
  const [tab, setTab] = useState<TimestampTab>("unix");
  const [unixValue, setUnixValue] = useState("");
  const [unixUnit, setUnixUnit] = useState<TimestampUnit>("seconds");
  const [unixResult, setUnixResult] = useState<UnixTimestampResult | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [dateResult, setDateResult] = useState<LocalDateTimeResult | null>(null);
  const [isoValue, setIsoValue] = useState("");
  const [isoResult, setIsoResult] = useState<IsoTimestampResult | null>(null);
  const [firstDate, setFirstDate] = useState("");
  const [secondDate, setSecondDate] = useState("");
  const [difference, setDifference] = useState<TimeDifference | null>(null);
  const [zoneDate, setZoneDate] = useState("");
  const [zone, setZone] = useState("Europe/Madrid");
  const [customZone, setCustomZone] = useState("");
  const [zoneResult, setZoneResult] = useState<{ formatted: string; offset: string; localResult: LocalDateTimeResult } | null>(null);
  const [epochValue, setEpochValue] = useState("");
  const [epochDirection, setEpochDirection] = useState<"seconds-to-milliseconds" | "milliseconds-to-seconds">("seconds-to-milliseconds");
  const [epochResult, setEpochResult] = useState<ReturnType<typeof convertEpochValue> | null>(null);
  const [logDateValue, setLogDateValue] = useState("");
  const [logDateResult, setLogDateResult] = useState<IsoTimestampResult | null>(null);
  const [forensicKind, setForensicKind] = useState<ForensicTimestampKind | "auto">("filetime");
  const [forensicValue, setForensicValue] = useState("116444736000000000");
  const [forensicResult, setForensicResult] = useState<ForensicTimestampResult | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeZone = customZone.trim() || zone;

  async function copy(value: string, label: string) {
    try {
      await copyToClipboard(value, label);
      setMessage(`${label} copiado.`);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo copiar.");
    }
  }

  function runUnixConversion() {
    setError("");
    setMessage("");
    try {
      setUnixResult(unixTimestampToDate(unixValue, unixUnit));
    } catch (reason) {
      setUnixResult(null);
      setError(reason instanceof Error ? reason.message : "No se pudo convertir el timestamp.");
    }
  }

  function runDateConversion() {
    setError("");
    setMessage("");
    try {
      setDateResult(localDateTimeToTimestamp(dateValue));
    } catch (reason) {
      setDateResult(null);
      setError(reason instanceof Error ? reason.message : "No se pudo interpretar la fecha local.");
    }
  }

  function runIsoConversion() {
    setError("");
    setMessage("");
    try {
      setIsoResult(parseIsoTimestamp(isoValue));
    } catch (reason) {
      setIsoResult(null);
      setError(reason instanceof Error ? reason.message : "No se pudo interpretar la fecha ISO.");
    }
  }

  function runDifference() {
    setError("");
    try {
      const first = localDateTimeToTimestamp(firstDate).date;
      const second = localDateTimeToTimestamp(secondDate).date;
      setDifference(calculateTimeDifference(first, second));
    } catch (reason) {
      setDifference(null);
      setError(reason instanceof Error ? reason.message : "No se pudieron comparar las fechas.");
    }
  }

  function runZoneConversion() {
    setError("");
    setMessage("");
    try {
      const localResult = localDateTimeToTimestamp(zoneDate);
      const formatted = formatInTimeZone(localResult.date, activeZone);
      setZoneResult({ ...formatted, localResult });
    } catch (reason) {
      setZoneResult(null);
      setError(reason instanceof Error ? reason.message : "No se pudo convertir la zona horaria.");
    }
  }

  function runEpochConversion() {
    setError("");
    setMessage("");
    try {
      setEpochResult(convertEpochValue(epochValue, epochDirection));
    } catch (reason) {
      setEpochResult(null);
      setError(reason instanceof Error ? reason.message : "No se pudo convertir el valor epoch.");
    }
  }

  function runLogDateConversion() {
    setError("");
    try {
      setLogDateResult(parseIsoTimestamp(logDateValue));
    } catch (reason) {
      setLogDateResult(null);
      setError(reason instanceof Error ? reason.message : "No se pudo convertir la fecha del log.");
    }
  }

  function runForensicConversion() {
    setError("");
    setForensicResult(null);
    try {
      setForensicResult(forensicKind === "auto"
        ? autodetectUnixTimestamp(forensicValue)
        : convertForensicTimestamp(forensicKind, forensicValue));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo interpretar el timestamp.");
    }
  }

  function clearCurrent() {
    setError("");
    setMessage("");
    setUnixResult(null);
    setDateResult(null);
    setIsoResult(null);
    setDifference(null);
    setZoneResult(null);
    setEpochResult(null);
    setLogDateResult(null);
    setForensicResult(null);
  }

  return (
    <section className="page-view tool-page lab-page timestamp-page">
      <SectionHeader eyebrow={<><span className="eyebrow-line" /> TIME / EPOCH / CORRELATION</>} title={<>Timestamp <span>lab.</span></>} description="Convierte y compara instantes con zona explícita cuando se conoce; todo se calcula localmente." status="SYSTEM CLOCK" />

      <nav className="text-tabs timestamp-tabs" role="tablist" aria-label="Herramientas de tiempo">
        {tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} className={`text-tab ${tab === item.id ? "active" : ""}`} key={item.id} onClick={() => { setTab(item.id); setError(""); setMessage(""); }}>{item.label}</button>)}
      </nav>

      {error && <p className="error-message timestamp-message" role="alert">{error}</p>}
      {message && <p className="status-message status-success timestamp-message" role="status">{message}</p>}
      {tab !== "clock" && <div className="timestamp-actions"><button type="button" className="text-button" onClick={clearCurrent}>LIMPIAR RESULTADOS</button></div>}

      {tab === "unix" && (
        <section className="panel timestamp-panel">
          <div className="panel-heading"><div><span className="panel-kicker">01 / UNIX → DATE</span><h2>Conversor Unix timestamp</h2></div><span className="panel-icon cyan-icon">UTC</span></div>
          <div className="timestamp-input-grid">
            <label className="encoding-pane"><span className="pane-heading">TIMESTAMP</span><input className="field-input mono-input" inputMode="decimal" value={unixValue} onChange={(event) => setUnixValue(event.target.value)} placeholder="0" aria-label="Unix timestamp" /></label>
            <label className="encoding-pane"><span className="pane-heading">UNIDAD EXPLÍCITA</span><select className="field-input" value={unixUnit} onChange={(event) => setUnixUnit(event.target.value === "milliseconds" ? "milliseconds" : "seconds")}><option value="seconds">Segundos</option><option value="milliseconds">Milisegundos</option></select></label>
          </div>
          <button type="button" className="primary-button" onClick={runUnixConversion}>Convertir a fecha</button>
          {unixResult && <TimestampResults values={[
            ["Timestamp original", `${unixResult.original} ${unixResult.unit === "seconds" ? "s" : "ms"}`],
            ["Fecha / hora UTC", unixResult.utc],
            ["Fecha / hora local", unixResult.local],
            ["ISO 8601", unixResult.iso],
            ["Día de la semana (UTC)", unixResult.weekdayUtc],
            ["UTC — año / mes / día", `${unixResult.partsUtc.year} / ${String(unixResult.partsUtc.month).padStart(2, "0")} / ${String(unixResult.partsUtc.day).padStart(2, "0")}`],
            ["UTC — hora", `${String(unixResult.partsUtc.hour).padStart(2, "0")}:${String(unixResult.partsUtc.minute).padStart(2, "0")}:${String(unixResult.partsUtc.second).padStart(2, "0")}.${String(unixResult.partsUtc.millisecond).padStart(3, "0")}`],
            ["Timestamp convertido (ms)", unixResult.milliseconds],
          ]} copyValue={String(unixResult.milliseconds)} onCopy={(value) => void copy(value, "Timestamp")} />}
        </section>
      )}

      {tab === "date" && (
        <section className="panel timestamp-panel">
          <div className="panel-heading"><div><span className="panel-kicker">02 / LOCAL DATE → UNIX</span><h2>Fecha a timestamp</h2></div><span className="panel-icon violet-icon">ISO</span></div>
          <label className="encoding-pane"><span className="pane-heading">FECHA Y HORA LOCAL DEL DISPOSITIVO</span><input type="datetime-local" step="0.001" className="field-input" value={dateValue} onChange={(event) => setDateValue(event.target.value)} /></label>
          <button type="button" className="primary-button" onClick={runDateConversion}>Convertir fecha</button>
          <p className="notice notice-warning">datetime-local no incluye zona horaria. Se interpreta usando la zona local del dispositivo, no UTC. En horas ambiguas de cambio de horario el navegador elige una interpretación; las horas inexistentes se rechazan.</p>
          {dateResult && <><TimestampResults values={[
            ["Fecha/hora seleccionada (local)", dateResult.local],
            ["Timestamp Unix (segundos)", dateResult.seconds],
            ["Timestamp Unix (milisegundos)", dateResult.milliseconds],
            ["ISO 8601 UTC", dateResult.iso],
            ["Representación UTC", dateResult.date.toUTCString()],
          ]} copyValue={String(dateResult.milliseconds)} onCopy={(value) => void copy(value, "Timestamp")} /><p className="microcopy">{dateResult.warning}</p></>}
        </section>
      )}

      {tab === "iso" && (
        <section className="panel timestamp-panel">
          <div className="panel-heading"><div><span className="panel-kicker">03 / ISO 8601</span><h2>Interpretar fecha ISO</h2></div><span className="panel-icon cyan-icon">Z / ±HH:MM</span></div>
          <label className="encoding-pane"><span className="pane-heading">ISO 8601</span><input className="field-input mono-input" value={isoValue} onChange={(event) => setIsoValue(event.target.value)} placeholder="2025-03-08T12:30:00+01:00" /></label>
          <button type="button" className="primary-button" onClick={runIsoConversion}>Interpretar fecha</button>
          {isoResult && <><div className="timestamp-results">
            <ResultValue label="Fecha UTC" value={isoResult.utc} />
            <ResultValue label="Fecha local del dispositivo" value={isoResult.local} />
            <ResultValue label="ISO normalizado a UTC" value={isoResult.iso} />
            <ResultValue label="Offset de entrada" value={isoResult.offset} />
            <ResultValue label="Tipo de zona" value={isoResult.timezoneKind === "explicit" ? "Explícita" : "Local asumida"} />
            <ResultValue label="Unix (segundos)" value={isoResult.seconds} />
            <ResultValue label="Unix (milisegundos)" value={isoResult.milliseconds} />
            <button type="button" className="secondary-button" onClick={() => void copy(String(isoResult.milliseconds), "Timestamp")}>Copiar timestamp</button>
          </div><p className={`notice ${isoResult.timezoneKind === "local-assumed" ? "notice-warning" : ""}`}>{isoResult.warning}</p></>}
        </section>
      )}

      {tab === "difference" && (
        <section className="panel timestamp-panel">
          <div className="panel-heading"><div><span className="panel-kicker">04 / DURATION</span><h2>Calculadora de diferencias</h2></div><span className="panel-icon cyan-icon">Δt</span></div>
          <div className="compare-text-grid">
            <label className="encoding-pane"><span className="pane-heading">FECHA A · LOCAL</span><input type="datetime-local" step="0.001" className="field-input" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} /></label>
            <label className="encoding-pane"><span className="pane-heading">FECHA B · LOCAL</span><input type="datetime-local" step="0.001" className="field-input" value={secondDate} onChange={(event) => setSecondDate(event.target.value)} /></label>
          </div>
          <button type="button" className="primary-button" onClick={runDifference}>Calcular diferencia</button>
          {difference && <div className="timestamp-results">
            <ResultValue label="Fecha anterior" value={difference.earlier.toString()} mono={false} />
            <ResultValue label="Fecha posterior" value={difference.later.toString()} mono={false} />
            <ResultValue label="Diferencia total (ms)" value={difference.differenceMs} />
            <ResultValue label="Segundos" value={difference.differenceSeconds} />
            <ResultValue label="Minutos" value={difference.differenceMinutes} />
            <ResultValue label="Horas" value={difference.differenceHours} />
            <ResultValue label="Días exactos (duración)" value={difference.differenceDays} />
            <ResultValue label="Desglose" value={`${difference.breakdown.days} d ${difference.breakdown.hours} h ${difference.breakdown.minutes} m ${difference.breakdown.seconds} s ${difference.breakdown.milliseconds} ms`} />
            <button type="button" className="secondary-button" onClick={() => void copy(String(difference.differenceMs), "Diferencia en milisegundos")}>Copiar diferencia (ms)</button>
          </div>}
          <p className="notice">El cálculo es una duración exacta en milisegundos y sus unidades derivadas. No se convierte a meses o años porque su duración varía.</p>
          <p className="microcopy">Las dos entradas datetime-local usan la zona local del dispositivo; los instantes cercanos a cambios de horario pueden ser ambiguos o inexistentes.</p>
        </section>
      )}

      {tab === "zones" && (
        <section className="panel timestamp-panel">
          <div className="panel-heading"><div><span className="panel-kicker">05 / IANA TIME ZONE</span><h2>Conversión de zonas horarias</h2></div><span className="panel-icon violet-icon">Intl</span></div>
          <div className="timestamp-input-grid">
            <label className="encoding-pane"><span className="pane-heading">FECHA-HORA LOCAL DE ORIGEN</span><input type="datetime-local" step="0.001" className="field-input" value={zoneDate} onChange={(event) => setZoneDate(event.target.value)} /></label>
            <label className="encoding-pane"><span className="pane-heading">ZONA IANA</span><select className="field-input" value={zone} onChange={(event) => { setZone(event.target.value); setCustomZone(""); }}><option value="">Especificar manualmente…</option>{zones.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          <label className="field-label" htmlFor="custom-timezone">Otra zona IANA (opcional)</label>
          <input id="custom-timezone" className="field-input" value={customZone} onChange={(event) => setCustomZone(event.target.value)} placeholder="Ejemplo: Australia/Sydney" />
          <button type="button" className="primary-button" onClick={runZoneConversion}>Mostrar en zona horaria</button>
          <p className="notice notice-warning">La fecha introducida es hora local del dispositivo y se convierte primero en un instante. Cerca de cambios DST, datetime-local no puede expresar el offset ambiguo; reglas de zona proceden de Intl del navegador.</p>
          {zoneResult && <div className="timestamp-results"><ResultValue label={`Zona seleccionada · ${activeZone}`} value={zoneResult.formatted} mono={false} /><ResultValue label="Offset en esta fecha" value={zoneResult.offset} /><ResultValue label="Instante ISO UTC" value={zoneResult.localResult.iso} /><ResultValue label="Timestamp Unix (ms)" value={zoneResult.localResult.milliseconds} /><button type="button" className="secondary-button" onClick={() => void copy(String(zoneResult.localResult.milliseconds), "Timestamp")}>Copiar timestamp</button><p className="notice">{zoneResult.localResult.warning}</p></div>}
        </section>
      )}

      {tab === "epoch" && (
        <section className="panel timestamp-panel">
          <div className="panel-heading"><div><span className="panel-kicker">06 / EPOCH UTILITIES</span><h2>Conversor epoch avanzado</h2></div><span className="panel-icon cyan-icon">10³</span></div>
          <div className="epoch-mode">
            <label className="check-choice"><input type="radio" name="epoch-direction" checked={epochDirection === "seconds-to-milliseconds"} onChange={() => setEpochDirection("seconds-to-milliseconds")} /> Segundos → milisegundos</label>
            <label className="check-choice"><input type="radio" name="epoch-direction" checked={epochDirection === "milliseconds-to-seconds"} onChange={() => setEpochDirection("milliseconds-to-seconds")} /> Milisegundos → segundos</label>
          </div>
          <div className="timestamp-input-grid">
            <label className="encoding-pane"><span className="pane-heading">VALOR DECIMAL (NO SE REDONDEA EN LA SALIDA)</span><input className="field-input mono-input" inputMode="decimal" value={epochValue} onChange={(event) => setEpochValue(event.target.value)} placeholder="1700000000.125" /></label>
            <div className="epoch-help"><span className="panel-kicker">INTERPRETACIÓN</span><p>El sentido lo determina el selector. Las fracciones válidas se conservan y Date puede truncar por precisión de milisegundos.</p></div>
          </div>
          <button type="button" className="primary-button" onClick={runEpochConversion}>Convertir</button>
          {epochResult && <div className="timestamp-results"><ResultValue label="Valor original" value={epochResult.original} /><ResultValue label="Valor convertido" value={epochResult.converted} /><ResultValue label="Segundos enteros con signo" value={epochResult.wholeSeconds} /><ResultValue label="Milisegundos sobrantes" value={epochResult.remainderMilliseconds} /><ResultValue label="Fecha ISO" value={epochResult.iso} /><button type="button" className="secondary-button" onClick={() => void copy(String(epochResult.converted), "Conversión")}>Copiar resultado</button></div>}
          <div className="panel-divider" />
          <div className="panel-heading compact-heading"><div><span className="panel-kicker">LOG DATE → EPOCH</span><h2>Fecha ISO de un log</h2></div></div>
          <div className="inline-params"><input className="field-input mono-input" value={logDateValue} onChange={(event) => setLogDateValue(event.target.value)} placeholder="2025-03-08T12:30:00Z" aria-label="Fecha ISO de log" /><button type="button" className="secondary-button" onClick={runLogDateConversion}>Convertir</button></div>
          {logDateResult && <TimestampResults values={[["Unix (s)", logDateResult.seconds], ["Unix (ms)", logDateResult.milliseconds], ["ISO UTC", logDateResult.iso]]} copyValue={String(logDateResult.milliseconds)} onCopy={(value) => void copy(value, "Timestamp")} />}
          {logDateResult?.timezoneKind === "local-assumed" && <p className="notice notice-warning">{logDateResult.warning}</p>}
        </section>
      )}

      {tab === "forensic" && (
        <section className="panel timestamp-panel">
          <div className="panel-heading"><div><span className="panel-kicker">07 / FORENSIC EPOCHS</span><h2>Épocas y contadores comunes</h2></div><span className="panel-icon cyan-icon">UTC</span></div>
          <div className="timestamp-input-grid">
            <label className="encoding-pane">
              <span className="pane-heading">FORMATO</span>
              <select className="field-input" value={forensicKind} onChange={(event) => {
                const value = event.target.value;
                if (value === "auto" || value === "filetime" || value === "webkit" || value === "dotnet" || value === "mac") setForensicKind(value);
              }}>
                <option value="filetime">Windows FILETIME (100 ns)</option>
                <option value="webkit">WebKit / Chrome (µs)</option>
                <option value="dotnet">.NET ticks (100 ns)</option>
                <option value="mac">Mac Absolute Time (s)</option>
                <option value="auto">Autodetectar Unix (s / ms / µs / ns)</option>
              </select>
            </label>
            <label className="encoding-pane">
              <span className="pane-heading">VALOR ENTERO O SEGUNDOS MAC</span>
              <input className="field-input mono-input" inputMode="numeric" value={forensicValue} onChange={(event) => setForensicValue(event.target.value)} />
            </label>
          </div>
          <button type="button" className="primary-button" onClick={runForensicConversion}>Convertir localmente</button>
          {forensicResult && <div className="timestamp-results" aria-live="polite">
            <ResultValue label="Interpretación" value={forensicResult.label} mono={false} />
            <ResultValue label="ISO 8601 UTC" value={forensicResult.iso} />
            <ResultValue label="Unix (ms)" value={forensicResult.unixMilliseconds} />
            <button type="button" className="secondary-button" onClick={() => void copy(String(forensicResult.unixMilliseconds), "Timestamp")}>Copiar Unix (ms)</button>
            <p className={`notice ${forensicResult.ambiguous ? "notice-warning" : ""}`}>{forensicResult.warning}</p>
          </div>}
          <p className="notice notice-warning">Autodetección de unidades es heurística y puede ser ambigua. Los valores FILETIME/WebKit/.NET deben ser contadores enteros; Mac Absolute usa segundos desde 2001-01-01 UTC.</p>
        </section>
      )}

      {tab === "clock" && <ClockPanel />}
    </section>
  );
}
