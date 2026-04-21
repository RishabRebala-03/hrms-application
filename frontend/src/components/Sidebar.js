import React from "react";
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  Coffee,
  FileText,
  FolderKanban,
  Home,
  NotebookPen,
  ScrollText,
  UserCog,
  Users,
} from "lucide-react";
import logo from "../assets/naxicon.png";

const buttons = [
  { key: "dashboard", label: "Overview", roles: ["Admin", "Manager", "Employee"], icon: Home },
  { key: "employees", label: "Employees", roles: ["Admin", "Manager"], icon: Users },
  { key: "leaves", label: "Leave Management", roles: ["Admin", "Manager", "Employee"], icon: ClipboardList },
  { key: "tea-coffee", label: "Tea and Coffee", roles: ["Admin", "Manager", "Employee"], icon: Coffee },
  { key: "policy", label: "Policies", roles: ["Admin", "Manager", "Employee"], icon: FileText },
  { key: "projects", label: "Projects", roles: ["Admin"], icon: FolderKanban },
  { key: "apply-behalf", label: "Apply on Behalf", roles: ["Admin"], icon: NotebookPen },
  { key: "logs", label: "Audit Logs", roles: ["Admin"], icon: ScrollText },
  { key: "add", label: "Employee Setup", roles: ["Admin"], icon: UserCog },
  { key: "holidays", label: "Holiday Calendar", roles: ["Admin"], icon: Briefcase },
  { key: "calendar", label: "Enterprise Calendar", roles: ["Admin", "Manager", "Employee"], icon: CalendarDays },
];

const Sidebar = ({ section, setSection, role, restricted = [], isOpen }) => {
  const visibleButtons = buttons.filter(
    (btn) => !restricted.includes(btn.key) && (!role || btn.roles.includes(role))
  );

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">
          <img src={logo} alt="Naxrita" />
        </div>
        <div className="brand-copy">
          <span className="brand-eyebrow">Human Resources</span>
          <strong>Enterprise Workbench</strong>
        </div>
      </div>

      <div className="sidebar-section-label">Navigation</div>

      <nav className="nav">
        {visibleButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = section === btn.key;

          return (
            <button
              key={btn.key}
              className={isActive ? "active" : ""}
              onClick={() => setSection(btn.key)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={1.9} />
              <span>{btn.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="footer">
        <div className="footer-title">Naxrita HRMS</div>
        <div className="footer-meta">Enterprise operations console</div>
      </div>
    </aside>
  );
};

export default Sidebar;
