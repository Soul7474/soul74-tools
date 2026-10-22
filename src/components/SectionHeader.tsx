import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  status,
  statusClass = "",
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  status?: ReactNode;
  statusClass?: string;
}) {
  return (
    <header className="page-title-row">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {status && <span className={`tool-status ${statusClass}`}><span /> {status}</span>}
    </header>
  );
}
