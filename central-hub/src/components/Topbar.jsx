import { Bell, ChevronDown, Monitor, Search, Smartphone, Tablet, X } from "lucide-react";

export function Topbar({
  query,
  onQueryChange,
  onWorkspaceOpen,
  previewMode,
  onPreviewModeChange,
  notificationsOpen,
  onNotificationsToggle,
  profileOpen,
  onProfileToggle
}) {
  return (
    <header className="topbar">
      <label className="search-field">
        <Search size={18} strokeWidth={2.2} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search applications"
          aria-label="Search applications"
        />
        {query && (
          <button type="button" onClick={() => onQueryChange("")} aria-label="Clear search">
            <X size={16} strokeWidth={2.2} />
          </button>
        )}
      </label>

      <div className="topbar-actions">
        <button type="button" className="topbar-workspace" onClick={onWorkspaceOpen}>
          <span className="status-dot" />
          <span className="workspace-label">Workspace</span>
        </button>
        <div className="menu-anchor notification-anchor">
          <button
            type="button"
            className={`icon-button ${notificationsOpen ? "is-selected" : ""}`}
            aria-label="Notifications"
            onClick={onNotificationsToggle}
          >
            <Bell size={20} strokeWidth={2.15} />
            <span className="notification-dot" />
          </button>
          {notificationsOpen && (
            <div className="popover notification-popover">
              <div className="popover-heading">
                <strong>Notifications</strong>
                <span>3 new</span>
              </div>
              <button type="button">
                <strong>Material board ready</strong>
                <span>Luxury Villa · 12 min ago</span>
              </button>
              <button type="button">
                <strong>Site report uploaded</strong>
                <span>Office Tower · 48 min ago</span>
              </button>
              <button type="button">
                <strong>Budget needs review</strong>
                <span>Modern Residence · 2 hr ago</span>
              </button>
            </div>
          )}
        </div>

        <div className="device-switcher" aria-label="Preview device">
          {[
            { value: "desktop", label: "Desktop preview", icon: Monitor },
            { value: "tablet", label: "Tablet preview", icon: Tablet },
            { value: "mobile", label: "Mobile preview", icon: Smartphone }
          ].map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              className={previewMode === value ? "is-selected" : ""}
              aria-label={label}
              aria-pressed={previewMode === value}
              key={value}
              onClick={() => onPreviewModeChange(value)}
              title={label}
            >
              <Icon size={17} strokeWidth={2.1} />
            </button>
          ))}
        </div>

        <div className="menu-anchor profile-anchor">
          <button type="button" className="profile-button" onClick={onProfileToggle}>
            <span className="avatar">SD</span>
            <span className="profile-copy">
              <strong>Shanker</strong>
              <small>Atelier Studio</small>
            </span>
            <ChevronDown size={16} strokeWidth={2.2} />
          </button>
          {profileOpen && (
            <div className="popover profile-popover">
              <button type="button">My profile</button>
              <button type="button">Workspace settings</button>
              <button type="button">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
