import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { appSections, searchAppSections, type AppSectionId } from "../data/toolCatalog";

function HighlightedMatch({ text, query }: { text: string; query: string }) {
  const firstTerm = query.trim().split(/\s+/)[0];
  if (!firstTerm) return <>{text}</>;
  const index = text.toLocaleLowerCase("es").indexOf(firstTerm.toLocaleLowerCase("es"));
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + firstTerm.length)}</mark>{text.slice(index + firstTerm.length)}</>;
}

export function ToolSearch({
  onSelect,
  compact = false,
  autoFocus = false,
  onEscape,
  onQueryClear,
  placeholder = "Buscar herramientas, funciones o conceptos…",
  showCategories = false,
}: {
  onSelect: (id: AppSectionId) => void;
  compact?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
  onQueryClear?: () => void;
  placeholder?: string;
  showCategories?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [category, setCategory] = useState("Todas");
  const inputRef = useRef<HTMLInputElement>(null);
  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(appSections.filter((section) => section.id !== "about").map((section) => section.category)))],
    [],
  );
  const results = searchAppSections(query).filter((section) =>
    section.id !== "about" && (category === "Todas" || section.category === category),
  );

  function updateQuery(value: string) {
    setQuery(value);
    setActiveIndex(0);
    onQueryClear?.();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (query) updateQuery("");
      else onEscape?.();
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
      onSelect(results[activeIndex]?.id ?? results[0].id);
    }
  }

  return (
    <div className={`tool-search ${compact ? "tool-search-compact" : ""} ${showCategories ? "tool-search-with-categories" : ""}`}>
      <div className="tool-search-input-wrap">
        <span className="tool-search-icon" aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="search"
          role="combobox"
          aria-label="Buscar herramientas"
          aria-autocomplete="list"
          aria-expanded
          aria-controls="tool-search-results"
          aria-activedescendant={results[activeIndex] ? `tool-search-result-${results[activeIndex].id}` : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {query && <button type="button" className="tool-search-clear" onClick={() => { updateQuery(""); inputRef.current?.focus(); }} aria-label="Limpiar búsqueda">×</button>}
        <kbd className="tool-search-shortcut" aria-hidden="true">↑↓ <span>ENTER</span></kbd>
      </div>
      {showCategories && (
        <div className="tool-search-categories" aria-label="Filtrar por categoría">
          {categories.map((item) => <button type="button" className={category === item ? "is-active" : ""} aria-pressed={category === item} key={item} onClick={() => { setCategory(item); setActiveIndex(0); }}>{item}</button>)}
        </div>
      )}
      <div id="tool-search-results" className="tool-search-results" role="listbox" aria-label="Herramientas y secciones">
        {results.length ? results.map((section, index) => (
          <button
            type="button"
            id={`tool-search-result-${section.id}`}
            role="option"
            aria-selected={index === activeIndex}
            className={`tool-search-result ${index === activeIndex ? "is-active" : ""}`}
            key={section.id}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onSelect(section.id)}
          >
            <span className="tool-search-result-index">{section.short}</span>
            <span className="tool-search-result-copy">
              <strong><HighlightedMatch text={section.label} query={query} /></strong>
              <small><HighlightedMatch text={section.description} query={query} /></small>
            </span>
            <span className="tool-search-result-category">{section.category}</span>
            <span className="tool-search-result-arrow" aria-hidden="true">↗</span>
          </button>
        )) : (
          <div className="tool-search-empty" role="status">
            <span aria-hidden="true">⌕</span>
            <strong>No hay resultados</strong>
            <small>Prueba con un nombre, categoría o función diferente.</small>
          </div>
        )}
      </div>
      <div className="tool-search-footer"><span>BÚSQUEDA LOCAL</span><span>{results.length} RESULTADO{results.length === 1 ? "" : "S"}</span></div>
    </div>
  );
}
