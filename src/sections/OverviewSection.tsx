import { appSections, type AppSectionId } from "../data/toolCatalog";
import { GlitchTitle, TiltPanel, TypeReveal } from "../components/DashboardFX";
import { ToolSearch } from "../components/ToolSearch";

const featuredIds: AppSectionId[] = ["network", "hash", "file", "reference"];

export function OverviewSection({
  onSelect,
  onOpenPalette,
  version,
}: {
  onSelect: (id: AppSectionId) => void;
  onOpenPalette: () => void;
  version: string;
}) {
  const tools = appSections.filter((section) => section.id !== "overview" && section.id !== "about");
  const categories = Array.from(new Set(tools.map((section) => section.category)));
  const featured = featuredIds.flatMap((id) => {
    const section = tools.find((item) => item.id === id);
    return section ? [section] : [];
  });

  return (
    <section className="page-view overview-view">
      <section className="ops-hero" aria-labelledby="ops-title">
        <div className="ops-hero-grid" aria-hidden="true" />
        <div className="ops-hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> LOCAL OPERATIONS / READY</div>
          <div className="ops-brand-lockup">
            <GlitchTitle id="ops-title" className="ops-title">S0ul74-Tools</GlitchTitle>
            <span className="ops-version">v{version}</span>
          </div>
          <p><TypeReveal text="Estación local para análisis de redes, seguridad y datos. Tus entradas se procesan en el navegador, sin servicios remotos." /></p>
          <div className="ops-hero-actions">
            <button type="button" className="primary-button" onClick={() => onSelect("network")}>Abrir Network Lab <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary-button" onClick={() => onSelect("reference")}>Consultar referencia</button>
            <button type="button" className="ops-palette-trigger" onClick={onOpenPalette}><span aria-hidden="true">&gt;_</span> Abrir búsqueda global <kbd>CTRL K</kbd></button>
          </div>
        </div>
        <div className="ops-hero-art" aria-hidden="true"><span className="ops-orbit ops-orbit-one" /><span className="ops-orbit ops-orbit-two" /><span className="ops-orbit-core">074<span>LOCAL</span></span><span className="ops-coordinate">NO REMOTE SERVICES<br />NO TELEMETRY</span></div>
      </section>

      <div className="ops-section-heading">
        <div><span className="section-kicker">LOCAL INDEX / SEARCH</span><h2>Explorar herramientas</h2></div>
        <span className="ops-section-note">Busca por nombre, categoría, función o alias</span>
      </div>
      <div id="all-tools"><ToolSearch onSelect={onSelect} showCategories /></div>

      <div className="ops-dashboard-lower">
        <section className="ops-category-section" aria-labelledby="category-title">
          <div className="ops-section-heading">
            <div><span className="section-kicker">QUICK ROUTING / CATEGORIES</span><h2 id="category-title">Acceso por categoría</h2></div>
            <span className="ops-section-note">{categories.length} categorías del catálogo</span>
          </div>
          <div className="ops-category-list">
            {categories.map((category) => {
              const categoryTools = tools.filter((tool) => tool.category === category);
              return (
                <button
                  type="button"
                  className="ops-category-card"
                  key={category}
                  onClick={() => onSelect(categoryTools[0].id)}
                >
                  <span className="ops-category-count">{String(categoryTools.length).padStart(2, "0")}</span>
                  <span><strong>{category}</strong><small>{categoryTools.map((tool) => tool.label).join(" · ")}</small></span>
                  <span className="ops-category-arrow" aria-hidden="true">↗</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="ops-capabilities" aria-labelledby="capability-title">
          <span className="section-kicker">SYSTEM CAPABILITIES</span>
          <h2 id="capability-title">Capacidades locales</h2>
          <div className="ops-capability-stat"><strong>{tools.length.toString().padStart(2, "0")}</strong><span>herramientas disponibles</span></div>
          <div className="ops-capability-stat"><strong>{categories.length.toString().padStart(2, "0")}</strong><span>categorías del catálogo</span></div>
          <div className="ops-capability-row"><span className="ops-capability-indicator" /> Procesamiento en este navegador</div>
          <div className="ops-capability-row"><kbd>CTRL K</kbd> Búsqueda global disponible</div>
        </aside>
      </div>

      <div className="ops-section-heading ops-feature-heading">
        <div><span className="section-kicker">QUICK ACCESS / FEATURED</span><h2>Herramientas destacadas</h2></div>
        <a className="ops-all-tools-link" href="#all-tools">Ver todas las herramientas <span aria-hidden="true">↓</span></a>
      </div>
      <div className="ops-feature-grid">
        {featured.map((section, index) => (
          <TiltPanel className={`ops-feature-tilt ops-feature-tilt-${index + 1}`} key={section.id}>
            <button className={`ops-feature-card ops-feature-${index + 1}`} type="button" onClick={() => onSelect(section.id)}>
              <span className="ops-feature-top"><span>{section.category}</span><small>{section.short}</small></span>
              <strong>{section.label}</strong>
              <span className="ops-feature-description">{section.description}</span>
              <span className="ops-feature-open">ABRIR SECCIÓN <span aria-hidden="true">↗</span></span>
            </button>
          </TiltPanel>
        ))}
      </div>
      <div className="ops-privacy-strip"><span aria-hidden="true">◇</span><p><strong>Procesamiento local.</strong> Los datos permanecen en la sesión del navegador. La app no ofrece monitoreo online, no ejecuta archivos y no conserva automáticamente entradas sensibles.</p><span className="ops-privacy-tag">LOCAL ONLY</span></div>
    </section>
  );
}
