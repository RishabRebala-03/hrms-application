// src/components/Sidebar.js
import React from "react";
import logo from "../assets/naxicon.png";

const Sidebar = ({ section, setSection, role, restricted = [], isOpen }) => {
  const buttons = [
    { key: "dashboard",    label: "🏠 Dashboard",              roles: ["Admin", "Manager", "Employee"] },
    { key: "employees",    label: "👥 Employees",              roles: ["Admin", "Manager"] },
    { key: "leaves",       label: "📋 Leaves",                 roles: ["Admin", "Manager", "Employee"] },
    { key: "tea-coffee",   label: "☕ Tea/Coffee",             roles: ["Admin", "Manager", "Employee"] },
//    { key: "timesheets",   label: "⏱️ Timesheets",            roles: ["Admin", "Manager", "Employee"] },
    { key: "policy",       label: "📄 Policy",                 roles: ["Admin", "Manager", "Employee"] },
    { key: "projects",     label: "📊 Projects",               roles: ["Admin"] },
    { key: "apply-behalf", label: "📝 Apply Leave on Behalf",  roles: ["Admin"] },
    { key: "logs",         label: "📜 Change Logs",            roles: ["Admin"] },
    { key: "add",          label: "➕ Add Employee",           roles: ["Admin"] },
    { key: "holidays",     label: "🎉 Holidays",               roles: ["Admin"] },
    { key: "calendar",     label: "📅 Calendar",               roles: ["Admin", "Manager", "Employee"] },
  ];

  const visibleButtons = buttons.filter(
    (btn) => !restricted.includes(btn.key) && (!role || btn.roles.includes(role))
  );

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div
        className="brand"
        style={{
          padding: "12px 0 4px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <img
          src={logo}
          alt="Naxrita Logo"
          style={{
            width: 90,
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      <nav className="nav" style={{ marginTop: 4 }}>
        {visibleButtons.map((btn) => (
          <button
            key={btn.key}
            className={section === btn.key ? "active" : ""}
            onClick={() => setSection(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <div className="footer">
        <div style={{ fontSize: 12 }}>© {new Date().getFullYear()} Naxrita</div>
      </div>
    </aside>
  );
};

export default Sidebar;
