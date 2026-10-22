import { useState } from "react";
import { inspectJwt, type JwtAnalysis } from "../lib/jwt";

async function copyValue(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error("El portapapeles no está disponible en este contexto.");
  await navigator.clipboard.writeText(value);
}

function jsonValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function claimValue(value: unknown): string {
  if (typeof value === "string") return value;
  const serialized = JSON.stringify(value);
  return serialized ?? String(value);
}

export function JwtSection() {
  const [token, setToken] = useState("");
  const [analysis, setAnalysis] = useState<JwtAnalysis | null>(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  function analyze() {
    setError("");
    setCopyMessage("");
    setAnalysis(null);
    if (!token.trim()) {
      setError("Pega un token compacto para analizarlo.");
      return;
    }
    try {
      setAnalysis(inspectJwt(token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo interpretar el token.");
    }
  }

  async function copyJson(value: unknown, label: string) {
    try {
      await copyValue(jsonValue(value));
      setCopyMessage(`${label} copiado.`);
    } catch (reason) {
      setCopyMessage(reason instanceof Error ? reason.message : "No se pudo copiar.");
    }
  }

  return (
    <section className="page-view tool-page lab-page">
      <div className="page-title-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> TOKEN STRUCTURE / READ ONLY</div><h1>JWT <span>inspector.</span></h1><p className="page-description">Decodificación local de la estructura compacta y lectura orientativa de claims.</p></div>
        <span className="tool-status warning-status"><span /> FIRMA NO VERIFICADA</span>
      </div>

      <div className="notice notice-warning security-banner" role="note">
        No introduzcas tokens de sesión, contraseñas ni credenciales reales. El token se procesa solo en memoria del navegador y no se envía ni guarda.
      </div>

      <section className="panel jwt-input-panel">
        <div className="panel-heading"><div><span className="panel-kicker">01 / COMPACT TOKEN</span><h2>Token de entrada</h2></div><span className="panel-icon violet-icon">JWT</span></div>
        <label className="field-label" htmlFor="jwt-input">JSON Web Token</label>
        <textarea id="jwt-input" className="field-input field-textarea jwt-textarea" value={token} onChange={(event) => { setToken(event.target.value); setAnalysis(null); setError(""); }} placeholder="header.payload.signature" autoComplete="off" spellCheck={false} />
        <div className="action-row">
          <button type="button" className="primary-button violet-button" onClick={analyze}>Inspeccionar token</button>
          <button type="button" className="secondary-button" onClick={() => { setToken(""); setAnalysis(null); setError(""); setCopyMessage(""); }}>Limpiar</button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        {copyMessage && <p className="microcopy" role="status">{copyMessage}</p>}
      </section>

      {analysis && (
        <div className="jwt-results" aria-live="polite">
          <div className="jwt-status-grid">
            <div className="result-box status-box"><span>ESTADO ESTRUCTURAL</span><strong className="success-text">Token interpretable</strong></div>
            <div className="result-box status-box"><span>FIRMA</span><strong className="warning-text">No verificada</strong></div>
            <div className="result-box status-box"><span>ALGORITMO DECLARADO</span><strong>{analysis.algorithm}</strong></div>
            <div className="result-box status-box"><span>TIPO DECLARADO</span><strong>{analysis.tokenType}</strong></div>
          </div>
          <div className="jwt-parts-grid">
            <section className="panel jwt-part-panel">
              <div className="panel-heading"><div><span className="panel-kicker">02 / HEADER</span><h2>Encabezado</h2></div><button type="button" className="text-button" onClick={() => void copyJson(analysis.header, "Header")}>COPIAR</button></div>
              <pre className="jwt-json mono-output">{jsonValue(analysis.header)}</pre>
            </section>
            <section className="panel jwt-part-panel">
              <div className="panel-heading"><div><span className="panel-kicker">03 / PAYLOAD</span><h2>Payload</h2></div><button type="button" className="text-button" onClick={() => void copyJson(analysis.payload, "Payload")}>COPIAR</button></div>
              <pre className="jwt-json mono-output">{jsonValue(analysis.payload)}</pre>
            </section>
          </div>
          <section className="panel claims-panel">
            <div className="panel-heading"><div><span className="panel-kicker">04 / CLAIMS</span><h2>Claims reconocidos</h2></div></div>
            {analysis.claims.length ? (
              <div className="claims-list">
                {analysis.claims.map((claim) => (
                  <div className="claim-row" key={claim.name}>
                    <strong>{claim.name}</strong>
                    <span>{claimValue(claim.value)}</span>
                    {claim.readableDate && <small>{claim.readableDate}{claim.timeStatus === "expired" ? " · parece vencido según el reloj local" : claim.timeStatus === "not-active" ? " · nbf futuro según el reloj local" : claim.timeStatus === "future-issued" ? " · iat futuro según el reloj local" : ""}</small>}
                    {(claim.name === "exp" || claim.name === "nbf" || claim.name === "iat") && typeof claim.value !== "number" && <small>Claim temporal no numérico; no se convierte.</small>}
                  </div>
                ))}
              </div>
            ) : <p className="microcopy">No se encontraron claims registrados entre iss, sub, aud, exp, nbf, iat y jti.</p>}
          </section>
          <div className="jwt-warning-list">
            {analysis.warnings.map((warning) => <p className="notice notice-warning" key={warning}>{warning}</p>)}
            <p className="notice">Los claims pueden requerir comprobaciones adicionales, como emisor, audiencia, vigencia y política de la aplicación. La decodificación no valida el token.</p>
          </div>
        </div>
      )}
    </section>
  );
}
