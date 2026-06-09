import { ArrowRight, CircleCheck, Clock3, FolderKanban } from "lucide-react";

const focusItems = [
  { icon: CircleCheck, value: "4", label: "approvals waiting" },
  { icon: Clock3, value: "3", label: "tasks due today" },
  { icon: FolderKanban, value: "3", label: "active projects" }
];

export function FocusStrip({ onOpen }) {
  return (
    <section className="focus-strip" aria-label="Today at a glance">
      <div className="focus-intro">
        <span>Today at a glance</span>
        <strong>Everything important, within reach.</strong>
      </div>
      <div className="focus-items">
        {focusItems.map(({ icon: Icon, value, label }) => (
          <button type="button" className="focus-item" key={label} onClick={() => onOpen(label)}>
            <span className="focus-icon">
              <Icon size={20} strokeWidth={2.1} />
            </span>
            <span>
              <strong>{value}</strong> {label}
            </span>
            <ArrowRight size={16} strokeWidth={2.1} />
          </button>
        ))}
      </div>
    </section>
  );
}
