import { toolsCatalog } from "../data/referenceData";

export function OverviewSection({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <section className="page-view overview-view">
      <div className="hero-panel">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> SYSTEM OVERVIEW</div>
          <h1>Cyberpunk operators<br /><span>for real work.</span></h1>
          <p>Toolkit local para redes, seguridad, análisis, hashing y documentación técnica. Todo en el navegador, sin depender de servicios remotos.</p>
          <button type="button" className="primary-button" onClick={() => onSelect("network")}>Open Network Lab</button>
        </div>
        <div className="hero-visual">
          <div className="hud-ring" />
          <div className="hud-core">SMARTIN</div>
        </div>
      </div>

      <div className="tile-grid">
        {toolsCatalog.slice(0, 6).map((tool) => (
          <button key={tool.id} type="button" className="tool-tile" onClick={() => onSelect(tool.id)}>
            <span>{tool.label}</span>
            <small>{tool.category}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
