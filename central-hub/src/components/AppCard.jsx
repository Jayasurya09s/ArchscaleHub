import { ArrowUpRight } from "lucide-react";

export function AppCard({ app, onOpen, variant = "standard" }) {
  const Icon = app.icon;

  return (
    <button type="button" className={`app-card variant-${variant}`} onClick={() => onOpen(app.name)}>
      <span className="app-card-main">
        <span className="app-card-topline">
          <span className="app-icon">
            <Icon size={26} strokeWidth={1.9} />
          </span>
          <span className="app-meta">{app.meta}</span>
        </span>
        <span className="app-card-copy">
          <strong>{app.name}</strong>
          <span>{app.description}</span>
        </span>
      </span>

      <span className="open-app">
        Open application
        <ArrowUpRight size={17} strokeWidth={2.1} />
      </span>
    </button>
  );
}
