import { useState } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { calculateUmask, describeCronExpression, getNextCronRuns, parseCronExpression, parsePermissionMode, type PermissionMode, type UmaskResult } from "../lib/sysadminTools";

export function SysadminSection() {
  const [permissionInput, setPermissionInput] = useState("755");
  const [permissionResult, setPermissionResult] = useState<PermissionMode | null>(null);
  const [permissionError, setPermissionError] = useState("");
  const [umaskInput, setUmaskInput] = useState("022");
  const [umaskResult, setUmaskResult] = useState<UmaskResult | null>(null);
  const [umaskError, setUmaskError] = useState("");
  const [cronInput, setCronInput] = useState("*/15 * * * *");
  const [cronDescription, setCronDescription] = useState("");
  const [cronRuns, setCronRuns] = useState<Date[]>([]);
  const [cronError, setCronError] = useState("");

  function calculatePermissions() {
    setPermissionError("");
    try {
      setPermissionResult(parsePermissionMode(permissionInput));
    } catch (reason) {
      setPermissionResult(null);
      setPermissionError(reason instanceof Error ? reason.message : "No se pudieron interpretar los permisos.");
    }
  }

  function calculateMask() {
    setUmaskError("");
    try {
      setUmaskResult(calculateUmask(umaskInput));
    } catch (reason) {
      setUmaskResult(null);
      setUmaskError(reason instanceof Error ? reason.message : "No se pudo calcular la umask.");
    }
  }

  function explainCron() {
    setCronError("");
    try {
      const parsed = parseCronExpression(cronInput);
      setCronDescription(describeCronExpression(parsed));
      setCronRuns(getNextCronRuns(parsed, new Date(), 5));
    } catch (reason) {
      setCronDescription("");
      setCronRuns([]);
      setCronError(reason instanceof Error ? reason.message : "La expresión cron no es válida.");
    }
  }

  return (
    <section className="page-view tool-page lab-page sysadmin-page">
      <SectionHeader
        eyebrow={<><span className="eyebrow-line" /> SYSADMIN / ASIR / LOCAL</>}
        title={<>Sysadmin <span>lab.</span></>}
        description="Calculadoras locales de permisos Unix y expresiones cron de cinco campos."
        status="LOCAL ONLY"
      />
      <div className="sysadmin-grid">
        <section className="panel sysadmin-panel">
          <div className="panel-heading"><div><span className="panel-kicker">01 / CHMOD</span><h2>Permisos rwx ↔ octal</h2></div></div>
          <label className="field-label" htmlFor="permission-mode">Modo octal o simbólico</label>
          <input id="permission-mode" className="field-input" value={permissionInput} onChange={(event) => setPermissionInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") calculatePermissions(); }} placeholder="755 o rwxr-xr-x" />
          <p className="microcopy">Ejemplos: <code>755</code>, <code>0640</code>, <code>rwxr-xr--</code> o <code>-rw-r-----</code>. No ejecuta chmod ni cambia archivos.</p>
          <div className="action-row"><button type="button" className="primary-button" onClick={calculatePermissions}>Calcular permisos</button></div>
          {permissionError && <p className="error-message" role="alert">{permissionError}</p>}
          {permissionResult && <div className="sysadmin-permission-result" aria-live="polite">
            <div><span>Octal</span><strong>{permissionResult.octal}</strong></div>
            <div><span>Rwx</span><strong>{permissionResult.symbolic}</strong></div>
            <div><span>Propietario</span><strong>{permissionResult.owner.toString(8)}</strong><small>{permissionResult.symbolic.slice(0, 3)}</small></div>
            <div><span>Grupo</span><strong>{permissionResult.group.toString(8)}</strong><small>{permissionResult.symbolic.slice(3, 6)}</small></div>
            <div><span>Otros</span><strong>{permissionResult.others.toString(8)}</strong><small>{permissionResult.symbolic.slice(6, 9)}</small></div>
          </div>}
        </section>

        <section className="panel sysadmin-panel">
          <div className="panel-heading"><div><span className="panel-kicker">02 / UMASK</span><h2>Máscara de creación</h2></div></div>
          <label className="field-label" htmlFor="umask-value">Umask (tres dígitos octales)</label>
          <input id="umask-value" className="field-input" value={umaskInput} onChange={(event) => setUmaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") calculateMask(); }} placeholder="022" />
          <p className="microcopy">La máscara retira bits de los modos base: archivo <code>0666</code>, directorio <code>0777</code>.</p>
          <div className="action-row"><button type="button" className="primary-button" onClick={calculateMask}>Calcular umask</button></div>
          {umaskError && <p className="error-message" role="alert">{umaskError}</p>}
          {umaskResult && <div className="umask-results" aria-live="polite">
            <div className="umask-result-row"><strong>Archivo</strong><code>{umaskResult.files.octal}</code><code>{umaskResult.files.symbolic}</code></div>
            <div className="umask-result-row"><strong>Directorio</strong><code>{umaskResult.directories.octal}</code><code>{umaskResult.directories.symbolic}</code></div>
          </div>}
          <p className="notice">Los modos indicados son permisos resultantes en un sistema Unix tradicional; ACL, políticas del sistema de archivos y atributos adicionales pueden cambiar el acceso efectivo.</p>
        </section>
      </div>

      <section className="panel sysadmin-panel cron-panel">
        <div className="panel-heading"><div><span className="panel-kicker">03 / CRON</span><h2>Expresión de cinco campos</h2></div></div>
        <label className="field-label" htmlFor="cron-expression">Minuto · hora · día del mes · mes · día de semana</label>
        <input id="cron-expression" className="field-input cron-input" value={cronInput} onChange={(event) => setCronInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") explainCron(); }} placeholder="*/15 9-17 * * 1-5" spellCheck={false} />
        <p className="microcopy">Admite <code>*</code>, listas, rangos y pasos (por ejemplo <code>*/15 9-17 * * 1-5</code>). Los nombres de meses/días y segundos no se admiten; las próximas ejecuciones usan la zona horaria local del navegador.</p>
        <div className="action-row"><button type="button" className="primary-button" onClick={explainCron}>Explicar y calcular próximas ejecuciones</button></div>
        {cronError && <p className="error-message" role="alert">{cronError}</p>}
        {cronDescription && <div className="cron-results" aria-live="polite">
          <div className="cron-explanation"><span>INTERPRETACIÓN</span><p>{cronDescription}</p><small>Cuando día del mes y día de semana están restringidos, se aplica la semántica habitual de cron (coincide cualquiera de los dos).</small></div>
          <div className="cron-next-runs"><span>PRÓXIMAS 5 EJECUCIONES · HORA LOCAL</span>{cronRuns.map((date) => <time key={date.toISOString()} dateTime={date.toISOString()}>{date.toLocaleString()}</time>)}</div>
        </div>}
      </section>
      <p className="notice notice-warning">Este laboratorio solo interpreta valores en el navegador. No ejecuta comandos, no programa tareas y no modifica permisos del sistema.</p>
    </section>
  );
}
