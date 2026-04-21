import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Building2,
  Download,
  Filter,
  Mail,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import LeaveStatusDot from "./LeaveStatusDot";

const EmployeeList = ({ user, onNavigateToProfile, isAdmin = false }) => {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);

      let employeeData = [];

      if (isAdmin) {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
        employeeData = response.data;
      } else if (user.role === "Manager") {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(user.email)}`
        );
        employeeData = response.data;
      } else {
        employeeData = [];
        setMessage("Employees cannot view other team members");
      }

      setEmployees(employeeData);
      const activeCount = employeeData.filter((employee) => employee.is_active !== false).length;
      setStats({
        total: employeeData.length,
        active: activeCount,
      });
      setMessage(employeeData.length === 0 && user.role === "Employee" ? "" : "");
    } catch (error) {
      console.error("Error fetching employees:", error);
      setMessage("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin || (user?.email && user?.role === "Manager")) {
      fetchEmployees();
    } else if (user?.role === "Employee") {
      setEmployees([]);
      setStats({ total: 0, active: 0 });
      setLoading(false);
    }
  }, [user, isAdmin, fetchEmployees]);

  const handleActiveToggle = async (employeeId, nextStatus) => {
    try {
      setActionLoadingId(employeeId);
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/set_active/${employeeId}`,
        { is_active: nextStatus }
      );

      if (response.status === 200) {
        await fetchEmployees();
      }
    } catch (error) {
      console.error("Error updating active status:", error);
      setMessage(error.response?.data?.error || "Failed to update active status");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const departments = useMemo(
    () => ["All", ...new Set(employees.map((employee) => employee.department).filter(Boolean))],
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment =
        filterDepartment === "All" || employee.department === filterDepartment;

      const isActive = employee.is_active !== false;
      const matchesStatus =
        filterStatus === "All" ||
        (filterStatus === "Active" && isActive) ||
        (filterStatus === "Inactive" && !isActive);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, filterDepartment, filterStatus, searchTerm]);

  const downloadCSV = () => {
    const formatDateForCSV = (dateValue) => {
      if (!dateValue) return "";

      try {
        let date;

        if (typeof dateValue === "string") {
          date = new Date(dateValue.replace("Z", "").replace(/\.\d{3}/, ""));
        } else if (dateValue.$date) {
          date = new Date(dateValue.$date);
        } else {
          date = new Date(dateValue);
        }

        if (Number.isNaN(date.getTime())) {
          return "";
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
      } catch (error) {
        console.error("Date formatting error:", error);
        return "";
      }
    };

    const csvHeaders = [
      "Employee ID",
      "Name",
      "Email",
      "Designation",
      "Department",
      "Role",
      "Shift Timings",
      "Date of Joining",
      "Reports To",
      "Status",
    ];

    const csvRows = filteredEmployees.map((employee) => [
      employee.employeeId || employee._id,
      employee.name || "",
      employee.email || "",
      employee.designation || "",
      employee.department || "",
      employee.role || "Employee",
      employee.shiftTimings || "",
      formatDateForCSV(employee.dateOfJoining),
      employee.reportsToEmail || "",
      employee.is_active !== false ? "Active" : "Inactive",
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `employees_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <section className="employee-directory">
        <div className="fiori-loading-card">
          <Users size={28} />
          <div>
            <strong>Loading employee directory</strong>
            <p>Preparing workforce and reporting information.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="employee-directory">
      <header className="employee-directory-hero">
        <div>
          <div className="admin-section-overline">
            {isAdmin ? "Enterprise Directory" : "Team Directory"}
          </div>
          <h1>{isAdmin ? "Employee Directory" : "Team Members"}</h1>
          <p>
            {isAdmin
              ? "Review the full workforce directory, keep employee records visible, and move quickly into individual profiles."
              : "Review your reporting structure, filter your team by department or status, and open profiles from one place."}
          </p>
        </div>

        <div className="employee-directory-hero-actions">
          <button className="fiori-button secondary" onClick={downloadCSV}>
            <Download size={16} />
            <span>Export current view</span>
          </button>
        </div>
      </header>

      <div className="employee-directory-summary">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">{isAdmin ? "Total Workforce" : "Team Size"}</span>
            <Users size={18} />
          </div>
          <div className="fiori-stat-value">{stats.total}</div>
          <div className="fiori-stat-note">
            {isAdmin ? "Employees available in the HRMS directory" : "Direct reports in your reporting line"}
          </div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Active Members</span>
            <UserCheck size={18} />
          </div>
          <div className="fiori-stat-value">{stats.active}</div>
          <div className="fiori-stat-note">Profiles currently marked active</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Departments</span>
            <Building2 size={18} />
          </div>
          <div className="fiori-stat-value">{Math.max(departments.length - 1, 0)}</div>
          <div className="fiori-stat-note">Distinct departments in the current scope</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Filtered View</span>
            <Filter size={18} />
          </div>
          <div className="fiori-stat-value">{filteredEmployees.length}</div>
          <div className="fiori-stat-note">Employees matching the active filters</div>
        </article>
      </div>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Filters</h3>
            <p>Search and narrow the directory without leaving the workspace</p>
          </div>
        </div>

        <div className="employee-directory-filters">
          <label className="employee-filter-field employee-filter-search">
            <span>Search</span>
            <div className="employee-filter-input-shell">
              <Search size={16} />
              <input
                className="input"
                placeholder="Search by name, email, designation, or department"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </label>

          <label className="employee-filter-field">
            <span>Department</span>
            <select
              className="input"
              value={filterDepartment}
              onChange={(event) => setFilterDepartment(event.target.value)}
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label className="employee-filter-field">
            <span>Status</span>
            <select
              className="input"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>

      {filteredEmployees.length === 0 ? (
        <div className="admin-empty-state">
          <UserRound size={28} />
          <div>
            <strong>
              {searchTerm || filterDepartment !== "All" || filterStatus !== "All"
                ? "No employees match the current filters"
                : "No employees available"}
            </strong>
            <p>Adjust the filters or search terms to expand the directory view.</p>
          </div>
        </div>
      ) : (
        <div className="employee-directory-grid">
          {filteredEmployees.map((employee) => {
            const isActive = employee.is_active !== false;
            return (
              <article
                key={employee._id}
                className="employee-directory-card"
                onClick={() => onNavigateToProfile(employee._id)}
              >
                <div className="employee-card-header">
                  <div className="employee-card-identity">
                    <div className="employee-card-avatar-wrap">
                      {employee.photoUrl ? (
                        <img
                          src={employee.photoUrl}
                          alt={employee.name || "Employee"}
                          className="employee-card-avatar"
                        />
                      ) : (
                        <div className="employee-card-avatar employee-card-avatar-fallback">
                          {employee.name?.charAt(0) || "E"}
                        </div>
                      )}
                      <div className="employee-card-leave-status">
                        <LeaveStatusDot userId={employee._id} size={10} />
                      </div>
                    </div>

                    <div>
                      <h4>{employee.name || "Unnamed employee"}</h4>
                      <p>{employee.designation || "Designation not available"}</p>
                    </div>
                  </div>

                  <div className="employee-card-badges">
                    <span className={`fiori-status-pill ${isActive ? "is-approved" : "is-rejected"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    {employee.role === "Admin" && (
                      <span className="fiori-status-pill is-neutral">Admin</span>
                    )}
                  </div>
                </div>

                <div className="employee-card-details">
                  <div className="employee-card-detail">
                    <Mail size={15} />
                    <span>{employee.email || "No email available"}</span>
                  </div>
                  <div className="employee-card-detail">
                    <Building2 size={15} />
                    <span>{employee.department || "Unassigned department"}</span>
                  </div>
                  <div className="employee-card-detail">
                    <ShieldCheck size={15} />
                    <span>{employee.role || "Employee"}</span>
                  </div>
                </div>

                <div className="employee-card-footer">
                  <div className="employee-card-link">Open employee profile</div>

                  {isAdmin && (
                    <button
                      className={`fiori-button secondary ${isActive ? "danger" : ""}`}
                      disabled={actionLoadingId === employee._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleActiveToggle(employee._id, !isActive);
                      }}
                    >
                      {actionLoadingId === employee._id
                        ? "Updating..."
                        : isActive
                          ? "Mark inactive"
                          : "Mark active"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {message && (
        <div className="admin-toast is-error" style={{ position: "static", maxWidth: "100%" }}>
          {message}
        </div>
      )}
    </section>
  );
};

export default EmployeeList;
