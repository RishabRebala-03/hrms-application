import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BarChart3, CalendarClock, CheckCircle2, Filter, RefreshCw, Search, Users } from "lucide-react";
import DataTable from "./DataTable";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const AdminLeaves = ({ user }) => {
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ leave_types: [], statuses: [], employees: [], projects: [] });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    leaveType: "all",
    employeeId: "all",
    projectId: "all",
    sortBy: "date",
    order: "desc",
    filter: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [projectAnalytics, setProjectAnalytics] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchLeaveTable = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves`, {
        params: {
          requester_id: user?.id,
          page,
          limit: 10,
          search: filters.search || undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          leave_type: filters.leaveType !== "all" ? filters.leaveType : undefined,
          employee_id: filters.employeeId !== "all" ? filters.employeeId : undefined,
          project_id: filters.projectId !== "all" ? filters.projectId : undefined,
          sort_by: filters.sortBy,
          order: filters.order,
          filter: filters.filter || undefined,
          start_date: filters.filter ? undefined : filters.startDate || undefined,
          end_date: filters.filter ? undefined : filters.endDate || undefined,
        },
      });
      setRecords(response.data.items || []);
      setFilterOptions(response.data.filter_options || { leave_types: [], statuses: [], employees: [], projects: [] });
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to load leave records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, user?.id]);

  const fetchPendingLeaves = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/pending/admin`);
      setPendingLeaves(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setPendingLeaves([]);
    }
  }, []);

  const fetchProjectAnalytics = useCallback(async () => {
    if (!filters.projectId || filters.projectId === "all") {
      setProjectAnalytics(null);
      return;
    }
    try {
      const selectedProject = filterOptions.projects.find((option) => option.value === filters.projectId);
      if (!selectedProject?.label) {
        setProjectAnalytics(null);
        return;
      }
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/analytics/project`, {
        params: { project: selectedProject.label },
      });
      setProjectAnalytics(response.data);
    } catch (error) {
      setProjectAnalytics(null);
    }
  }, [filterOptions.projects, filters.projectId]);

  useEffect(() => {
    fetchLeaveTable();
  }, [fetchLeaveTable]);

  useEffect(() => {
    fetchPendingLeaves();
  }, [fetchPendingLeaves]);

  useEffect(() => {
    fetchProjectAnalytics();
  }, [fetchProjectAnalytics]);

  const handleDecision = async (status) => {
    if (!selectedLeave) return;
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/update_status/${selectedLeave._id}`, {
        status,
        approved_by: user?.name || user?.email || "Admin",
        rejection_reason: status === "Rejected" ? rejectReason : "",
      });
      setSelectedLeave(null);
      setRejectReason("");
      fetchLeaveTable();
      fetchPendingLeaves();
    } catch (error) {
      setMessage(error.response?.data?.error || `Failed to ${status.toLowerCase()} leave`);
    }
  };

  const summary = useMemo(() => {
    const approved = records.filter((leave) => leave.status === "Approved").length;
    const pending = records.filter((leave) => leave.status === "Pending").length;
    return {
      total,
      approved,
      pending,
      escalated: pendingLeaves.length,
    };
  }, [pendingLeaves.length, records, total]);

  return (
    <section className="leave-admin-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Leave Administration</div>
          <h1>Leave Management</h1>
          <p>Review all employees' leave records in a paginated table, filter by employee, type, date, and project, and process escalated approvals without leaving the workspace.</p>
        </div>
        <div className="employee-directory-hero-actions">
          <button className="fiori-button secondary" onClick={() => { fetchLeaveTable(); fetchPendingLeaves(); }}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <div className="employee-directory-summary">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Records</span>
            <CalendarClock size={18} />
          </div>
          <div className="fiori-stat-value">{summary.total}</div>
          <div className="fiori-stat-note">Leave records matching the current filters</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Approved</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="fiori-stat-value">{summary.approved}</div>
          <div className="fiori-stat-note">Approved records visible on the current page</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Pending approvals</span>
            <Users size={18} />
          </div>
          <div className="fiori-stat-value">{pendingLeaves.length}</div>
          <div className="fiori-stat-note">Escalated or admin-assigned leave requests</div>
        </article>
      </div>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Filters</h3>
            <p>Sort by leave date, employee name, or leave type. Filter by previous calendar month, custom date range, employee, and project.</p>
          </div>
        </div>
        <div className="employee-directory-filters">
          <label className="employee-filter-field employee-filter-search">
            <span>Search</span>
            <div className="employee-filter-input-shell">
              <Search size={16} />
              <input className="input" value={filters.search} onChange={(event) => { setFilters((current) => ({ ...current, search: event.target.value })); setPage(1); }} placeholder="Employee, project, status, or reason" />
            </div>
          </label>
          <label className="employee-filter-field">
            <span>Status</span>
            <select className="input" value={filters.status} onChange={(event) => { setFilters((current) => ({ ...current, status: event.target.value })); setPage(1); }}>
              <option value="all">All</option>
              {filterOptions.statuses.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="employee-filter-field">
            <span>Leave type</span>
            <select className="input" value={filters.leaveType} onChange={(event) => { setFilters((current) => ({ ...current, leaveType: event.target.value })); setPage(1); }}>
              <option value="all">All</option>
              {filterOptions.leave_types.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="employee-filter-field">
            <span>Employee</span>
            <select className="input" value={filters.employeeId} onChange={(event) => { setFilters((current) => ({ ...current, employeeId: event.target.value })); setPage(1); }}>
              <option value="all">All</option>
              {filterOptions.employees.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="employee-filter-field">
            <span>Project</span>
            <select className="input" value={filters.projectId} onChange={(event) => { setFilters((current) => ({ ...current, projectId: event.target.value })); setPage(1); }}>
              <option value="all">All</option>
              {filterOptions.projects.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="employee-filter-field">
            <span>Leave Window</span>
            <select className="input" value={filters.filter} onChange={(event) => { setFilters((current) => ({ ...current, filter: event.target.value })); setPage(1); }}>
              <option value="">None</option>
              <option value="last_month">Last month</option>
            </select>
          </label>
          <label className="employee-filter-field">
            <span>From</span>
            <input className="input" type="date" value={filters.startDate} onChange={(event) => { setFilters((current) => ({ ...current, startDate: event.target.value, filter: "" })); setPage(1); }} />
          </label>
          <label className="employee-filter-field">
            <span>To</span>
            <input className="input" type="date" value={filters.endDate} onChange={(event) => { setFilters((current) => ({ ...current, endDate: event.target.value, filter: "" })); setPage(1); }} />
          </label>
          <label className="employee-filter-field">
            <span>Sort</span>
            <select className="input" value={`${filters.sortBy}:${filters.order}`} onChange={(event) => {
              const [sortBy, order] = event.target.value.split(":");
              setFilters((current) => ({ ...current, sortBy, order }));
            }}>
              <option value="date:desc">Date newest</option>
              <option value="date:asc">Date oldest</option>
              <option value="name:asc">Employee A-Z</option>
              <option value="name:desc">Employee Z-A</option>
              <option value="leave_type:asc">Leave type A-Z</option>
              <option value="leave_type:desc">Leave type Z-A</option>
            </select>
          </label>
        </div>
      </section>

      {projectAnalytics ? (
        <section className="tea-summary-grid">
          <article className="fiori-stat-card">
            <div className="fiori-stat-topline">
              <span className="fiori-stat-label">Project employees</span>
              <Users size={18} />
            </div>
            <div className="fiori-stat-value">{projectAnalytics.total_employees}</div>
            <div className="fiori-stat-note">{projectAnalytics.project}</div>
          </article>
          <article className="fiori-stat-card">
            <div className="fiori-stat-topline">
              <span className="fiori-stat-label">Leave days</span>
              <BarChart3 size={18} />
            </div>
            <div className="fiori-stat-value">{projectAnalytics.total_leaves_taken}</div>
            <div className="fiori-stat-note">Total leave days taken by the project team</div>
          </article>
          <article className="fiori-stat-card">
            <div className="fiori-stat-topline">
              <span className="fiori-stat-label">Distribution</span>
              <Filter size={18} />
            </div>
            <div className="fiori-stat-value">{projectAnalytics.leave_distribution.length}</div>
            <div className="fiori-stat-note">{projectAnalytics.leave_distribution.map((item) => `${item.leave_type}: ${item.days}`).join(", ") || "No leaves recorded"}</div>
          </article>
        </section>
      ) : null}

      <section className="fiori-panel">
        <div className="leave-tabs">
          <button className={`leave-tab-button ${activeTab === "records" ? "active" : ""}`} onClick={() => setActiveTab("records")}>Leave records</button>
          <button className={`leave-tab-button ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>Pending approvals</button>
        </div>
      </section>

      {activeTab === "records" ? (
        <DataTable
          columns={[
            {
              key: "employee_name",
              header: "Employee",
              render: (row) => (
                <div className="fiori-primary-cell">
                  <strong>{row.employee_name}</strong>
                  <span>{row.employee_department || "No department"}</span>
                </div>
              ),
            },
            { key: "primary_project", header: "Project" },
            { key: "leave_type", header: "Leave Type" },
            { key: "status", header: "Status" },
            { key: "start_date", header: "From", render: (row) => formatDate(row.approved_start_date || row.start_date) },
            { key: "end_date", header: "To", render: (row) => formatDate(row.approved_end_date || row.end_date) },
            { key: "days", header: "Days", render: (row) => row.approved_days || row.days || 0 },
          ]}
          rows={records}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyTitle="No leave records match the current filters"
          emptyDescription="Try widening the employee, project, type, or date filters."
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "employee_name",
              header: "Employee",
              render: (row) => (
                <div className="fiori-primary-cell">
                  <strong>{row.employee_name}</strong>
                  <span>{row.employee_email || "No email available"}</span>
                </div>
              ),
            },
            { key: "leave_type", header: "Leave Type" },
            { key: "status", header: "Status" },
            { key: "start_date", header: "From", render: (row) => formatDate(row.start_date) },
            { key: "end_date", header: "To", render: (row) => formatDate(row.end_date) },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="fiori-table-actions">
                  <button className="fiori-button secondary danger" onClick={() => { setSelectedLeave(row); setRejectReason(""); }}>
                    Review
                  </button>
                </div>
              ),
            },
          ]}
          rows={pendingLeaves}
          emptyTitle="No pending approvals"
          emptyDescription="All escalated or admin-owned approvals are resolved for now."
        />
      )}

      {selectedLeave ? (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <h2>{selectedLeave.employee_name}</h2>
                <p>{selectedLeave.leave_type} from {formatDate(selectedLeave.start_date)} to {formatDate(selectedLeave.end_date)}</p>
              </div>
              <button className="fiori-button secondary" onClick={() => setSelectedLeave(null)}>Close</button>
            </div>
            <div className="admin-approval-details">
              <div>
                <span>Status</span>
                <strong>{selectedLeave.status}</strong>
              </div>
              <div>
                <span>Project</span>
                <strong>{selectedLeave.primary_project || "Unassigned"}</strong>
              </div>
              <div className="is-wide">
                <span>Reason</span>
                <strong>{selectedLeave.reason || "No reason provided"}</strong>
              </div>
            </div>
            <label className="fiori-form-field">
              <span>Rejection reason</span>
              <textarea className="input" rows="4" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Required only when rejecting the request" />
            </label>
            <div className="admin-modal-actions">
              <button className="fiori-button secondary danger" onClick={() => handleDecision("Rejected")}>Reject</button>
              <button className="fiori-button primary" onClick={() => handleDecision("Approved")}>Approve</button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <div className="admin-toast is-error">{message}</div> : null}
    </section>
  );
};

export default AdminLeaves;
