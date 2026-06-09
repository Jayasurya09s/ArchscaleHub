import { BadgeCheck, Command, Home, ListChecks, UserRound, X } from "lucide-react";
import { roleAccess } from "../data/apps";

const sheetContent = {
  tasks: {
    eyebrow: "Tasks",
    title: "What needs attention",
    items: ["Due today", "Assigned to me", "Recurring tasks"]
  },
  approvals: {
    eyebrow: "Approvals",
    title: "Decision queue",
    items: ["Pending approvals", "Recently approved", "Delegated reviews"]
  }
};

export function MobileDock({ activeRole, activeSheet, onSheetChange, onRoleSelect }) {
  const activePanel = sheetContent[activeSheet];
  const isOwner = activeRole === "Studio Owner";

  const showSheet = activeSheet && activeSheet !== "home";

  return (
    <>
      {showSheet && (
        <div className="mobile-sheet" role="dialog" aria-label="Mobile navigation panel">
          <div className="mobile-sheet-handle" />
          <div className="mobile-sheet-header">
            <div>
              <span>{activeSheet === "hub" ? "Central Hub" : activeSheet === "you" ? "You" : activePanel.eyebrow}</span>
              <strong>
                {activeSheet === "hub"
                  ? "Choose a role view"
                  : activeSheet === "you"
                    ? "Profile and support"
                    : activePanel.title}
              </strong>
            </div>
            <button type="button" onClick={() => onSheetChange("")} aria-label="Close panel">
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          {activeSheet === "hub" && (
            <div className="mobile-sheet-grid">
              {roleAccess.map(({ label, icon: Icon }) => (
                <button
                  type="button"
                  className={activeRole === label ? "is-active" : ""}
                  key={label}
                  onClick={() => {
                    onRoleSelect(label);
                    onSheetChange("");
                  }}
                >
                  <span>
                    <Icon size={18} strokeWidth={2.15} />
                  </span>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          )}

          {activeSheet === "you" && (
            <div className="mobile-sheet-list">
              {["Profile", "Support Centre", ...(isOwner ? ["Billing", "Settings"] : [])].map((item) => (
                <button type="button" key={item}>
                  <span>{item.slice(0, 1)}</span>
                  <strong>{item}</strong>
                </button>
              ))}
            </div>
          )}

          {activePanel && (
            <div className="mobile-sheet-list">
              {activePanel.items.map((item) => (
                <button type="button" key={item}>
                  <span>{item.slice(0, 1)}</span>
                  <strong>{item}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="mobile-dock" aria-label="Mobile navigation">
        <button type="button" className={!activeSheet ? "is-selected" : ""} onClick={() => onSheetChange("")}>
          <Home size={19} strokeWidth={2.15} />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={activeSheet === "tasks" ? "is-selected" : ""}
          onClick={() => onSheetChange(activeSheet === "tasks" ? "" : "tasks")}
        >
          <ListChecks size={19} strokeWidth={2.15} />
          <span>Tasks</span>
        </button>
        <button
          type="button"
          className={`dock-primary ${activeSheet === "hub" ? "is-selected" : ""}`}
          onClick={() => onSheetChange(activeSheet === "hub" ? "" : "hub")}
        >
          <Command size={22} strokeWidth={2.25} />
          <span>Hub</span>
        </button>
        <button
          type="button"
          className={activeSheet === "approvals" ? "is-selected" : ""}
          onClick={() => onSheetChange(activeSheet === "approvals" ? "" : "approvals")}
        >
          <BadgeCheck size={19} strokeWidth={2.15} />
          <span>Approvals</span>
        </button>
        <button
          type="button"
          className={activeSheet === "you" ? "is-selected" : ""}
          onClick={() => onSheetChange(activeSheet === "you" ? "" : "you")}
        >
          <UserRound size={19} strokeWidth={2.15} />
          <span>You</span>
        </button>
      </nav>
    </>
  );
}
