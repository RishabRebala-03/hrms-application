import React, { useEffect, useState } from "react";
import axios from "axios";
import OrganizationHierarchy from "./OrganizationHierarchy";
import diwaliBanner from "../assets/diwali.png";
import AdminHolidays from "./AdminHolidays";
import BannerImage from "../assets/banner.jpg";


const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  } else if (hour >= 17 && hour < 21) {
    return "Good Evening";
  } else {
    return "Good Night";
  }
};


// ========== NEW: On Leave Employees Modal ==========
const OnLeaveEmployeesModal = ({ employees, onClose }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      let val = dateStr;
      if (typeof dateStr === "object" && dateStr.$date) val = dateStr.$date;
      const date = new Date(val);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getLeaveTypeIcon = (leaveType) => {
    switch(leaveType?.toLowerCase()) {
      case "casual": return "🖖";
      case "sick": return "🤒";
      case "optional": return "⭐";
      case "planned": return "📅";
      case "lwp": return "💼";
      default: return "📋";
    }
  };

  const getLeaveTypeColor = (leaveType) => {
    switch(leaveType?.toLowerCase()) {
      case "casual": return "#10b981";
      case "sick": return "#ef4444";
      case "optional": return "#f59e0b";
      case "planned": return "#3b82f6";
      case "lwp": return "#6b7280";
      default: return "#9ca3af";
    }
  };

  // Group employees by leave type
  const groupedByType = employees.reduce((acc, emp) => {
    const type = emp.leave_type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(emp);
    return acc;
  }, {});

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        maxWidth: 900,
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        {/* Header */}
        <div style={{
          padding: 24,
          borderBottom: "2px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 10
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, display: "flex", alignItems: "center", gap: 12 }}>
              🖖 Employees On Leave Today
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 14 }}>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })} • {employees.length} employee{employees.length !== 1 ? 's' : ''} on leave
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Summary Statistics */}
        <div style={{
          padding: 24,
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16
          }}>
            {Object.entries(groupedByType).map(([type, emps]) => (
              <div key={type} style={{
                background: "white",
                padding: 16,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                textAlign: "center"
              }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>
                  {getLeaveTypeIcon(type)}
                </div>
                <div style={{ 
                  fontSize: 24, 
                  fontWeight: 700, 
                  color: getLeaveTypeColor(type),
                  marginBottom: 4
                }}>
                  {emps.length}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                  {type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee List */}
        <div style={{ padding: 24 }}>
          {employees.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Everyone is present!</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>No employees on leave today</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {employees.map((employee, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 20,
                    background: "#f9fafb",
                    borderRadius: 12,
                    border: "2px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ fontSize: 32 }}>
                        {getLeaveTypeIcon(employee.leave_type)}
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                          {employee.employee_name || "Unknown"}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          {employee.employee_designation} • {employee.employee_department}
                        </div>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>
                          {employee.employee_email}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                      gap: 12,
                      marginTop: 12,
                      padding: 12,
                      background: "white",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb"
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, fontWeight: 600 }}>
                          Leave Type
                        </div>
                        <div style={{ 
                          fontSize: 14, 
                          fontWeight: 700,
                          color: getLeaveTypeColor(employee.leave_type)
                        }}>
                          {employee.leave_type}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, fontWeight: 600 }}>
                          Start Date
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {formatDate(employee.start_date)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, fontWeight: 600 }}>
                          End Date
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {formatDate(employee.end_date)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, fontWeight: 600 }}>
                          Duration
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {employee.days} {employee.days === 1 ? "day" : "days"}
                        </div>
                      </div>
                    </div>

                    {employee.reason && (
                      <div style={{ 
                        marginTop: 12,
                        padding: 12,
                        background: "#fffbeb",
                        borderRadius: 8,
                        border: "1px solid #fcd34d"
                      }}>
                        <div style={{ fontSize: 11, color: "#92400e", marginBottom: 4, fontWeight: 600 }}>
                          Reason
                        </div>
                        <div style={{ fontSize: 13, color: "#78350f", fontStyle: "italic" }}>
                          {employee.reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: 24,
          borderTop: "2px solid #e5e7eb",
          background: "#f9fafb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            💡 Tip: Click on a leave type above to filter employees
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    onLeaveToday: 0,
    workingToday: 0,
  });
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [expandedLeave, setExpandedLeave] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: null, reason: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [showOnLeaveModal, setShowOnLeaveModal] = useState(false);
  const [employeesOnLeave, setEmployeesOnLeave] = useState([]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      console.log("🔍 Fetching admin dashboard data");

      // Fetch all employees
      const employeesRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/get_all_employees`
      );

      // CRITICAL FIX: Same validation
      let allEmployees = [];
      if (Array.isArray(employeesRes.data)) {
        allEmployees = employeesRes.data;
      } else {
        console.error("❌ Unexpected employees response:", employeesRes.data);
      }

      console.log("✅ All employees fetched:", allEmployees.length);
      allEmployees = allEmployees.filter(emp => emp && emp._id);

      // ⭐ FIX: Use the admin-specific endpoint
      // Get ALL admin user IDs first
      const adminsRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/`
      );
      const admins = adminsRes.data.filter(u => u.role === "Admin");
      const adminIds = admins.map(a => a._id);

      console.log("✅ Found admin IDs:", adminIds);

      // CRITICAL: Get ALL pending leaves
      const allPendingRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/all`
      );

      // CRITICAL: Filter for leaves where current_approver_id matches ANY admin
      const pending = allPendingRes.data.filter(leave => {
        const isForAdmin = adminIds.includes(leave.current_approver_id);
        const isPending = leave.status === "Pending";
        
        if (isForAdmin && isPending) {
          console.log("✅ Admin pending leave found:", {
            employee: leave.employee_name,
            escalation_level: leave.escalation_level,
            current_approver_id: leave.current_approver_id
          });
        }
        
        return isForAdmin && isPending;
      });

      console.log("✅ Admin pending leaves found:", pending.length);
      setPendingLeaves(pending);

      // Fetch all leaves to get recent actions
      const allLeavesRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/all`
      );
      const allLeaves = allLeavesRes.data || [];
      console.log("✅ All leaves fetched:", allLeaves.length);

      // Get recent actions (last 5 approved/rejected leaves)
      const recent = allLeaves
        .filter(leave => leave.status !== "Pending")
        .sort((a, b) => {
          const dateA = a.approved_on || a.rejected_on || a.applied_on;
          const dateB = b.approved_on || b.rejected_on || b.applied_on;
          return new Date(dateB) - new Date(dateA);
        })
        .slice(0, 5);
      setRecentActions(recent);

      // Calculate who's on leave today
      const today = new Date().toISOString().split('T')[0];
      const onLeaveToday = allLeaves.filter((l) => {
        if (l.status !== "Approved") return false;
        const startDate = l.start_date;
        const endDate = l.end_date;
        return startDate <= today && endDate >= today;
      });

      // ⭐ NEW: Store employees on leave for the modal
      setEmployeesOnLeave(onLeaveToday);

      const workingToday = Math.max(0, allEmployees.length - onLeaveToday.length);

      console.log("📊 Stats calculated:", {
        totalEmployees: allEmployees.length,
        pendingLeaves: pending.length,
        onLeaveToday: onLeaveToday.length,
        workingToday: workingToday
      });

      // ⭐ FIX: Set all stats together
      setStats({
        totalEmployees: allEmployees.length,
        pendingLeaves: pending.length,
        onLeaveToday: onLeaveToday.length,
        workingToday: workingToday,
      });

    } catch (err) {
      console.error("❌ Error loading admin dashboard:", err);
      console.error("Error details:", err.response?.data || err.message);
      setMessage("Failed to load dashboard data");
      
      // Set empty stats on error
      setStats({
        totalEmployees: 0,
        pendingLeaves: 0,
        onLeaveToday: 0,
        workingToday: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      let val = dateStr;
      if (typeof dateStr === "object" && dateStr.$date) val = dateStr.$date;
      const date = new Date(val);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const Sidebar = ({ role, active, onSelect }) => {
  return (
    <aside className="sidebar">
      <ul className="nav">
        {/* ...your existing items */}

        {/* Admin-only */}
        {role === "Admin" && (
          <li
            className={active === "holidays" ? "active" : ""}
            onClick={() => onSelect("holidays")}
            title="Manage Holidays"
          >
            <span style={{ marginRight: 8 }}>🎉</span> Holidays
          </li>
        )}
      </ul>
    </aside>
  );
};

  const handleReject = (leaveId) => {
    setRejectModal({ show: true, leaveId, reason: "" });
  };

  const confirmReject = async () => {
    if (!rejectModal.reason.trim()) {
      setMessage("Please enter a rejection reason");
      return;
    }
    await updateStatus(rejectModal.leaveId, "Rejected", rejectModal.reason);
  };

  const updateStatus = async (leaveId, status, rejectionReason = "") => {
    try {
      const payload = { status };
      if (status === "Rejected" && rejectionReason.trim()) {
        payload.rejection_reason = rejectionReason;
      }

      const res = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/update_status/${leaveId}`,
        payload
      );

      if (res.status === 200) {
        setMessage(`Leave ${status.toLowerCase()} successfully ✓`);
        setRejectModal({ show: false, leaveId: null, reason: "" });
        fetchAdminData();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating leave status");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return { bg: "#d1f4dd", text: "#0a5d2c", border: "#7de3a6" };
      case "Rejected":
        return { bg: "#ffe0e0", text: "#c41e3a", border: "#ffb3b3" };
      case "Cancelled":
        return { bg: "#ffe0e0", text: "#c41e3a", border: "#ffb3b3" };
      default:
        return { bg: "#fff4e6", text: "#d97706", border: "#fbbf24" };
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18 }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 16,
              padding: "28px 32px",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <h1
                  style={{
                    margin: 0,
                    marginBottom: 8,
                    fontSize: 32,
                    fontWeight: 700,
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  {getTimeBasedGreeting()}, {user?.name?.split(" ")[0] || "Admin"} 👋
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.9)",
                    marginBottom: 4,
                  }}
                >
                  {user?.designation} • {user?.department}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {today}
                </p>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>
                  Total Employees
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "white", textAlign: "center" }}>
                  {stats.totalEmployees}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Section */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              background: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              position: "relative",
              height: 280,
            }}
          >
            <img
              src={BannerImage}
              alt="Festival Banner"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Corner Badge */}
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "rgba(102, 126, 234, 0.9)",
                color: "white",
                padding: "8px 16px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              📢 Festival Announcement
            </div>
          </div>
        </div>

        {/* Stats Cards - UPDATED WITH CLICK HANDLER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {[
            { title: "Working Today", value: stats.workingToday, icon: "✅", color: "#10b981", clickable: false },
            { 
              title: "On Leave Today", 
              value: stats.onLeaveToday, 
              icon: "🖖", 
              color: "#0dcaf0", 
              clickable: true,
              onClick: () => setShowOnLeaveModal(true)
            },
            { title: "Pending Approvals", value: stats.pendingLeaves, icon: "⏳", color: "#f59e0b", clickable: false },
          ].map((card) => (
            <div
              key={card.title}
              onClick={card.clickable ? card.onClick : undefined}
              style={{
                background: "white",
                borderRadius: 16,
                padding: "24px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                border: "1px solid #e5e7eb",
                position: "relative",
                overflow: "hidden",
                cursor: card.clickable ? "pointer" : "default",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (card.clickable) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
                }
              }}
              onMouseLeave={(e) => {
                if (card.clickable) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                }
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: card.color,
                  opacity: 0.1,
                }}
              />
              <div style={{ fontSize: 40, marginBottom: 12 }}>{card.icon}</div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                {card.title}
                {card.clickable && card.value > 0 && (
                  <span style={{ fontSize: 12, marginLeft: 8, color: "#3b82f6" }}>
                    👁️ Click to view
                  </span>
                )}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Pending Approvals */}
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>
                Pending Approvals
              </h3>
              <span
                style={{
                  background: "#fff4e6",
                  color: "#d97706",
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {pendingLeaves.length} pending
              </span>
            </div>

            {pendingLeaves.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>All caught up!</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>No pending leave requests</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave._id}
                    style={{
                      padding: 20,
                      background: "#fffbeb",
                      borderRadius: 12,
                      border: "2px solid #fbbf24",
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                            {leave.employee_name || "Unknown"}
                          </div>
                          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                            {leave.employee_designation} • {leave.employee_department}
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedLeave(expandedLeave === leave._id ? null : leave._id)}
                          style={{
                            background: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: 12,
                            cursor: "pointer",
                            height: 32,
                          }}
                        >
                          {expandedLeave === leave._id ? "Hide" : "Details"}
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                        <span style={{ fontSize: 20 }}>
                          {leave.leave_type === "Casual" ? "🖖" : leave.leave_type === "Sick" ? "🤒" : "⭐"}
                        </span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{leave.leave_type} Leave</span>
                        <span style={{ color: "#6b7280" }}>•</span>
                        <span style={{ color: "#6b7280" }}>
                          {leave.days} {leave.days === 1 ? "day" : "days"}
                        </span>
                      </div>
                    </div>

                    {expandedLeave === leave._id && (
                      <div
                        style={{
                          marginBottom: 12,
                          padding: 12,
                          background: "white",
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                          <div>
                            <div style={{ color: "#6b7280", marginBottom: 4 }}>Start Date</div>
                            <div style={{ fontWeight: 600 }}>{formatDate(leave.start_date)}</div>
                          </div>
                          <div>
                            <div style={{ color: "#6b7280", marginBottom: 4 }}>End Date</div>
                            <div style={{ fontWeight: 600 }}>{formatDate(leave.end_date)}</div>
                          </div>
                          {leave.reason && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ color: "#6b7280", marginBottom: 4 }}>Reason</div>
                              <div style={{ fontStyle: "italic" }}>{leave.reason}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => updateStatus(leave._id, "Approved")}
                        style={{
                          flex: 1,
                          background: "#10b981",
                          color: "white",
                          border: "none",
                          padding: "10px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReject(leave._id)}
                        style={{
                          flex: 1,
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          padding: "10px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Actions */}
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 20, fontSize: 20, fontWeight: 700, color: "#111827" }}>
              Recent Actions
            </h3>
            {recentActions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 14 }}>No recent activity</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recentActions.map((action) => {
                  const statusColors = getStatusColor(action.status);
                  return (
                    <div
                      key={action._id}
                      style={{
                        padding: 14,
                        background: statusColors.bg,
                        borderRadius: 10,
                        border: `1px solid ${statusColors.border}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                            {action.employee_name}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            {action.leave_type} • {formatDate(action.start_date)}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: statusColors.text,
                            color: "white",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {action.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions - Organization */}
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 16,
            padding: "28px",
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: 16,
              fontSize: 18,
              fontWeight: 700,
              color: "white",
            }}
          >
            Organization
          </h3>
          <button
            onClick={() => setShowHierarchy(true)}
            style={{
              width: "100%",
              background: "white",
              color: "#667eea",
              border: "none",
              padding: "14px 20px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: 20 }}>🏢</span>
            <span>View Organization Hierarchy</span>
          </button>
        </div>      


        {/* Message Display */}
        {message && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              background: message.includes("Error") ? "#fef2f2" : "#d1f4dd",
              color: message.includes("Error") ? "#ef4444" : "#0a5d2c",
              padding: "16px 24px",
              borderRadius: 12,
              border: `2px solid ${message.includes("Error") ? "#ffb3b3" : "#7de3a6"}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              fontSize: 14,
              fontWeight: 600,
              zIndex: 1000,
            }}
          >
            {message}
          </div>
        )}
      </div>
      
      {/* Organization Hierarchy Modal */}
      {showHierarchy && (
        <OrganizationHierarchy 
          user={user} 
          onClose={() => setShowHierarchy(false)} 
        />
      )}

      {/* ⭐ NEW: On Leave Employees Modal */}
      {showOnLeaveModal && (
        <OnLeaveEmployeesModal
          employees={employeesOnLeave}
          onClose={() => setShowOnLeaveModal(false)}
        />
      )}

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setRejectModal({ show: false, leaveId: null, reason: "" })}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 16,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16, color: "#ef4444", fontSize: 22 }}>
              Reject Leave Request
            </h3>
            <p style={{ marginBottom: 16, fontSize: 14, color: "#6b7280" }}>
              Please provide a detailed reason for rejecting this leave request:
            </p>
            <textarea
              placeholder="Enter rejection reason..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              rows={5}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                marginBottom: 20,
                padding: 12,
                fontSize: 14,
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                outline: "none",
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setRejectModal({ show: false, leaveId: null, reason: "" })}
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectModal.reason.trim()}
                style={{
                  background: rejectModal.reason.trim() ? "#ef4444" : "#cbd5e1",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: rejectModal.reason.trim() ? "pointer" : "not-allowed",
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminDashboard;