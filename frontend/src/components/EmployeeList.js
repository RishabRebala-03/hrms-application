// src/components/EmployeeList.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import LeaveStatusDot from './LeaveStatusDot';

const EmployeeList = ({ user, onNavigateToProfile, isAdmin = false }) => {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      let employeeData = [];
      
      if (isAdmin) {
        // Admin: Fetch ALL users from the system
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
        employeeData = res.data;
      } else if (user.role === "Manager") {
        // Manager: Fetch only direct reports (team members)
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(user.email)}`
        );
        employeeData = res.data;
      } else {
        // Employee: Cannot see any other employees
        employeeData = [];
        setMessage("Employees cannot view other team members");
      }

      setEmployees(employeeData);
      const activeCount = employeeData.filter((emp) => emp.is_active !== false).length;
      setStats({
        total: employeeData.length,
        active: activeCount,
      });
      setMessage(employeeData.length === 0 && user.role === "Employee" ? "" : "");
    } catch (err) {
      console.error("Error fetching employees:", err);
      setMessage("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin || (user?.email && user?.role === "Manager")) {
      fetchEmployees();
    } else if (user?.role === "Employee") {
      // For employees, show empty state immediately
      setEmployees([]);
      setStats({ total: 0, active: 0 });
      setLoading(false);
    }
  }, [user, isAdmin]);

  const handleActiveToggle = async (employeeId, nextStatus) => {
    try {
      setActionLoadingId(employeeId);
      const res = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/set_active/${employeeId}`,
        { is_active: nextStatus }
      );

      if (res.status === 200) {
        await fetchEmployees();
      }
    } catch (err) {
      console.error("Error updating active status:", err);
      setMessage(err.response?.data?.error || "Failed to update active status");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setActionLoadingId(null);
    }
  };


const downloadCSV = () => {
  // Helper function to format date properly
  const formatDateForCSV = (dateValue) => {
    if (!dateValue) return "";
    
    try {
      let date;
      
      // Handle different date formats
      if (typeof dateValue === "string") {
        date = new Date(dateValue.replace("Z", "").replace(/\.\d{3}/, ""));
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else {
        date = new Date(dateValue);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "";
      }
      
      // Format as DD/MM/YYYY for better compatibility
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "";
    }
  };
  
  // Prepare CSV data
  const csvHeaders = [
    "Employee ID",
    "Name",
    "Email",
    "Designation",
    "Department",
    "Role",
    "Shift Timings",
    "Date of Joining",
    "Reports To"
  ];
  
  const csvRows = filteredEmployees.map(emp => [
    emp.employeeId || emp._id,
    emp.name || "",
    emp.email || "",
    emp.designation || "",
    emp.department || "",
    emp.role || "Employee",
    emp.shiftTimings || "",
    formatDateForCSV(emp.dateOfJoining),  // Use the helper function
    emp.reportsToEmail || ""
  ]);
  
  // Create CSV content
  const csvContent = [
    csvHeaders.join(","),
    ...csvRows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `employees_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  };

  const departments = ["All", ...new Set(employees.map(emp => emp.department).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "All" || emp.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="panel">
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16 }}>Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>
          {isAdmin ? "All Employees" : "My Team"}
        </h3>
        <p className="muted">
          {isAdmin 
            ? "View and manage all employees in the organization" 
            : "View and manage your team members"}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>
            {isAdmin ? "Total Employees" : "Team Members"}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{stats.total}</div>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Active Members
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#10b981" }}>{stats.active}</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, marginBottom: 24 }}>
        <input
          className="input"
          placeholder="Search by name, email, or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ fontSize: 14 }}
        />
        <select
          className="input"
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          style={{ minWidth: 180 }}
        >
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <button
          className="btn"
          onClick={downloadCSV}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            whiteSpace: "nowrap"
          }}
        >
          <span>📥</span>
          <span>Download CSV</span>
        </button>
      </div>

      {/* Employee List */}
      {filteredEmployees.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {searchTerm || filterDepartment !== "All" 
              ? "No employees match your filters" 
              : "No employees found"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filteredEmployees.map((employee) => (
            <div
              key={employee._id}
              className="card"
              style={{
                padding: 20,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => onNavigateToProfile(employee._id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.borderColor = "#667eea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ position: 'relative' }}>
                  {employee.photoUrl ? (
                    <img
                      src={employee.photoUrl}
                      alt=""
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #e5e7eb",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      {employee.name?.charAt(0) || "E"}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: 2 }}>
                    <LeaveStatusDot userId={employee._id} size={10} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
                    {employee.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {employee.designation}
                  </div>
                </div>
                <div
                  style={{
                    background: employee.is_active !== false ? "#dcfce7" : "#fee2e2",
                    color: employee.is_active !== false ? "#166534" : "#991b1b",
                    border: `1px solid ${employee.is_active !== false ? "#86efac" : "#fca5a5"}`,
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {employee.is_active !== false ? "ACTIVE" : "INACTIVE"}
                </div>
                {employee.role === "Admin" && (
                  <div
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    ADMIN
                  </div>
                )}
              </div>

              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                📧 {employee.email}
              </div>

              {employee.department && (
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  🏢 {employee.department}
                </div>
              )}

              {isAdmin && (
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn ghost"
                    disabled={actionLoadingId === employee._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActiveToggle(employee._id, !(employee.is_active !== false));
                    }}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      padding: "8px 10px",
                      cursor: actionLoadingId === employee._id ? "not-allowed" : "pointer",
                      background: employee.is_active !== false ? "#fff5f5" : "#f0fdf4",
                      color: employee.is_active !== false ? "#b91c1c" : "#166534",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {actionLoadingId === employee._id
                      ? "Updating..."
                      : employee.is_active !== false
                      ? "Mark Inactive"
                      : "Mark Active"}
                  </button>
                </div>
              )}


              <div
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  background: "#f3f4f6",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#6b7280",
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                Click to view profile →
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fef2f2",
            borderRadius: 8,
            color: "#ef4444",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
