import type { ReactNode } from "react";
import { appSections, type AppSectionId } from "../data/toolCatalog";
import type { FxMode } from "../lib/fxPreferences";
import { BackgroundFX } from "./BackgroundFX";

export function Sidebar({
  active,
  onSelect,
  onTogglePalette,
  fxMode,
  onFxModeChange,
  paletteOpen,
  version,
}: {
  active: AppSectionId;
  onSelect: (id: AppSectionId) => void;
  onTogglePalette: () => void;
  fxMode: FxMode;
  onFxModeChange: (mode: FxMode) => void;
  paletteOpen: boolean;
  version: string;
}) {
  const navigationGroups = appSections
    .filter((section) => section.id !== "overview")
    .reduce<Array<{ category: string; sections: typeof appSections }>>((groups, section) => {
      const group = groups.find((item) => item.category === section.category);
      if (group) group.sections.push(section);
      else groups.push({ category: section.category, sections: [section] });
      return groups;
    }, []);

  return (
    <>
      <BackgroundFX activeSection={active} mode={fxMode} paletteOpen={paletteOpen} />
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => onSelect("overview")} aria-label="S0ul74-Tools, ir al inicio">
          <svg className="brand-logo" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <path d="M17 1.5 32.5 17 17 32.5 1.5 17 17 1.5Z" stroke="currentColor" />
            <circle cx="13" cy="17" r="5" stroke="currentColor" />
            <path d="M20 12h7M23.5 12v10M19.5 17h7" stroke="currentColor" strokeLinecap="round" />
            <path d="M2 17h6M26 17h6" stroke="var(--magenta)" />
          </svg>
          <span className="brand-name">S0ul74<span>// TOOLS</span></span>
        </button>
        <div className="sidebar-label">WORKSPACE / LOCAL</div>
        <button type="button" className="sidebar-command-trigger" onClick={onTogglePalette}>
          <span aria-hidden="true">⌕</span><span>Buscar herramienta</span><kbd>CTRL K</kbd>
        </button>
        <nav className="side-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`nav-item nav-overview ${active === "overview" ? "active" : ""}`}
            onClick={() => onSelect("overview")}
            aria-current={active === "overview" ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">⌂</span><span>System Overview</span><span className="nav-number">00</span>
          </button>
          {navigationGroups.map((group) => (
            <div className="side-nav-group" key={group.category}>
              <span className="side-nav-group-label">{group.category}</span>
              {group.sections.map((section) => (
                <button
                  type="button"
                  key={section.id}
                  className={`nav-item ${active === section.id ? "active" : ""}`}
                  onClick={() => onSelect(section.id)}
                  aria-current={active === section.id ? "page" : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">{section.id === "network" ? "⌘" : section.id === "file" ? "▤" : section.id === "reference" ? "◫" : "◈"}</span>
                  <span>{section.label}</span>
                  <span className="nav-number">{section.short}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="status-card">
            <span className="status-indicator" />
            <div><strong>Herramientas locales</strong><span>Sin telemetría ni servicios remotos</span></div>
          </div>
          <div className="fx-control">
            <span className="fx-control-label">FX / EFECTOS</span>
            <div className="fx-control-options" role="group" aria-label="Intensidad de efectos visuales">
              {([
                ["full", "Completo"],
                ["soft", "Suave"],
                ["off", "Off"],
              ] as const).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={fxMode === value}
                  className={fxMode === value ? "is-active" : ""}
                  onClick={() => onFxModeChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-foot"><span>S0ul74 // TOOLS</span><span>v{version}</span></div>
        </div>
      </aside>
    </>
  );
}

export function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <div><div className="panel-kicker">{subtitle ?? "PANEL"}</div><h2>{title}</h2></div>
      </div>
      {children}
    </div>
  );
}
