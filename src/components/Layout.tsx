import type { ReactNode } from "react";
import type { SectionId } from "../types";

export function Sidebar({
  sections,
  active,
  onSelect,
  onTogglePalette,
}: {
  sections: Array<{ id: SectionId; label: string; short: string; category: string }>;
  active: SectionId;
  onSelect: (id: SectionId) => void;
  onTogglePalette: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => onSelect("overview")}>
        <span className="brand-mark"><span /></span>
        <span className="brand-name">SMARTIN<span>TOOLS</span></span>
      </div>
      <div className="sidebar-label">SYSTEM OPERATIONS</div>
      <nav className="side-nav" aria-label="Navegación principal">
        {sections.map((section) => (
          <button
            type="button"
            key={section.id}
            className={`nav-item ${active === section.id ? "active" : ""}`}
            onClick={() => onSelect(section.id)}
          >
            <span className="nav-icon">◈</span>
            <span>{section.label}</span>
            <span className="nav-number">{section.short}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="ghost-button" onClick={onTogglePalette}>Toggle palette</button>
    </aside>
  );
}

export function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">{subtitle ?? "PANEL"}</div>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}
