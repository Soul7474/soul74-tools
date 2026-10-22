import { useMemo, useRef, useState } from "react";
import { applyEncodingOperation, encodingOperations, type EncodingOperation, type EncodingOptions } from "../lib/encoding";
import { copyToClipboard } from "../lib/feedback";
import { SectionHeader } from "../components/SectionHeader";

type RecipeStep = { id: number; operation: EncodingOperation; options: EncodingOptions };
type StepResult = { id: number; output?: string; error?: string };

const operationLabel = (operation: EncodingOperation) =>
  encodingOperations.find((item) => item.id === operation)?.label ?? operation;

export function EncodingSection() {
  const [input, setInput] = useState("");
  const [operation, setOperation] = useState<EncodingOperation>("text-base64");
  const [shift, setShift] = useState(13);
  const [xorKey, setXorKey] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [recipe, setRecipe] = useState<RecipeStep[]>([]);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [recipeOutput, setRecipeOutput] = useState<string | null>(null);
  const nextStepId = useRef(1);

  const groupedOperations = useMemo(() => {
    const groups = new Map<string, typeof encodingOperations>();
    for (const item of encodingOperations) {
      const group = groups.get(item.group) ?? [];
      group.push(item);
      groups.set(item.group, group);
    }
    return Array.from(groups.entries());
  }, []);

  function currentOptions(): EncodingOptions {
    return { shift, xorKey };
  }

  function executeSingle() {
    setError("");
    setStatus("");
    try {
      setOutput(applyEncodingOperation(operation, input, currentOptions()));
      setStatus("Transformación completada localmente.");
    } catch (reason) {
      setOutput("");
      setError(reason instanceof Error ? reason.message : "No se pudo ejecutar la transformación.");
    }
  }

  async function copy(value: string, label: string) {
    try {
      await copyToClipboard(value, label);
      setStatus(`${label} copiada al portapapeles.`);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo copiar la salida.");
    }
  }

  function addStep() {
    setRecipe((current) => [...current, { id: nextStepId.current++, operation, options: currentOptions() }]);
    setStepResults([]);
    setRecipeOutput(null);
    setStatus("");
    setError("");
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= recipe.length) return;
    setRecipe((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setStepResults([]);
    setRecipeOutput(null);
  }

  function removeStep(id: number) {
    setRecipe((current) => current.filter((step) => step.id !== id));
    setStepResults([]);
    setRecipeOutput(null);
  }

  function runRecipe() {
    let current = input;
    const results: StepResult[] = [];
    setError("");
    setStatus("");
    setRecipeOutput(null);
    for (const [index, step] of recipe.entries()) {
      try {
        current = applyEncodingOperation(step.operation, current, step.options);
        results.push({ id: step.id, output: current });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Error de transformación.";
        results.push({ id: step.id, error: message });
        setStepResults(results);
        setError(`Falló el paso ${index + 1} (${operationLabel(step.operation)}): ${message}`);
        return;
      }
    }
    if (!recipe.length) {
      setError("Añade al menos un paso a la receta.");
      setStepResults([]);
      return;
    }
    setStepResults(results);
    setRecipeOutput(current);
    setStatus(`Receta completada: ${recipe.length} pasos ejecutados en orden.`);
  }

  const showShift = operation === "caesar";
  const showKey = operation === "xor";

  return (
    <section className="page-view tool-page lab-page encoding-page">
      <SectionHeader eyebrow={<><span className="eyebrow-line" /> TRANSFORM / LOCAL PIPELINE</>} title={<>Encoding <span>lab.</span></>} description="Transforma representaciones y encadena operaciones reproducibles, sin servicios remotos." status="LOCAL ONLY" statusClass="violet-status" />

      <section className="panel encoding-workbench">
        <div className="workbench-top">
          <div><span className="panel-kicker">01 / TRANSFORM</span><h2>Workbench</h2></div>
          <div className="encoding-controls">
            <label className="visually-hidden" htmlFor="encoding-operation">Operación</label>
            <select id="encoding-operation" className="field-input operation-select" value={operation} onChange={(event) => {
              const selected = encodingOperations.find((item) => item.id === event.target.value);
              if (selected) setOperation(selected.id);
            }}>
              {groupedOperations.map(([group, items]) => <optgroup key={group} label={group}>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}
            </select>
            {showShift && <label className="param-control">Shift <input className="field-input compact-input" type="number" min={-25} max={25} value={shift} onChange={(event) => setShift(Number(event.target.value))} /></label>}
            {showKey && <label className="param-control">Clave XOR <input className="field-input compact-input" value={xorKey} onChange={(event) => setXorKey(event.target.value)} placeholder="Clave UTF-8" /></label>}
          </div>
        </div>
        <div className="encoding-panels">
          <label className="encoding-pane">
            <span className="pane-heading"><span>ENTRADA</span><span>UTF-8 / TEXTO</span></span>
            <textarea className="field-input encoding-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pega aquí el texto o representación que quieras transformar…" />
          </label>
          <label className="encoding-pane">
            <span className="pane-heading"><span>SALIDA</span><span>RESULTADO</span></span>
            <textarea className="field-input encoding-textarea output-textarea" value={output} readOnly placeholder="La salida aparecerá aquí…" />
          </label>
        </div>
        <div className="action-row workbench-actions">
          <button type="button" className="primary-button violet-button" onClick={executeSingle}>Ejecutar operación</button>
          <button type="button" className="secondary-button" onClick={() => void copy(output, "Salida")} disabled={!output}>Copiar salida</button>
          <button type="button" className="secondary-button" onClick={() => { setInput(""); setOutput(""); setError(""); setStatus(""); }}>Limpiar</button>
          <button type="button" className="secondary-button" onClick={addStep}>＋ Añadir a receta</button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        {status && <p className="status-message status-success" role="status">{status}</p>}
        <p className="notice notice-warning">Decodificar cambia una representación; no descifra datos protegidos. ROT, César y XOR son demostraciones educativas, no cifrado moderno. HTML se procesa como texto: no se usa innerHTML.</p>
      </section>

      <section className="panel recipe-panel">
        <div className="panel-heading recipe-heading"><div><span className="panel-kicker">02 / RECIPE MODE</span><h2>Pipeline de operaciones</h2></div><div className="action-row"><button type="button" className="primary-button" onClick={runRecipe}>Ejecutar receta</button><button type="button" className="secondary-button" onClick={() => { setRecipe([]); setStepResults([]); setRecipeOutput(null); setError(""); setStatus(""); }}>Limpiar receta</button></div></div>
        <p className="microcopy">Los parámetros de César/XOR se capturan al añadir cada paso. La receta transforma la entrada en orden; si falla, se conservan las salidas previas y el paso con error.</p>
        {recipe.length ? (
          <ol className="recipe-list">
            {recipe.map((step, index) => {
              const result = stepResults.find((item) => item.id === step.id);
              return (
                <li className="recipe-step" key={step.id}>
                  <div className="recipe-step-head"><span className="step-number">{String(index + 1).padStart(2, "0")}</span><strong>{operationLabel(step.operation)}</strong><div className="step-controls"><button type="button" className="icon-button" aria-label={`Mover paso ${index + 1} arriba`} onClick={() => moveStep(index, -1)} disabled={index === 0}>↑</button><button type="button" className="icon-button" aria-label={`Mover paso ${index + 1} abajo`} onClick={() => moveStep(index, 1)} disabled={index === recipe.length - 1}>↓</button><button type="button" className="icon-button danger-button" aria-label={`Eliminar paso ${index + 1}`} onClick={() => removeStep(step.id)}>×</button></div></div>
                  {step.operation === "caesar" && <span className="step-detail">Shift {step.options.shift}</span>}
                  {step.operation === "xor" && <span className="step-detail">Clave capturada</span>}
                  {result?.output !== undefined && <pre className="step-output">{result.output}</pre>}
                  {result?.error && <p className="error-message" role="alert">{result.error}</p>}
                </li>
              );
            })}
          </ol>
        ) : <div className="empty-state recipe-empty"><span>⌁</span><p>Elige una operación y añádela para crear una receta encadenada.</p></div>}
            {recipeOutput !== null && (
          <div className="recipe-final">
            <div className="pane-heading"><span>SALIDA FINAL</span><button type="button" className="text-button" onClick={() => void copy(recipeOutput, "Salida final")}>COPIAR</button></div>
            <pre className="step-output final-output">{recipeOutput}</pre>
          </div>
        )}
      </section>
    </section>
  );
}
