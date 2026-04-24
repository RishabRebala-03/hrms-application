import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Building2, Download, Search, UserCheck, UserRound, Users } from "lucide-react";
import DataTable from "./DataTable";

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const EmployeeList = ({ user, onNavigateToProfile, isAdmin = false }) => {
  const [employees, setEmployees] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ departments: [], projects: [] });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [projectId, setProjectId] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [joiningStart, setJoiningStart] = useState("");
  const [joiningEnd, setJoiningEnd] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    if (!isAdmin && user?.role !== "Manager") {
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = {
        requester_id: user?.id,
        page,
        limit: PAGE_SIZE,
        search: searchTerm || undefined,
        project_id: projectId !== "All" ? projectId : undefined,
        joining_from: joiningStart || undefined,
        joining_to: joiningEnd || undefined,
        sort_by: sortBy,
        order,
      };

      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/employees`, { params });
      setEmployees(response.data.items || []);
      setFilterOptions(response.data.filter_options || { departments: [], projects: [] });
      setPage(response.data.page || 1);
      setTotalPages(response.data.total_pages || 1);
      setTotal(response.data.total || 0);
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, joiningEnd, joiningStart, order, page, projectId, searchTerm, sortBy, user?.id, user?.role]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleActiveToggle = useCallback(async (employeeId, nextStatus) => {
    try {
      setActionLoadingId(employeeId);
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/users/set_active/${employeeId}`, { is_active: nextStatus });
      fetchEmployees();
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to update employee status");
    } finally {
      setActionLoadingId(null);
    }
  }, [fetchEmployees]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Employee",
        render: (row) => (
          <div className="fiori-primary-cell">
            <strong>{row.name || "Unnamed employee"}</strong>
            <span>{row.email || "No email available"}</span>
          </div>
        ),
      },
      { key: "department", header: "Department" },
      { key: "designation", header: "Designation" },
      { key: "primaryProject", header: "Project" },
      { key: "dateOfJoining", header: "Joining Date", render: (row) => formatDate(row.dateOfJoining) },
      { key: "status", header: "Status", render: (row) => (row.is_active === false ? "Inactive" : "Active") },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="fiori-table-actions">
            <button className="fiori-button secondary" onClick={() => onNavigateToProfile(row._id)}>
              Open
            </button>
            {isAdmin ? (
              <button
                className={`fiori-button secondary ${row.is_active === false ? "" : "danger"}`}
                disabled={actionLoadingId === row._id}
                onClick={() => handleActiveToggle(row._id, row.is_active === false)}
              >
                {actionLoadingId === row._id ? "Updating..." : row.is_active === false ? "Mark active" : "Mark inactive"}
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [actionLoadingId, handleActiveToggle, isAdmin, onNavigateToProfile]
  );

  const activeCount = employees.filter((employee) => employee.is_active !== false).length;

  const handleExport = async (format) => {
    const params = new URLSearchParams({
      page: "1",
      limit: String(Math.max(total, PAGE_SIZE)),
      requester_id: user?.id || "",
      sort_by: sortBy,
      order,
    });
    if (searchTerm) params.set("search", searchTerm);
    if (projectId !== "All") params.set("project_id", projectId);
    if (joiningStart) params.set("joining_from", joiningStart);
    if (joiningEnd) params.set("joining_to", joiningEnd);

    const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/employees`, { params });
    const headers = ["Name", "Email", "Department", "Designation", "Project", "Joining Date", "Status"];
    const rows = (response.data.items || []).map((row) =>
      [row.name, row.email, row.department, row.designation, row.primaryProject, formatDate(row.dateOfJoining), row.is_active === false ? "Inactive" : "Active"]
    );
    const payload = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell || ""}"`).join(","))].join("\n");
    const blob = new Blob([payload], { type: format === "excel" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `employees_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xls" : "csv"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  if (!isAdmin && user?.role !== "Manager") {
    return (
      <section className="employee-directory">
        <div className="admin-empty-state">
          <UserRound size={28} />
          <div>
            <strong>Employee directory is not available for this role</strong>
            <p>Managers and admins can access the structured employee listing.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="employee-directory">
      <header className="employee-directory-hero">
        <div>
          <div className="admin-section-overline">{isAdmin ? "Enterprise Directory" : "Team Directory"}</div>
          <h1>{isAdmin ? "Employee Directory" : "Team Members"}</h1>
          <p>Search by name or email, filter by project and joining date, and page through employees without loading unnecessary data.</p>
        </div>
        <div className="employee-directory-hero-actions">
          <button className="fiori-button secondary" onClick={() => handleExport("csv")}>
            <Download size={16} />
            <span>CSV</span>
          </button>
          <button className="fiori-button secondary" onClick={() => handleExport("excel")}>
            <Download size={16} />
            <span>Excel</span>
          </button>
        </div>
      </header>

      <div className="employee-directory-summary">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Employees</span>
            <Users size={18} />
          </div>
          <div className="fiori-stat-value">{total}</div>
          <div className="fiori-stat-note">Records matching the current server-side filters</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Active</span>
            <UserCheck size={18} />
          </div>
          <div className="fiori-stat-value">{activeCount}</div>
          <div className="fiori-stat-note">Employees active on the current page</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Departments</span>
            <Building2 size={18} />
          </div>
          <div className="fiori-stat-value">{filterOptions.departments.length}</div>
          <div className="fiori-stat-note">Distinct departments available in the filter set</div>
        </article>
      </div>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Filters</h3>
            <p>Search by employee name or email, then narrow the results by project and joining date range.</p>
          </div>
        </div>

        <div className="employee-directory-filters">
          <label className="employee-filter-field employee-filter-search">
            <span>Search</span>
            <div className="employee-filter-input-shell">
              <Search size={16} />
              <input className="input" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Search by name or email" />
            </div>
          </label>

          <label className="employee-filter-field">
            <span>Project</span>
            <select className="input" value={projectId} onChange={(event) => { setProjectId(event.target.value); setPage(1); }}>
              <option value="All">All</option>
              {filterOptions.projects.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="employee-filter-field">
            <span>Joining From</span>
            <input className="input" type="date" value={joiningStart} onChange={(event) => { setJoiningStart(event.target.value); setPage(1); }} />
          </label>

          <label className="employee-filter-field">
            <span>Joining To</span>
            <input className="input" type="date" value={joiningEnd} onChange={(event) => { setJoiningEnd(event.target.value); setPage(1); }} />
          </label>

          <label className="employee-filter-field">
            <span>Sort</span>
            <select className="input" value={`${sortBy}:${order}`} onChange={(event) => {
              const [nextSortBy, nextOrder] = event.target.value.split(":");
              setSortBy(nextSortBy);
              setOrder(nextOrder);
            }}>
              <option value="name:asc">Name A-Z</option>
              <option value="name:desc">Name Z-A</option>
              <option value="joining_date:desc">Joining date newest</option>
              <option value="joining_date:asc">Joining date oldest</option>
            </select>
          </label>
        </div>
      </section>

      <DataTable
        columns={columns}
        rows={employees}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No employees match the current filters"
        emptyDescription="Try widening the search, department, project, or joining date range."
      />

      {message ? (
        <div className="admin-toast is-error" style={{ position: "static", maxWidth: "100%" }}>
          {message}
        </div>
      ) : null}
    </section>
  );
};

export default EmployeeList;
