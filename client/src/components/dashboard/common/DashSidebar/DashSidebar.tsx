import { Link } from "react-router-dom";
import UserAvatar from "../UserAvatar/UserAvatar.tsx";
import Icon, { type IconName } from "../Icons.tsx";
import "./DashSidebar.css";

interface NavItem {
  tab:   string;
  icon:  IconName;
  label: string;
  badge?: number;
}

interface DashSidebarProps {
  name:        string;
  role:        string;
  activeTab:   string;
  navItems:    NavItem[];
  onTabChange: (tab: string) => void;
  footerNote:  string;
}

export default function DashSidebar({
  name, role, activeTab, navItems, onTabChange, footerNote,
}: DashSidebarProps) {
  return (
    <aside className="dsb-sidebar">
      {/* Profile */}
      <div className="dsb-profile">
        <UserAvatar name={name} size="md" />
        <div className="dsb-profile-text">
          <p className="dsb-name">{name}</p>
          <p className="dsb-role">{role}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="dsb-nav" aria-label="Dashboard">
        <p className="dsb-group">Workspace</p>
        {navItems.map(item => (
          <button
            key={item.tab}
            className={`dsb-btn ${activeTab === item.tab ? "active" : ""}`}
            aria-current={activeTab === item.tab ? "page" : undefined}
            title={item.label}
            onClick={() => onTabChange(item.tab)}
          >
            <span className="dsb-icon"><Icon name={item.icon} /></span>
            <span className="dsb-label">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="dsb-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="dsb-footer">
        <Link to="/" className="dsb-site-link">← Back to Cineverse</Link>
        <p className="dsb-note">{footerNote}</p>
      </div>
    </aside>
  );
}
