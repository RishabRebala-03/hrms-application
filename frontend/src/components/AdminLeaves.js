import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  GitBranch,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartPalette = ["#0a6ed1", "#5b738b", "#8fb5d9", "#d1e3f8", "#0f2742", "#91c8f6"];

const statusToneMap = {
  Approved: "is-approved",
  Rejected: "is-rejected",
  Cancelled: "is-neutral",
  Pending: "is-pending",
};

const formatDate = (value) => {
  if (!value) return "Not available";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Not available";
  }
};

const formatDateTime = (value) => {
  if (!value) return "Not available";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Not available";
  }
};

const shortLabel = (value, max = 12) => {
  if (!value) return "Unassigned";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

const dayDiff = (start, end) => {
  const first = new Date(start);
  const second = new Date(end);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return null;
  return Math.max(0, Math.round((second - first) / (1000 * 60 * 60 * 24)));
};

const getLeaveWindow = (leave) => {
  if (leave.is_partial_approval && leave.approved_start_date && leave.approved_end_date) {
    return `${formatDate(leave.approved_start_date)} to ${formatDate(leave.approved_end_date)}`;
  }

  return `${formatDate(leave.start_date)} to ${formatDate(leave.end_date)}`;
};

const getDaysLabel = (leave) => {
  if (leave.leave_type === "Early Logout") {
    return leave.logout_time ? `Logout at ${leave.logout_time}` : "Early logout";
  }

  const days = leave.approved_days || leave.days || 0;
  return `${days} day${days === 1 ? "" : "s"}`;
};

const getApproverLabel = (approverId, userMap, fallbackLabel) => {
  if (fallbackLabel) return fallbackLabel;
  if (approverId && userMap[approverId]?.name) return userMap[approverId].name;
  if (approverId && userMap[approverId]?.email) return userMap[approverId].email;
  return "Unknown approver";
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="fiori-chart-tooltip">
      {label ? <div className="fiori-chart-tooltip-label">{label}</div> : null}
      {payload.map((entry) => (
        <div key={`${entry.name}-${entry.dataKey}`} className="fiori-chart-tooltip-row">
          <span>{entry.name}</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

const handleCardKeyDown = (event, action) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
};

const AdminLeaves = ({ user }) => {
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [expandedLeave, setExpandedLeave] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [escalationSearch, setEscalationSearch] = useState("");
  const [selectedEscalationOwner, setSelectedEscalationOwner] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: null, reason: "" });
  const [approvalModal, setApprovalModal] = useState({
    show: false,
    leaveId: null,
    approverName: user?.name || user?.email || "",
    originalStart: "",
    originalEnd: "",
    approvedStart: "",
    approvedEnd: "",
  });

  const fetchLeaveWorkspace = async () => {
    try {
      setLoading(true);

      const [pendingRes, allLeavesRes, usersRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/pending/admin`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/all`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`),
      ]);

      setPendingLeaves(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      setAllLeaves(Array.isArray(allLeavesRes.data) ? allLeavesRes.data : []);
      setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      setPendingLeaves([]);
      setAllLeaves([]);
      setAllUsers([]);
      setMessage(error.response?.data?.error || "Unable to load leave workspace.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveWorkspace();
  }, []);

  const userMap = useMemo(
    () =>
      allUsers.reduce((accumulator, person) => {
        if (person?._id) {
          accumulator[person._id] = person;
        }
        return accumulator;
      }, {}),
    [allUsers]
  );

  const summaryMetrics = useMemo(() => {
    const totalRequests = allLeaves.length;
    const approved = allLeaves.filter((leave) => leave.status === "Approved").length;
    const rejected = allLeaves.filter((leave) => leave.status === "Rejected").length;
    const escalated = allLeaves.filter(
      (leave) => Array.isArray(leave.escalation_history) && leave.escalation_history.length > 0
    ).length;

    const openOverdue = allLeaves.filter((leave) => {
      if (leave.status !== "Pending") return false;
      const referenceDate = leave.escalated_on || leave.applied_on;
      const pendingDays = dayDiff(referenceDate, new Date());
      const threshold = (leave.escalation_level || 0) > 0 ? 1 : 2;
      return pendingDays !== null && pendingDays >= threshold;
    }).length;

    return {
      totalRequests,
      approved,
      rejected,
      escalated,
      pending: pendingLeaves.length,
      approvalRate: totalRequests ? Math.round((approved / totalRequests) * 100) : 0,
      openOverdue,
    };
  }, [allLeaves, pendingLeaves]);

  const availableDepartments = useMemo(() => {
    const values = new Set(
      allLeaves.map((leave) => leave.employee_department).filter(Boolean)
    );
    return ["all", ...Array.from(values).sort((first, second) => first.localeCompare(second))];
  }, [allLeaves]);

  const availableTypes = useMemo(() => {
    const values = new Set(allLeaves.map((leave) => leave.leave_type).filter(Boolean));
    return ["all", ...Array.from(values).sort((first, second) => first.localeCompare(second))];
  }, [allLeaves]);

  const filteredLeaves = useMemo(() => {
    const source = activeTab === "pending" ? pendingLeaves : allLeaves;
    const query = searchTerm.trim().toLowerCase();

    return [...source]
      .filter((leave) => {
        if (
          query &&
          ![
            leave.employee_name,
            leave.employee_email,
            leave.employee_designation,
            leave.employee_department,
            leave.leave_type,
            leave.approved_by,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        ) {
          return false;
        }

        if (statusFilter !== "all" && leave.status !== statusFilter) return false;
        if (departmentFilter !== "all" && leave.employee_department !== departmentFilter) return false;
        if (typeFilter !== "all" && leave.leave_type !== typeFilter) return false;

        return true;
      })
      .sort((first, second) => {
        switch (sortBy) {
          case "oldest":
            return new Date(first.applied_on) - new Date(second.applied_on);
          case "name":
            return (first.employee_name || "").localeCompare(second.employee_name || "");
          case "department":
            return (first.employee_department || "").localeCompare(second.employee_department || "");
          case "status":
            return (first.status || "").localeCompare(second.status || "");
          case "newest":
          default:
            return new Date(second.applied_on) - new Date(first.applied_on);
        }
      });
  }, [activeTab, allLeaves, departmentFilter, pendingLeaves, searchTerm, sortBy, statusFilter, typeFilter]);

  const leaveStatusData = useMemo(() => {
    const orderedStatuses = ["Pending", "Approved", "Rejected", "Cancelled"];
    const counts = allLeaves.reduce((accumulator, leave) => {
      const key = leave.status || "Pending";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    return orderedStatuses
      .filter((status) => counts[status])
      .map((status, index) => ({
        name: status,
        value: counts[status],
        color: chartPalette[index % chartPalette.length],
      }));
  }, [allLeaves]);

  const leaveTypeData = useMemo(() => {
    const counts = allLeaves.reduce((accumulator, leave) => {
      const key = leave.leave_type || "Other";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name: shortLabel(name, 14), fullName: name, value }))
      .sort((first, second) => second.value - first.value);
  }, [allLeaves]);

  const departmentLoadData = useMemo(() => {
    const counts = allLeaves.reduce((accumulator, leave) => {
      const key = leave.employee_department || "Unassigned";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name: shortLabel(name, 14), fullName: name, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 8);
  }, [allLeaves]);

  const monthlyTrendData = useMemo(() => {
    const buckets = [];
    const today = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        name: date.toLocaleDateString("en-IN", { month: "short" }),
        requests: 0,
        approved: 0,
        rejected: 0,
      });
    }

    const bucketMap = buckets.reduce((accumulator, bucket) => {
      accumulator[bucket.key] = bucket;
      return accumulator;
    }, {});

    allLeaves.forEach((leave) => {
      const applied = new Date(leave.applied_on || leave.start_date);
      if (!Number.isNaN(applied.getTime())) {
        const key = `${applied.getFullYear()}-${String(applied.getMonth() + 1).padStart(2, "0")}`;
        if (bucketMap[key]) bucketMap[key].requests += 1;
      }

      const approved = new Date(leave.approved_on || "");
      if (!Number.isNaN(approved.getTime()) && leave.status === "Approved") {
        const key = `${approved.getFullYear()}-${String(approved.getMonth() + 1).padStart(2, "0")}`;
        if (bucketMap[key]) bucketMap[key].approved += 1;
      }

      const rejected = new Date(leave.rejected_on || "");
      if (!Number.isNaN(rejected.getTime()) && leave.status === "Rejected") {
        const key = `${rejected.getFullYear()}-${String(rejected.getMonth() + 1).padStart(2, "0")}`;
        if (bucketMap[key]) bucketMap[key].rejected += 1;
      }
    });

    return buckets;
  }, [allLeaves]);

  const escalationEvents = useMemo(() => {
    return allLeaves.flatMap((leave) => {
      const history = Array.isArray(leave.escalation_history) ? leave.escalation_history : [];
      return history.map((entry, index) => {
        const employeeRecord = userMap[leave.employee_id];
        const offenderId =
          entry.from_approver || (index === 0 ? employeeRecord?.reportsTo || null : null);
        const offender = offenderId ? userMap[offenderId] : null;
        const escalatedToId = entry.to_approver || entry.approver_id || null;
        const escalatedTo = escalatedToId ? userMap[escalatedToId] : null;

        return {
          key: `${leave._id}-${index}`,
          leaveId: leave._id,
          employeeId: leave.employee_id,
          employeeName: leave.employee_name || "Unknown employee",
          employeeDepartment: leave.employee_department || "Unassigned",
          leaveType: leave.leave_type || "Leave",
          requestedFrom: leave.start_date,
          requestedTo: leave.end_date,
          appliedOn: leave.applied_on,
          escalatedAt: entry.escalated_at,
          escalationLevel: entry.to_level || entry.level || leave.escalation_level || 1,
          status: leave.status || "Pending",
          offenderId,
          offenderName: offender?.name || "Unresolved approver",
          offenderEmail: offender?.email || "",
          offenderRole: offender?.role || "",
          escalatedToName:
            entry.to_approver_name || escalatedTo?.name || (escalatedTo ? escalatedTo.email : "Unknown"),
          reason: entry.reason || "Approval SLA exceeded",
        };
      });
    });
  }, [allLeaves, userMap]);

  const escalationMonthlyData = useMemo(() => {
    const buckets = [];
    const today = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        name: date.toLocaleDateString("en-IN", { month: "short" }),
        escalations: 0,
      });
    }

    const bucketMap = buckets.reduce((accumulator, bucket) => {
      accumulator[bucket.key] = bucket;
      return accumulator;
    }, {});

    escalationEvents.forEach((event) => {
      const escalatedAt = new Date(event.escalatedAt);
      if (Number.isNaN(escalatedAt.getTime())) return;

      const key = `${escalatedAt.getFullYear()}-${String(escalatedAt.getMonth() + 1).padStart(2, "0")}`;
      if (bucketMap[key]) bucketMap[key].escalations += 1;
    });

    return buckets;
  }, [escalationEvents]);

  const resolutionTurnaroundData = useMemo(() => {
    const grouped = {};

    allLeaves.forEach((leave) => {
      if (!["Approved", "Rejected"].includes(leave.status)) return;

      const appliedOn = new Date(leave.applied_on);
      const resolvedOn = new Date(leave.approved_on || leave.rejected_on || "");
      if (Number.isNaN(appliedOn.getTime()) || Number.isNaN(resolvedOn.getTime())) return;

      const key = leave.leave_type || "Other";
      grouped[key] = grouped[key] || { totalDays: 0, count: 0 };
      grouped[key].totalDays += Math.max(0, (resolvedOn - appliedOn) / (1000 * 60 * 60 * 24));
      grouped[key].count += 1;
    });

    return Object.entries(grouped)
      .map(([name, bucket]) => ({
        name: shortLabel(name, 14),
        fullName: name,
        value: Number((bucket.totalDays / bucket.count).toFixed(1)),
      }))
      .sort((first, second) => second.value - first.value);
  }, [allLeaves]);

  const escalationOwners = useMemo(() => {
    const grouped = escalationEvents.reduce((accumulator, event) => {
      const key = event.offenderId || event.offenderName;
      if (!accumulator[key]) {
        accumulator[key] = {
          id: key,
          approverId: event.offenderId,
          name: event.offenderName,
          email: event.offenderEmail,
          role: event.offenderRole,
          count: 0,
          pendingCount: 0,
          employees: new Set(),
          departments: new Set(),
          latestEscalation: null,
          events: [],
        };
      }

      accumulator[key].count += 1;
      if (event.status === "Pending") {
        accumulator[key].pendingCount += 1;
      }
      accumulator[key].employees.add(event.employeeName);
      accumulator[key].departments.add(event.employeeDepartment);
      accumulator[key].events.push(event);

      const latest = accumulator[key].latestEscalation
        ? new Date(accumulator[key].latestEscalation)
        : null;
      const current = new Date(event.escalatedAt || 0);
      if (!latest || current > latest) {
        accumulator[key].latestEscalation = event.escalatedAt;
      }

      return accumulator;
    }, {});

    return Object.values(grouped)
      .map((entry) => ({
        ...entry,
        employeesAffected: entry.employees.size,
        departmentCount: entry.departments.size,
        departments: Array.from(entry.departments),
        events: entry.events.sort((first, second) => new Date(second.escalatedAt) - new Date(first.escalatedAt)),
      }))
      .filter((entry) => {
        if (!escalationSearch.trim()) return true;
        const query = escalationSearch.toLowerCase();
        return [entry.name, entry.email, ...entry.departments]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => {
        if (second.count !== first.count) return second.count - first.count;
        return new Date(second.latestEscalation || 0) - new Date(first.latestEscalation || 0);
      });
  }, [escalationEvents, escalationSearch]);

  const openApproveModal = (leave) => {
    setApprovalModal({
      show: true,
      leaveId: leave._id,
      approverName: user?.name || user?.email || "",
      originalStart: leave.start_date,
      originalEnd: leave.end_date,
      approvedStart: leave.start_date,
      approvedEnd: leave.end_date,
    });
  };

  const openTab = (tab, options = {}) => {
    setActiveTab(tab);

    if (Object.prototype.hasOwnProperty.call(options, "statusFilter")) {
      setStatusFilter(options.statusFilter);
    }
    if (Object.prototype.hasOwnProperty.call(options, "typeFilter")) {
      setTypeFilter(options.typeFilter);
    }
    if (Object.prototype.hasOwnProperty.call(options, "departmentFilter")) {
      setDepartmentFilter(options.departmentFilter);
    }
    if (Object.prototype.hasOwnProperty.call(options, "searchTerm")) {
      setSearchTerm(options.searchTerm);
    }
  };

  const updateStatus = async ({
    leaveId,
    status,
    rejectionReason = "",
    approverName = "",
    approvedStart = null,
    approvedEnd = null,
  }) => {
    try {
      const payload = { status };

      if (status === "Rejected") {
        payload.rejection_reason = rejectionReason;
      }

      if (status === "Approved") {
        payload.approved_by = approverName.trim();

        const isPartial =
          approvedStart &&
          approvedEnd &&
          (approvedStart !== approvalModal.originalStart || approvedEnd !== approvalModal.originalEnd);

        if (isPartial) {
          payload.is_partial = true;
          payload.approved_start_date = approvedStart;
          payload.approved_end_date = approvedEnd;
        }
      }

      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/update_status/${leaveId}`,
        payload
      );

      setMessage(response.data?.message || `Leave ${status.toLowerCase()} successfully.`);
      setRejectModal({ show: false, leaveId: null, reason: "" });
      setApprovalModal({
        show: false,
        leaveId: null,
        approverName: user?.name || user?.email || "",
        originalStart: "",
        originalEnd: "",
        approvedStart: "",
        approvedEnd: "",
      });
      fetchLeaveWorkspace();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || "Unable to update leave status.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const confirmReject = async () => {
    if (!rejectModal.reason.trim()) {
      setMessage("A rejection reason is required.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    await updateStatus({
      leaveId: rejectModal.leaveId,
      status: "Rejected",
      rejectionReason: rejectModal.reason,
    });
  };

  const confirmApprove = async () => {
    if (!approvalModal.approverName.trim()) {
      setMessage("Approver name is required.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    await updateStatus({
      leaveId: approvalModal.leaveId,
      status: "Approved",
      approverName: approvalModal.approverName,
      approvedStart: approvalModal.approvedStart,
      approvedEnd: approvalModal.approvedEnd,
    });
  };

  if (loading) {
    return (
      <section className="leave-workspace">
        <div className="fiori-loading-card">
          <Clock3 size={28} />
          <div>
            <strong>Loading leave workspace</strong>
            <p>Preparing approvals, records, analytics, and escalation history.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="leave-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Leave Operations</div>
          <h1>Leave management</h1>
          <p>
            Review pending approvals, monitor leave demand, and track escalation performance
            across the organization from one enterprise workspace.
          </p>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-hero-meta-item">
            <span>Pending approvals</span>
            <strong>{summaryMetrics.pending}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Approval rate</span>
            <strong>{summaryMetrics.approvalRate}%</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Escalated cases</span>
            <strong>{summaryMetrics.escalated}</strong>
          </div>
        </div>
      </header>

      <div className="admin-dashboard-grid">
        <article
          className="fiori-stat-card is-actionable"
          onClick={() => openTab("pending", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
          onKeyDown={(event) =>
            handleCardKeyDown(event, () =>
              openTab("pending", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
            )
          }
          role="button"
          tabIndex={0}
        >
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Admin queue</span>
            <Clock3 size={18} />
          </div>
          <div className="fiori-stat-value">{summaryMetrics.pending}</div>
          <div className="fiori-stat-note">Leave requests waiting for administration action</div>
        </article>

        <article
          className="fiori-stat-card is-actionable"
          onClick={() => openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
          onKeyDown={(event) =>
            handleCardKeyDown(event, () =>
              openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
            )
          }
          role="button"
          tabIndex={0}
        >
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Total requests</span>
            <CalendarClock size={18} />
          </div>
          <div className="fiori-stat-value">{summaryMetrics.totalRequests}</div>
          <div className="fiori-stat-note">All leave records currently maintained in the system</div>
        </article>

        <article
          className="fiori-stat-card is-actionable"
          onClick={() => openTab("records", { statusFilter: "Approved", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
          onKeyDown={(event) =>
            handleCardKeyDown(event, () =>
              openTab("records", { statusFilter: "Approved", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
            )
          }
          role="button"
          tabIndex={0}
        >
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Resolved requests</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="fiori-stat-value">{summaryMetrics.approved + summaryMetrics.rejected}</div>
          <div className="fiori-stat-note">Approved and rejected requests already closed out</div>
        </article>

        <article
          className="fiori-stat-card is-actionable"
          onClick={() => openTab("escalations")}
          onKeyDown={(event) => handleCardKeyDown(event, () => openTab("escalations"))}
          role="button"
          tabIndex={0}
        >
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Open SLA breaches</span>
            <ShieldAlert size={18} />
          </div>
          <div className="fiori-stat-value">{summaryMetrics.openOverdue}</div>
          <div className="fiori-stat-note">Pending requests currently beyond configured SLA</div>
        </article>
      </div>

      <section className="fiori-panel">
        <div className="leave-tab-strip" role="tablist" aria-label="Leave workspace tabs">
          {[
            { id: "pending", label: `Pending Approvals (${pendingLeaves.length})` },
            { id: "records", label: `All Records (${allLeaves.length})` },
            { id: "analytics", label: "Leave Analytics" },
            { id: "escalations", label: `Leave Escalations (${escalationEvents.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`leave-tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {(activeTab === "pending" || activeTab === "records") && (
        <>
          <section className="fiori-panel">
            <div className="fiori-panel-header">
              <div>
                <h3>{activeTab === "pending" ? "Approval queue" : "Leave records"}</h3>
                <p>
                  {activeTab === "pending"
                    ? "Escalated requests currently assigned for administration review"
                    : "Complete leave history with enterprise-grade filtering"}
                </p>
              </div>
            </div>

            <div className="leave-filter-grid">
              <label className="fiori-form-field">
                <span className="leave-field-label">Search</span>
                <div className="leave-search-field">
                  <Search size={16} />
                  <input
                    className="input"
                    placeholder="Search by employee, email, designation, department, or approver"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              </label>

              <label className="fiori-form-field">
                <span className="leave-field-label">Status</span>
                <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>

              <label className="fiori-form-field">
                <span className="leave-field-label">Department</span>
                <select
                  className="input"
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                >
                  {availableDepartments.map((department) => (
                    <option key={department} value={department}>
                      {department === "all" ? "All departments" : department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fiori-form-field">
                <span className="leave-field-label">Leave type</span>
                <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === "all" ? "All leave types" : type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fiori-form-field">
                <span className="leave-field-label">Sort by</span>
                <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Employee name</option>
                  <option value="department">Department</option>
                  <option value="status">Status</option>
                </select>
              </label>
            </div>

            <div className="leave-results-bar">
              <div className="leave-results-meta">
                <Filter size={15} />
                <span>
                  Showing {filteredLeaves.length} of {activeTab === "pending" ? pendingLeaves.length : allLeaves.length} records
                </span>
              </div>
              <button className="fiori-button secondary" onClick={fetchLeaveWorkspace}>
                Refresh
              </button>
            </div>
          </section>

          <section className="leave-record-list">
            {filteredLeaves.length === 0 ? (
              <div className="admin-empty-state">
                <CheckCircle2 size={28} />
                <div>
                  <strong>No leave records match the current view</strong>
                  <p>Adjust the filters or refresh the workspace to review more records.</p>
                </div>
              </div>
            ) : (
              filteredLeaves.map((leave) => {
                const isExpanded = expandedLeave === leave._id;
                const isPending = leave.status === "Pending";
                const toneClass = statusToneMap[leave.status] || "is-neutral";
                const escalationCount = Array.isArray(leave.escalation_history)
                  ? leave.escalation_history.length
                  : 0;

                return (
                  <article key={leave._id} className="admin-approval-card">
                    <div className="admin-approval-card-header">
                      <div>
                        <h4>{leave.employee_name || "Unknown employee"}</h4>
                        <p>
                          {leave.employee_designation || "Designation unavailable"} •{" "}
                          {leave.employee_department || "Department unavailable"}
                        </p>
                      </div>

                      <div className={`fiori-status-pill ${toneClass}`}>{leave.status || "Pending"}</div>
                    </div>

                    <div className="admin-approval-metadata">
                      <span>{leave.leave_type || "Leave"}</span>
                      <span>{getDaysLabel(leave)}</span>
                      <span>{getLeaveWindow(leave)}</span>
                      <span>Applied {formatDate(leave.applied_on)}</span>
                      {escalationCount > 0 ? <span>{escalationCount} escalation event(s)</span> : null}
                    </div>

                    <div className="leave-record-toolbar">
                      <div className="leave-results-meta">
                        <Users size={15} />
                        <span>{leave.employee_email || "No email on record"}</span>
                      </div>

                      <button
                        className="fiori-inline-button"
                        onClick={() => setExpandedLeave(isExpanded ? null : leave._id)}
                      >
                        <span>{isExpanded ? "Hide details" : "Show details"}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="admin-approval-details">
                        <div>
                          <span>Requested period</span>
                          <strong>{`${formatDate(leave.start_date)} to ${formatDate(leave.end_date)}`}</strong>
                        </div>
                        <div>
                          <span>Current approver</span>
                          <strong>{userMap[leave.current_approver_id]?.name || "Administration queue"}</strong>
                        </div>
                        <div>
                          <span>Approved by</span>
                          <strong>{leave.approved_by || "Not resolved yet"}</strong>
                        </div>
                        <div>
                          <span>Resolved on</span>
                          <strong>{formatDate(leave.approved_on || leave.rejected_on)}</strong>
                        </div>
                        {leave.reason ? (
                          <div className="is-wide">
                            <span>Employee reason</span>
                            <strong>{leave.reason}</strong>
                          </div>
                        ) : null}
                        {leave.rejection_reason ? (
                          <div className="is-wide">
                            <span>Rejection reason</span>
                            <strong>{leave.rejection_reason}</strong>
                          </div>
                        ) : null}
                        {escalationCount > 0 ? (
                          <div className="is-wide leave-escalation-history-block">
                            <span>Escalation history</span>
                            <div className="leave-escalation-history-compact">
                              {leave.escalation_history.map((entry, index) => {
                                const fromApprover =
                                  getApproverLabel(entry.from_approver, userMap) ||
                                  (index === 0
                                    ? getApproverLabel(userMap[leave.employee_id]?.reportsTo, userMap)
                                    : "Previous approver");
                                const toApprover = getApproverLabel(
                                  entry.to_approver || entry.approver_id,
                                  userMap,
                                  entry.to_approver_name || entry.approver_name
                                );

                                return (
                                  <div key={`${leave._id}-history-${index}`} className="leave-escalation-compact-row">
                                    <strong>{fromApprover}</strong>
                                    <span>to</span>
                                    <strong>{toApprover}</strong>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {isPending ? (
                      <div className="admin-approval-actions">
                        <button className="fiori-button secondary danger" onClick={() => setRejectModal({ show: true, leaveId: leave._id, reason: "" })}>
                          Reject
                        </button>
                        <button className="fiori-button primary" onClick={() => openApproveModal(leave)}>
                          Approve
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
        </>
      )}

      {activeTab === "analytics" && (
        <>
          <div className="admin-analytics-grid leave-analytics-grid">
            <article
              className="fiori-panel fiori-chart-card is-clickable"
              onClick={() => openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
              onKeyDown={(event) =>
                handleCardKeyDown(event, () =>
                  openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="fiori-panel-header">
                <div>
                  <h3>Leave status mix</h3>
                  <p>Distribution of request outcomes across all leave records</p>
                </div>
                <BarChart3 size={18} />
              </div>
              <div className="fiori-chart-shell">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={leaveStatusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={94} paddingAngle={3}>
                      {leaveStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article
              className="fiori-panel fiori-chart-card is-clickable"
              onClick={() => openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
              onKeyDown={(event) =>
                handleCardKeyDown(event, () =>
                  openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="fiori-panel-header">
                <div>
                  <h3>Monthly leave trend</h3>
                  <p>Requests, approvals, and rejections across the last six months</p>
                </div>
                <Activity size={18} />
              </div>
              <div className="fiori-chart-shell">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyTrendData}>
                    <CartesianGrid stroke="#e8edf3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="requests" stroke="#0a6ed1" fill="rgba(10, 110, 209, 0.18)" name="Requests" strokeWidth={2} />
                    <Area type="monotone" dataKey="approved" stroke="#5b738b" fill="rgba(91, 115, 139, 0.14)" name="Approved" strokeWidth={2} />
                    <Area type="monotone" dataKey="rejected" stroke="#bb0000" fill="rgba(187, 0, 0, 0.08)" name="Rejected" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article
              className="fiori-panel fiori-chart-card is-clickable"
              onClick={() => openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
              onKeyDown={(event) =>
                handleCardKeyDown(event, () =>
                  openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="fiori-panel-header">
                <div>
                  <h3>Leave type demand</h3>
                  <p>Volume by leave category across the current dataset</p>
                </div>
                <CalendarClock size={18} />
              </div>
              <div className="fiori-chart-shell">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leaveTypeData} barCategoryGap={18}>
                    <CartesianGrid stroke="#e8edf3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill="#0a6ed1" radius={[8, 8, 0, 0]} name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article
              className="fiori-panel fiori-chart-card is-clickable"
              onClick={() => openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
              onKeyDown={(event) =>
                handleCardKeyDown(event, () =>
                  openTab("records", { statusFilter: "all", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="fiori-panel-header">
                <div>
                  <h3>Department leave load</h3>
                  <p>Departments with the highest leave request volume</p>
                </div>
                <Users size={18} />
              </div>
              <div className="fiori-chart-shell">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={departmentLoadData} barCategoryGap={18}>
                    <CartesianGrid stroke="#e8edf3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill="#5b738b" radius={[8, 8, 0, 0]} name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article
              className="fiori-panel fiori-chart-card is-clickable"
              onClick={() => openTab("escalations")}
              onKeyDown={(event) => handleCardKeyDown(event, () => openTab("escalations"))}
              role="button"
              tabIndex={0}
            >
              <div className="fiori-panel-header">
                <div>
                  <h3>Escalation trend</h3>
                  <p>Monthly count of leave requests that breached approval SLA</p>
                </div>
                <GitBranch size={18} />
              </div>
              <div className="fiori-chart-shell">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={escalationMonthlyData}>
                    <CartesianGrid stroke="#e8edf3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="escalations" stroke="#0f2742" strokeWidth={2.5} dot={{ r: 4 }} name="Escalations" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article
              className="fiori-panel fiori-chart-card is-clickable"
              onClick={() => openTab("records", { statusFilter: "Approved", typeFilter: "all", departmentFilter: "all", searchTerm: "" })}
              onKeyDown={(event) =>
                handleCardKeyDown(event, () =>
                  openTab("records", { statusFilter: "Approved", typeFilter: "all", departmentFilter: "all", searchTerm: "" })
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="fiori-panel-header">
                <div>
                  <h3>Resolution turnaround</h3>
                  <p>Average resolution time in days by leave type</p>
                </div>
                <Clock3 size={18} />
              </div>
              <div className="fiori-chart-shell">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={resolutionTurnaroundData} barCategoryGap={18}>
                    <CartesianGrid stroke="#e8edf3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill="#91c8f6" radius={[8, 8, 0, 0]} name="Avg days" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </>
      )}

      {activeTab === "escalations" && (
        <>
          <section className="fiori-panel">
            <div className="fiori-panel-header">
              <div>
                <h3>Approver escalation ledger</h3>
                <p>
                  Counts are attributed to the approver who did not act before the request escalated,
                  not to the employee who applied for leave.
                </p>
              </div>
            </div>

            <div className="leave-filter-grid leave-filter-grid-compact">
              <label className="fiori-form-field">
                <span className="leave-field-label">Search approver</span>
                <div className="leave-search-field">
                  <Search size={16} />
                  <input
                    className="input"
                    placeholder="Search by approver name, email, or department"
                    value={escalationSearch}
                    onChange={(event) => setEscalationSearch(event.target.value)}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="leave-escalation-grid">
            {escalationOwners.length === 0 ? (
              <div className="admin-empty-state">
                <CheckCircle2 size={28} />
                <div>
                  <strong>No escalation records found</strong>
                  <p>Either no leave request has escalated yet or the current search returned no matches.</p>
                </div>
              </div>
            ) : (
              escalationOwners.map((owner) => (
                <article
                  key={owner.id}
                  className="fiori-panel escalation-owner-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEscalationOwner(owner)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedEscalationOwner(owner);
                    }
                  }}
                >
                  <div className="fiori-panel-header">
                    <div>
                      <h3>{owner.name}</h3>
                      <p>{owner.email || "Email unavailable"}</p>
                    </div>
                    <div className="fiori-counter">{owner.count}</div>
                  </div>

                  <div className="admin-approval-metadata">
                    <span>{owner.role || "Approver"}</span>
                    <span>{owner.employeesAffected} employee(s) impacted</span>
                    <span>{owner.pendingCount} escalated request(s) still open</span>
                    <span>Latest on {formatDate(owner.latestEscalation)}</span>
                  </div>

                  <div className="leave-escalation-summary">
                    <div>
                      <span>Departments impacted</span>
                      <strong>{owner.departments.join(", ") || "Not available"}</strong>
                    </div>
                    <div>
                      <span>Open detailed ledger</span>
                      <strong>Review date, time, employee, and escalation path</strong>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}

      {selectedEscalationOwner && (
        <div className="admin-modal-overlay" onClick={() => setSelectedEscalationOwner(null)}>
          <div className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <div className="admin-section-overline">Leave Escalations</div>
                <h2>{selectedEscalationOwner.name}</h2>
                <p>
                  Detailed escalation history for approvals that were not actioned within SLA
                </p>
              </div>
              <button className="fiori-button secondary" onClick={() => setSelectedEscalationOwner(null)}>
                Close
              </button>
            </div>

            <div className="admin-dashboard-grid admin-dashboard-grid-compact">
              <article className="fiori-stat-card">
                <div className="fiori-stat-label">Total escalations</div>
                <div className="fiori-stat-value">{selectedEscalationOwner.count}</div>
                <div className="fiori-stat-note">Requests escalated away from this approver</div>
              </article>
              <article className="fiori-stat-card">
                <div className="fiori-stat-label">Open escalations</div>
                <div className="fiori-stat-value">{selectedEscalationOwner.pendingCount}</div>
                <div className="fiori-stat-note">Cases still unresolved at the time of review</div>
              </article>
              <article className="fiori-stat-card">
                <div className="fiori-stat-label">Employees affected</div>
                <div className="fiori-stat-value">{selectedEscalationOwner.employeesAffected}</div>
                <div className="fiori-stat-note">Unique employees impacted by delayed approval</div>
              </article>
            </div>

            <div className="fiori-table-shell">
              <table className="fiori-table">
                <thead>
                  <tr>
                    <th>Escalated On</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Requested Period</th>
                    <th>Escalated To</th>
                    <th>Current Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEscalationOwner.events.map((event) => (
                    <tr key={event.key}>
                      <td>{formatDateTime(event.escalatedAt)}</td>
                      <td>
                        <div className="fiori-primary-cell">
                          <strong>{event.employeeName}</strong>
                          <span>Applied {formatDate(event.appliedOn)}</span>
                        </div>
                      </td>
                      <td>{event.employeeDepartment}</td>
                      <td>{event.leaveType}</td>
                      <td>{`${formatDate(event.requestedFrom)} to ${formatDate(event.requestedTo)}`}</td>
                      <td>{event.escalatedToName}</td>
                      <td>
                        <div className={`fiori-status-pill ${statusToneMap[event.status] || "is-neutral"}`}>
                          {event.status}
                        </div>
                      </td>
                      <td>{event.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {rejectModal.show && (
        <div className="admin-modal-overlay" onClick={() => setRejectModal({ show: false, leaveId: null, reason: "" })}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <div className="admin-section-overline">Leave Action</div>
                <h2>Reject leave request</h2>
                <p>Provide a rejection reason for audit traceability and employee communication.</p>
              </div>
            </div>

            <label className="fiori-form-field">
              <label>Rejection reason</label>
              <textarea
                className="input leave-textarea"
                rows={5}
                value={rejectModal.reason}
                onChange={(event) => setRejectModal((previous) => ({ ...previous, reason: event.target.value }))}
              />
            </label>

            <div className="admin-modal-actions">
              <button className="fiori-button secondary" onClick={() => setRejectModal({ show: false, leaveId: null, reason: "" })}>
                Cancel
              </button>
              <button className="fiori-button danger" onClick={confirmReject}>
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalModal.show && (
        <div
          className="admin-modal-overlay"
          onClick={() =>
            setApprovalModal({
              show: false,
              leaveId: null,
              approverName: user?.name || user?.email || "",
              originalStart: "",
              originalEnd: "",
              approvedStart: "",
              approvedEnd: "",
            })
          }
        >
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <div className="admin-section-overline">Leave Action</div>
                <h2>Approve leave request</h2>
                <p>Approve the full request or narrow the approved date range for partial approval.</p>
              </div>
            </div>

            <div className="leave-modal-grid">
              <label className="fiori-form-field">
                <label>Approver name</label>
                <input
                  className="input"
                  value={approvalModal.approverName}
                  onChange={(event) =>
                    setApprovalModal((previous) => ({ ...previous, approverName: event.target.value }))
                  }
                />
              </label>

              <div className="leave-static-card">
                <span>Requested range</span>
                <strong>{`${formatDate(approvalModal.originalStart)} to ${formatDate(approvalModal.originalEnd)}`}</strong>
              </div>

              <label className="fiori-form-field">
                <label>Approved start date</label>
                <input
                  className="input"
                  type="date"
                  min={approvalModal.originalStart}
                  max={approvalModal.originalEnd}
                  value={approvalModal.approvedStart}
                  onChange={(event) =>
                    setApprovalModal((previous) => ({ ...previous, approvedStart: event.target.value }))
                  }
                />
              </label>

              <label className="fiori-form-field">
                <label>Approved end date</label>
                <input
                  className="input"
                  type="date"
                  min={approvalModal.approvedStart || approvalModal.originalStart}
                  max={approvalModal.originalEnd}
                  value={approvalModal.approvedEnd}
                  onChange={(event) =>
                    setApprovalModal((previous) => ({ ...previous, approvedEnd: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="admin-modal-actions">
              <button
                className="fiori-button secondary"
                onClick={() =>
                  setApprovalModal({
                    show: false,
                    leaveId: null,
                    approverName: user?.name || user?.email || "",
                    originalStart: "",
                    originalEnd: "",
                    approvedStart: "",
                    approvedEnd: "",
                  })
                }
              >
                Cancel
              </button>
              <button className="fiori-button primary" onClick={confirmApprove}>
                Confirm approval
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`admin-toast ${
            message.toLowerCase().includes("unable") || message.toLowerCase().includes("required")
              ? "is-error"
              : "is-success"
          }`}
        >
          {message}
        </div>
      )}
    </section>
  );
};

export default AdminLeaves;
