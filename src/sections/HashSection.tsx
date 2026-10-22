import { useState, type ChangeEvent } from "react";
import { compareHashes as compareHashValues, digestAlgorithms, digestFile, digestText, identifyHashFormat, MAX_HASH_FILE_SIZE, type SupportedDigest } from "../lib/hash";

type HashResult = { algorithm: SupportedDigest; hash: string; source: "text" | "file"; fileName?: string; fileSize?: number };

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KiB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MiB`;
};

async function copyValue(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error("El portapapeles no está disponible en este contexto.");
  await navigator.clipboard.writeText(value);
}

export function HashSection() {
  const [text, setText] = useState("");
  const [algorithm, setAlgorithm] = useState<SupportedDigest>("SHA-256");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<HashResult | null>(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [leftHash, setLeftHash] = useState("");
  const [rightHash, setRightHash] = useState("");
  const [comparison, setComparison] = useState<"equal" | "different" | "">("");
  const [comparisonError, setComparisonError] = useState("");
  const [identifyInput, setIdentifyInput] = useState("");

  async function calculateTextHash() {
    setBusy(true);
    setStatus("Calculando digest de texto…");
    setStatusType("info");
    setResult(null);
    try {
      const hash = await digestText(algorithm, text);
      setResult({ algorithm, hash, source: "text" });
      setStatus("Digest calculado localmente.");
      setStatusType("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo calcular el hash.");
      setStatusType("error");
    } finally {
      setBusy(false);
    }
  }

  async function calculateFileHash() {
    if (!file) {
      setStatus("Selecciona un archivo local antes de calcular.");
      setStatusType("error");
      return;
    }
    setBusy(true);
    setStatus("Leyendo y procesando el archivo localmente…");
    setStatusType("info");
    setResult(null);
    try {
      const hash = await digestFile(algorithm, file);
      setResult({ algorithm, hash, source: "file", fileName: file.name, fileSize: file.size });
      setStatus("Digest calculado localmente; el archivo no se ha subido ni guardado.");
      setStatusType("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo calcular el hash del archivo.");
      setStatusType("error");
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setResult(null);
    const tooLarge = selectedFile !== null && selectedFile.size > MAX_HASH_FILE_SIZE;
    setStatus(tooLarge ? "El archivo supera el límite de 50 MiB; no se procesará." : "");
    setStatusType(tooLarge ? "error" : "info");
  }

  async function copyHash() {
    if (!result) return;
    try {
      await copyValue(result.hash);
      setCopyStatus("Hash copiado.");
    } catch (error) {
      setCopyStatus(error instanceof Error ? error.message : "No se pudo copiar.");
    }
  }

  function compareHashes() {
    try {
      setComparison(compareHashValues(leftHash, rightHash) ? "equal" : "different");
      setComparisonError("");
    } catch (error) {
      setComparison("");
      setComparisonError(error instanceof Error ? error.message : "No se pudieron comparar los hashes.");
    }
  }

  const guesses = identifyHashFormat(identifyInput);

  return (
    <section className="page-view tool-page lab-page">
      <div className="page-title-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> SECURITY / DIGESTS</div><h1>Hash <span>lab.</span></h1><p className="page-description">Calcula y compara digests en este dispositivo. No se almacena ni transmite tu entrada.</p></div>
        <span className="tool-status"><span /> WEB CRYPTO</span>
      </div>

      <div className="lab-grid">
        <section className="panel lab-panel">
          <div className="panel-heading"><div><span className="panel-kicker">01 / TEXT DIGEST</span><h2>Hashing de texto</h2></div></div>
          <label className="field-label" htmlFor="hash-algorithm">Algoritmo</label>
          <select id="hash-algorithm" className="field-input" value={algorithm} onChange={(event) => {
            const selected = digestAlgorithms.find((item) => item === event.target.value);
            if (selected) setAlgorithm(selected);
          }}>
            {digestAlgorithms.map((item) => <option key={item} value={item}>{item}{item === "SHA-1" ? " — heredado" : ""}</option>)}
          </select>
          {algorithm === "SHA-1" && <p className="notice notice-warning">SHA-1 es heredado y ya no se recomienda para seguridad o resistencia a colisiones.</p>}
          <label className="field-label" htmlFor="hash-text">Texto de entrada</label>
          <textarea id="hash-text" className="field-input field-textarea" value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe o pega texto…" />
          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => void calculateTextHash()} disabled={busy}>Calcular hash</button>
            <button type="button" className="secondary-button" onClick={() => { setText(""); setResult(null); setStatus(""); setStatusType("info"); }}>Limpiar</button>
          </div>
          <div className="panel-divider" />
          <label className="field-label" htmlFor="hash-file">Archivo local (máximo 50 MiB)</label>
          <input id="hash-file" className="field-input file-input" type="file" onChange={handleFileChange} />
          {file && <div className="file-meta"><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>}
          <button type="button" className="secondary-button" onClick={() => void calculateFileHash()} disabled={busy || !file || file.size > MAX_HASH_FILE_SIZE}>Calcular hash del archivo</button>
          <p className="microcopy">Para archivos mayores de 50 MiB, usa una utilidad local con procesamiento por streaming. El contenido nunca sale del navegador.</p>
          {status && <p className={`status-message status-${statusType}`} role={statusType === "error" ? "alert" : "status"}>{status}</p>}
        </section>

        <section className="panel lab-panel">
          <div className="panel-heading"><div><span className="panel-kicker">02 / RESULT</span><h2>Digest resultante</h2></div></div>
          {result ? (
            <div className="hash-result" aria-live="polite">
              <div className="result-tags"><span>{result.algorithm}</span><span>{result.source === "file" ? "ARCHIVO" : "TEXTO"}</span></div>
              {result.source === "file" && <div className="file-meta"><strong>{result.fileName}</strong><span>{formatBytes(result.fileSize ?? 0)}</span></div>}
              <code className="mono-output">{result.hash}</code>
              <button type="button" className="secondary-button" onClick={() => void copyHash()}>Copiar hash</button>
              {copyStatus && <p className="microcopy" role="status">{copyStatus}</p>}
            </div>
          ) : <div className="empty-state"><span>⌁</span><p>El resultado del cálculo aparecerá aquí.</p></div>}
          <div className="panel-divider" />
          <div className="panel-heading compact-heading"><div><span className="panel-kicker">03 / FORMAT HINT</span><h2>Identificador orientativo</h2></div></div>
          <input className="field-input" value={identifyInput} onChange={(event) => setIdentifyInput(event.target.value)} placeholder="Pega una cadena hash o PHC…" aria-label="Cadena para identificar formato" />
          {identifyInput.trim() && (
            <div className="guess-list" aria-live="polite">
              {guesses.length ? guesses.map((guess) => <div className="guess-item" key={guess.name}><strong>{guess.name}</strong><span>Probable · {guess.reason}</span></div>) : <p className="microcopy">Sin candidatos por formato conocido. No se puede confirmar el algoritmo solo por el aspecto de la cadena.</p>}
            </div>
          )}
        </section>
      </div>

      <div className="lab-grid">
        <section className="panel lab-panel">
          <div className="panel-heading"><div><span className="panel-kicker">04 / COMPARE</span><h2>Comparador de hashes</h2></div></div>
          <div className="compare-grid">
            <input className="field-input mono-input" value={leftHash} onChange={(event) => { setLeftHash(event.target.value); setComparison(""); setComparisonError(""); }} placeholder="Hash A" aria-label="Hash A" />
            <input className="field-input mono-input" value={rightHash} onChange={(event) => { setRightHash(event.target.value); setComparison(""); setComparisonError(""); }} placeholder="Hash B" aria-label="Hash B" />
          </div>
          <button type="button" className="primary-button" onClick={compareHashes}>Comparar</button>
          {comparison && <div className={`comparison-result ${comparison}`} role="status">{comparison === "equal" ? "Coinciden (sin distinguir mayúsculas)." : "No coinciden."}</div>}
          {comparisonError && <p className="error-message" role="alert">{comparisonError}</p>}
          <p className="microcopy">Dos hashes iguales no demuestran por sí solos la autenticidad del archivo ni quién lo creó. Ignora espacios exteriores; no modifica los espacios internos.</p>
        </section>
        <section className="panel lab-panel concept-panel">
          <div className="panel-heading"><div><span className="panel-kicker">CONCEPTS</span><h2>Hash ≠ cifrado ≠ codificación</h2></div></div>
          <p><strong>Hash:</strong> resumen unidireccional de longitud fija; no está diseñado para revertirse.</p>
          <p><strong>Cifrado:</strong> transformación reversible con una clave.</p>
          <p><strong>Codificación:</strong> cambia la representación de los datos, sin aportar secreto.</p>
          <p className="notice notice-warning">La identificación por formato es heurística: un candidato probable no confirma el algoritmo.</p>
        </section>
      </div>
    </section>
  );
}
