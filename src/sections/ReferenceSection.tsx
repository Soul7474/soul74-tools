import { useMemo, useState } from "react";
import { referenceRecords, type ReferenceToolId } from "../data/referenceData";
import { copyToClipboard } from "../lib/feedback";
import { SectionHeader } from "../components/SectionHeader";

export function ReferenceSection({ onNavigate }: { onNavigate: (id: ReferenceToolId) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [copyMessage, setCopyMessage] = useState("");
  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(referenceRecords.map((entry) => entry.category))).sort((a, b) => a.localeCompare(b, "es"))],
    [],
  );
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return referenceRecords
      .filter((entry) => category === "Todas" || entry.category === category)
      .filter((entry) => !normalized || [
        entry.title,
        entry.description,
        entry.details,
        ...entry.aliases,
      ].some((value) => value.toLocaleLowerCase("es").includes(normalized)))
      .sort((left, right) => left.title.localeCompare(right.title, "es", { numeric: true, sensitivity: "base" }));
  }, [category, query]);

  async function copyValue(value: string) {
    try {
      await copyToClipboard(value, "Referencia");
      setCopyMessage("Valor copiado.");
    } catch (reason) {
      setCopyMessage(reason instanceof Error ? reason.message : "No se pudo copiar el valor.");
    }
  }

  return (
    <section className="page-view tool-page lab-page reference-page">
      <SectionHeader eyebrow={<><span className="eyebrow-line violet-line" /> OFFLINE KNOWLEDGE / INDEX</>} title={<>Reference <span className="violet-text">database.</span></>} description="Consulta técnica local de redes, protocolos, formatos y conceptos." status={`${referenceRecords.length} ENTRADAS`} statusClass="violet-status" />

      <section className="panel reference-search-panel">
        <div className="panel-heading"><div><span className="panel-kicker">01 / LOCAL SEARCH</span><h2>Buscar en la base</h2></div></div>
        <div className="reference-controls">
          <label className="file-control reference-query">Buscar por nombre, alias o descripción<input className="field-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CIDR, HTTPS, exp, TLS…" /></label>
          <label className="file-control reference-category">Categoría<select className="field-input" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="reference-result-count" role="status">{results.length} resultado(s) · orden alfabético</div>
        {copyMessage && <p className="microcopy" role="status">{copyMessage}</p>}
      </section>

      {results.length ? (
        <div className="reference-grid" aria-live="polite">
          {results.map((entry) => {
            const valueToCopy = entry.copyValue;
            const relatedTool = entry.relatedTool;
            return (
              <article className="panel reference-card" key={entry.id}>
                <div className="reference-card-heading"><span className="reference-category-tag">{entry.category}</span>{valueToCopy && <button type="button" className="text-button" onClick={() => void copyValue(valueToCopy)}>COPIAR</button>}</div>
                <h2>{entry.title}</h2>
                {entry.aliases.length > 0 && <p className="reference-aliases">{entry.aliases.join(" · ")}</p>}
                <p className="reference-description">{entry.description}</p>
                <p className="reference-details">{entry.details}</p>
                {entry.sources && entry.sources.length > 0 && (
                  <div className="reference-sources">
                    {entry.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}
                  </div>
                )}
                {relatedTool && (
                  <button type="button" className="reference-tool-link" onClick={() => onNavigate(relatedTool.id)}>
                    Abrir {relatedTool.label} <span aria-hidden="true">↗</span>
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state reference-empty-state"><span>⌕</span><p>No hay entradas que coincidan. Prueba otra búsqueda o categoría.</p></div>
      )}

      <p className="notice reference-caveat">Las asociaciones de puertos y otros datos de referencia son orientativos; el número de puerto no prueba qué servicio se ejecuta. Consulta las fuentes enlazadas y la política aplicable antes de tomar decisiones operativas.</p>
    </section>
  );
}
