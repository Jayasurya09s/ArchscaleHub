import { useEffect, useMemo, useState } from "react";
import { AppCard } from "./components/AppCard";
import { FocusStrip } from "./components/FocusStrip";
import { MobileDock } from "./components/MobileDock";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { Topbar } from "./components/Topbar";
import { applicationGroups, roleAccess } from "./data/apps";

const todayLabel = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long"
}).format(new Date());

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [activeRole, setActiveRole] = useState("Studio Owner");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [activeMobileSheet, setActiveMobileSheet] = useState("");

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const allowedApps = roleAccess.find((role) => role.label === activeRole)?.appNames ?? [];

    return applicationGroups
      .map((group) => ({
        ...group,
        apps: group.apps.filter((app) => {
          const isAllowed = allowedApps.includes(app.name);
          const matchesQuery =
            !normalized || `${group.name} ${app.name} ${app.description}`.toLowerCase().includes(normalized);
          return isAllowed && matchesQuery;
        })
      }))
      .filter((group) => group.apps.length);
  }, [activeRole, query]);

  const cardVariants = useMemo(() => {
    if (activeRole === "Studio Owner") {
      return {
        Projects: "visual",
        Documents: "action",
        Approvals: "select",
        "Site Visits": "standard"
      };
    }
    const variants = ["visual", "action", "select"];
    return Object.fromEntries(
      filteredGroups.flatMap((group) => group.apps).map((app, index) => [app.name, variants[index % variants.length]])
    );
  }, [activeRole, filteredGroups]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openItem = (name) => {
    setToast(`${name} is ready to connect as its own application.`);
  };

  return (
    <div className={`app-shell preview-${previewMode} ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        activeRole={activeRole}
        onRoleSelect={setActiveRole}
      />

      <main className="main-area">
        <Topbar
          query={query}
          onQueryChange={setQuery}
          onWorkspaceOpen={() => openItem("Workspace")}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          notificationsOpen={notificationsOpen}
          onNotificationsToggle={() => {
            setNotificationsOpen((value) => !value);
            setProfileOpen(false);
          }}
          profileOpen={profileOpen}
          onProfileToggle={() => {
            setProfileOpen((value) => !value);
            setNotificationsOpen(false);
          }}
        />

        <div className="page-content">
          <section className="overview-panel">
            <div className="welcome">
              <p>{todayLabel}</p>
              <h1>Good morning, Shanker.</h1>
              <span>Open an application or pick up what needs attention.</span>
            </div>
            <FocusStrip onOpen={openItem} />
          </section>

          <section className="applications-section">
            {filteredGroups.length ? (
              <div className="application-groups">
                {filteredGroups.map((group) => (
                  <section className="application-group" key={group.name}>
                    <div className="group-heading">
                      <div>
                        <h3>{group.name}</h3>
                      </div>
                      <span>{group.apps.length}</span>
                    </div>
                    <div className={`app-grid cards-${group.apps.length}`}>
                      {group.apps.map((app) => (
                        <AppCard
                          app={app}
                          key={app.name}
                          onOpen={openItem}
                          variant={cardVariants[app.name] ?? "standard"}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No applications found</strong>
                <span>Try a different search term.</span>
              </div>
            )}
          </section>
        </div>
      </main>

      <MobileDock
        activeRole={activeRole}
        activeSheet={activeMobileSheet}
        onSheetChange={setActiveMobileSheet}
        onRoleSelect={setActiveRole}
      />

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

export default App;
