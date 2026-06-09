import { useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Command,
  CreditCard,
  LifeBuoy,
  Settings
} from "lucide-react";
import { applications, navigation, roleAccess } from "../data/apps";

const appIndex = new Map(applications.map((app) => [app.name, app]));

const utilityPanels = {
  Billing: {
    label: "Billing",
    eyebrow: "Owner tools",
    icon: CreditCard,
    items: ["Invoices", "Subscriptions", "Payment methods"]
  },
  "Support Centre": {
    label: "Support Centre",
    eyebrow: "Help desk",
    icon: LifeBuoy,
    items: ["Support Centre"]
  },
  Settings: {
    label: "Settings",
    eyebrow: "Workspace",
    icon: Settings,
    items: ["Profile", "Team access", "Workspace settings"]
  }
};

export function Sidebar({ collapsed, onToggle, activeRole, onRoleSelect }) {
  const [activeUtility, setActiveUtility] = useState("");
  const activeAccess = roleAccess.find((role) => role.label === activeRole) ?? roleAccess.at(-1);
  const isStudioOwner = activeRole === "Studio Owner";
  const utilityPanel = activeUtility ? utilityPanels[activeUtility] : null;
  const UtilityIcon = utilityPanel?.icon;

  const selectRole = (role) => {
    setActiveUtility("");
    onRoleSelect(role);
  };

  const selectUtility = (utility) => {
    if (collapsed) {
      onToggle();
    }
    setActiveUtility((current) => (current === utility ? "" : utility));
  };

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-rail" aria-label="Primary rail">
        <button
          type="button"
          className="rail-mark"
          aria-label="ArchScale Central Hub"
          onClick={() => selectRole("Studio Owner")}
        >
          <Command size={20} strokeWidth={2.35} />
        </button>

        {collapsed && (
          <button
            type="button"
            className="rail-toggle"
            onClick={onToggle}
            aria-label="Expand navigation"
            title="Expand navigation"
          >
            <ChevronsRight size={18} strokeWidth={2.15} />
          </button>
        )}

        <nav className="rail-nav" aria-label="Hub navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button type="button" className="rail-button" key={label} title={label}>
              <Icon size={20} strokeWidth={2.15} />
            </button>
          ))}
        </nav>

        <div className="rail-divider" />

        <nav className="rail-roles" aria-label="Role views">
          {roleAccess.map(({ label, icon: Icon }) => (
            <button
              type="button"
              className={`rail-button ${!activeUtility && activeRole === label ? "is-active" : ""}`}
              key={label}
              title={label}
              aria-label={label}
              aria-pressed={!activeUtility && activeRole === label}
              onClick={() => selectRole(label)}
            >
              <Icon size={20} strokeWidth={2.15} />
            </button>
          ))}
        </nav>

        <div className="rail-footer" aria-label="Utility navigation">
          {isStudioOwner && (
            <button
              type="button"
              className={`rail-button ${activeUtility === "Billing" ? "is-active" : ""}`}
              title="Billing"
              aria-label="Billing"
              aria-pressed={activeUtility === "Billing"}
              onClick={() => selectUtility("Billing")}
            >
              <CreditCard size={19} strokeWidth={2.15} />
            </button>
          )}
          <button
            type="button"
            className={`rail-button ${activeUtility === "Support Centre" ? "is-active" : ""}`}
            title="Support Centre"
            aria-label="Support Centre"
            aria-pressed={activeUtility === "Support Centre"}
            onClick={() => selectUtility("Support Centre")}
          >
            <LifeBuoy size={19} strokeWidth={2.15} />
          </button>
          {isStudioOwner && (
            <button
              type="button"
              className={`rail-button ${activeUtility === "Settings" ? "is-active" : ""}`}
              title="Settings"
              aria-label="Settings"
              aria-pressed={activeUtility === "Settings"}
              onClick={() => selectUtility("Settings")}
            >
              <Settings size={19} strokeWidth={2.15} />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="context-panel">
          <div className="context-header">
            <div className="context-title">
              <strong>ArchScale</strong>
              <span>{utilityPanel ? utilityPanel.label : activeRole}</span>
            </div>
            <button type="button" className="context-toggle" onClick={onToggle} aria-label="Collapse navigation">
              <ChevronsLeft size={18} strokeWidth={2.15} />
            </button>
          </div>

          {utilityPanel ? (
            <>
              <div className="context-section utility-section">
                <span>{utilityPanel.eyebrow}</span>
                <strong>{utilityPanel.label}</strong>
              </div>

              <nav className="context-list utility-list" aria-label={`${utilityPanel.label} panel`}>
                {utilityPanel.items.map((item) => (
                  <button type="button" className="context-item utility-item" key={item}>
                    <span className="context-icon">
                      <UtilityIcon size={18} strokeWidth={2.1} />
                    </span>
                    <span>
                      <strong>{item}</strong>
                    </span>
                  </button>
                ))}
              </nav>
            </>
          ) : (
            <>
              <div className="context-section">
                <span>Role view</span>
                <strong>{activeRole}</strong>
              </div>

              <nav className="context-list" aria-label={`${activeRole} sections`}>
                {activeAccess.appNames.map((appName) => {
                  const app = appIndex.get(appName);
                  const Icon = app?.icon ?? Command;
                  return (
                    <button type="button" className="context-item" key={appName}>
                      <span className="context-icon">
                        <Icon size={18} strokeWidth={2.1} />
                      </span>
                      <span>
                        <strong>{appName}</strong>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
