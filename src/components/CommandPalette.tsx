import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { searchAppSections, type AppSection, type AppSectionId } from "../data/toolCatalog";

type PaletteAction = {
  id: string;
  label: string;
  description: string;
  aliases: string[];
  category: string;
  action: () => void;
};

type PaletteResult = Omit<AppSection, "id" | "aliases"> & {
  id: string;
  action: () => void;
};

function match(query: string, values: string[]): boolean {
  const terms = query.trim().toLocaleLowerCase("es").split(/\s+/).filter(Boolean);
  const haystack = values.join(" ").toLocaleLowerCase("es");
  return terms.every((term) => haystack.includes(term));
}

export function CommandPalette({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (id: AppSectionId) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const sectionResults = searchAppSections(query);
  const actions = useMemo<PaletteAction[]>(() => [
    { id: "go-home", label: "Ir al inicio", description: "Volver al System Overview.", aliases: ["home", "dashboard", "overview"], category: "Acción", action: () => onNavigate("overview") },
    { id: "clear-search", label: "Limpiar búsqueda de comandos", description: "Borrar la consulta sin salir de la paleta.", aliases: ["reset", "vaciar búsqueda", "clear search", "limpiar"], category: "Acción", action: () => setQuery("") },
  ], [onNavigate]);
  const actionResults = query.trim()
    ? actions.filter((action) => match(query, [action.label, action.description, ...action.aliases]))
    : [];
  const results: Array<AppSection | PaletteResult> = useMemo(
    () => [...sectionResults, ...actionResults.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      category: action.category,
      short: "↳",
      action: action.action,
    }))],
    [actionResults, sectionResults],
  );

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function selectResult(result: AppSection | PaletteResult) {
    if ("action" in result) {
      result.action();
      if (result.id !== "clear-search") onClose();
    } else {
      onNavigate(result.id);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (query) setQuery("");
      else onClose();
      return;
    }
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results.length) {
      event.preventDefault();
      const result = results[activeIndex] ?? results[0];
      if (result) selectResult(result);
    }
  }

  return (
    <div
      className="command-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="command-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-title"
        aria-describedby="command-help"
        onKeyDown={(event) => {
          if (event.key === "Escape" && event.target !== inputRef.current) {
            event.preventDefault();
            if (query) setQuery("");
            else onClose();
            return;
          }
          if (event.key === "Tab") {
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
              'input:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="command-dialog-heading">
          <span className="command-pulse" aria-hidden="true" />
          <div><span className="panel-kicker">S0ul74 // LOCAL COMMANDS</span><h2 id="command-title">Command palette</h2></div>
          <button type="button" className="command-close" onClick={onClose} aria-label="Cerrar command palette">Esc</button>
        </div>
        <div className="command-input-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Buscar comandos y herramientas"
            aria-autocomplete="list"
            aria-expanded
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex] ? `command-result-${results[activeIndex].id}` : undefined}
            placeholder="Busca una herramienta, función, categoría o alias…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>CTRL <span>/</span> K</kbd>
        </div>
        <p id="command-help" className="command-help">↑ ↓ para recorrer · Enter para abrir · Escape para cerrar. El atajo global se ignora en campos editables.</p>
        <div id="command-results" className="command-results" role="listbox" aria-label="Resultados de búsqueda">
          {results.length ? results.map((result, index) => (
            <button
              key={result.id}
              id={`command-result-${result.id}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`command-result ${index === activeIndex ? "is-active" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectResult(result)}
            >
              <span className="command-result-index">{result.short}</span>
              <span className="command-result-copy"><strong>{result.label}</strong><small>{result.description}</small></span>
              <span className="command-result-category">{result.category}</span>
              <span className="command-result-arrow" aria-hidden="true">↵</span>
            </button>
          )) : (
            <div className="tool-search-empty" role="status"><span aria-hidden="true">⌕</span><strong>No hay resultados</strong><small>Prueba con otra búsqueda local.</small></div>
          )}
        </div>
        <div className="command-dialog-footer"><span>S0ul74 // TOOLS</span><span>SOLO FUNCIONES DISPONIBLES</span></div>
      </section>
    </div>
  );
}
