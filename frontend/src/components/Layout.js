import React, { useState } from "react";
import { Sun, Moon, Users, ClipboardList, UserPlus, Layers } from "lucide-react";

const Layout = ({ children, activeTab, setActiveTab }) => {
  const [darkMode, setDarkMode] = useState(false);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: <Layers size={18} /> },
    { key: "addUser", label: "Add User", icon: <UserPlus size={18} /> },
    { key: "users", label: "All Users", icon: <Users size={18} /> },
    { key: "managers", label: "Manager Info", icon: <ClipboardList size={18} /> },
    { key: "leaves", label: "Leave Management", icon: <ClipboardList size={18} /> },
  ];

  return (
    <div className={`${darkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"} min-h-screen flex`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b">
          <h1 className="text-xl font-bold text-blue-600">🏢 Company HR</h1>
        </div>
        <nav className="flex-1 px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium 
                ${activeTab === item.key 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "hover:bg-blue-50 hover:text-blue-600"}`
              }
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t flex justify-between items-center">
          <p className="text-xs text-gray-500">© 2025 Prognosense</p>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-md hover:bg-gray-200"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
};

export default Layout;