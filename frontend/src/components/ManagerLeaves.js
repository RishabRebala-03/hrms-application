// src/components/ManagerLeaves.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const ManagerLeaves = ({ user }) => {
  const [activeTab, setActiveTab] = useState("pending"); // pending, myLeaves, teamBalance
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [myBalance, setMyBalance] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [expandedLeave, setExpandedLeave] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: null, reason: "" });
  const [leave, setLeave] = useState({
    leave_type: "Casual",
    start_date: "",
    end_date: "",
    reason: "",
    logout_time: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const getMinDate = () => {
    const today = new Date();
    
    if (leave.leave_type === "Planned") {
      const minDate = new Date(today);
      minDate.setDate(today.getDate() + 7);
      return minDate.toISOString().split('T')[0];
    }
    
    // If applying early logout, allow today
    if (leave.leave_type === "Early Logout") {
      return today.toISOString().split('T')[0];
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const fetchPendingLeaves = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/pending/${encodeURIComponent(user.email)}`
      );
      setPendingLeaves(res.data);
    } catch (err) {
      console.error("Error fetching pending leaves:", err);
    }
  };

  const fetchMyLeaveData = async () => {
    try {
      // Fetch my balance
      const balanceRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/balance/${user.id}`
      );
      setMyBalance(balanceRes.data);

      // Fetch my history
      const historyRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/history/${user.id}`
      );
      setMyHistory(historyRes.data);
    } catch (err) {
      console.error("Error fetching my leave data:", err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(user.email)}`
      );
      setTeamMembers(res.data);
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  useEffect(() => {
    if (user?.email && user?.id) {
      fetchPendingLeaves();
      fetchMyLeaveData();
      fetchTeamMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const applyLeave = async () => {
    if (!leave.start_date || !leave.end_date) {
      setMessage("Please select start and end dates");
      return;
    }

    if (leave.leave_type === "Early Logout" && !leave.logout_time) {
      setMessage("⚠️ Logout time is mandatory for early logout");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/apply`, {
        employee_id: user.id,
        leave_type: leave.leave_type,
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason,
        logout_time: leave.logout_time || "",
      });

      if (res.status === 201) {
        setMessage("Leave applied successfully ✓");
        setLeave({ leave_type: "Casual", start_date: "", end_date: "", reason: "", logout_time: "" });
        fetchMyLeaveData();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error: " + (err.response?.data?.error || "Failed to apply leave"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
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
        const payload = { 
          status,
          approved_by: user.name || user.email  // ⭐ REQUIRED ⭐
        };

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
        fetchPendingLeaves();
        fetchTeamMembers(); // Refresh to update balances
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating leave status");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      let dateValue = dateStr;
      if (typeof dateStr === "object" && dateStr.$date) {
        dateValue = dateStr.$date;
      }
      const date = new Date(dateValue);
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

  // 🎂 Check if start_date matches employee birthday
  const isBirthdayLeave = (leave) => {
    if (!leave.employee_dateOfBirth) return false;
    try {
      const dob = new Date(leave.employee_dateOfBirth);
      const start = new Date(leave.start_date);

      return (
        dob.getMonth() === start.getMonth() &&
        dob.getDate() === start.getDate()
      );
    } catch {
      return false;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return { bg: "#d1f4dd", text: "#0a5d2c", border: "#7de3a6" };
      case "Rejected":
        return { bg: "#ffe0e0", text: "#c41e3a", border: "#ffb3b3" };
      default:
        return { bg: "#fff4e6", text: "#d97706", border: "#fbbf24" };
    }
  };

  // Add this filtering and sorting function (around line 150, before the totalMyBalance calculation)
  const getFilteredAndSortedLeaves = (leaves) => {
    let filtered = leaves;
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(leave => 
        (leave.employee_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leave.employee_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leave.employee_designation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leave.employee_department || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.applied_on) - new Date(a.applied_on);
        case "oldest":
          return new Date(a.applied_on) - new Date(b.applied_on);
        case "name":
          return (a.employee_name || "").localeCompare(b.employee_name || "");
        case "department":
          return (a.employee_department || "").localeCompare(b.employee_department || "");
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  // Add this line right after the filtering function
  const displayLeaves = getFilteredAndSortedLeaves(pendingLeaves);

  const totalMyBalance = myBalance
    ? (myBalance.sick || 0) + (myBalance.planned || 0)
    : 0;

  return (
    <div className="panel">
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Leave Management</h3>
        <p className="muted">Manage team leave requests and your own leaves</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "2px solid #e5e7eb" }}>
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "12px 24px",
            background: activeTab === "pending" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
            color: activeTab === "pending" ? "white" : "#6b7280",
            border: "none",
            borderBottom: activeTab === "pending" ? "3px solid #667eea" : "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            borderRadius: "8px 8px 0 0",
          }}
        >
          ⏳ Pending Approvals ({pendingLeaves.length})
        </button>
        <button
          onClick={() => setActiveTab("myLeaves")}
          style={{
            padding: "12px 24px",
            background: activeTab === "myLeaves" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
            color: activeTab === "myLeaves" ? "white" : "#6b7280",
            border: "none",
            borderBottom: activeTab === "myLeaves" ? "3px solid #667eea" : "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            borderRadius: "8px 8px 0 0",
          }}
        >
          📋 My Leaves
        </button>
        <button
          onClick={() => setActiveTab("teamBalance")}
          style={{
            padding: "12px 24px",
            background: activeTab === "teamBalance" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
            color: activeTab === "teamBalance" ? "white" : "#6b7280",
            border: "none",
            borderBottom: activeTab === "teamBalance" ? "3px solid #667eea" : "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            borderRadius: "8px 8px 0 0",
          }}
        >
          👥 Team Balance
        </button>
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === "pending" && (
        <div>
          {/* Search and Filter Bar */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr auto", 
            gap: 12, 
            marginBottom: 24,
            padding: "16px",
            background: "#f9fafb",
            borderRadius: 12,
            border: "1px solid #e5e7eb"
          }}>
            <input
              className="input"
              placeholder="🔍 Search by name, email, designation, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: 14 }}
            />
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="newest">📅 Newest First</option>
              <option value="oldest">📅 Oldest First</option>
              <option value="name">👤 Name (A-Z)</option>
              <option value="department">🏢 Department (A-Z)</option>
            </select>
          </div>

          {/* Show result count */}
          {(searchTerm || sortBy !== "newest") && (
            <div style={{ 
              marginBottom: 16, 
              fontSize: 13, 
              color: "#6b7280",
              padding: "8px 12px",
              background: "#eff6ff",
              borderRadius: 8,
              border: "1px solid #bfdbfe"
            }}>
              📊 Showing {displayLeaves.length} of {pendingLeaves.length} pending requests
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}

          {displayLeaves.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {pendingLeaves.length === 0 ? "✅" : "🔍"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {pendingLeaves.length === 0 ? "All caught up!" : "No matching results"}
              </div>
              <div style={{ fontSize: 14, marginTop: 8 }}>
                {pendingLeaves.length === 0 
                  ? "No pending leave requests" 
                  : `Try adjusting your search or filters`}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {displayLeaves.map((leave) => (
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
                          {leave.employee_name || "Unknown Employee"}

                          {/* 🎂 BIRTHDAY BADGE */}
                          {isBirthdayLeave(leave) && (
                            <span
                              style={{
                                marginLeft: 8,
                                background: "#ffe5f0",
                                color: "#d6336c",
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              🎂 Birthday Leave
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          {leave.employee_designation} • {leave.employee_department}
                        </div>
                        {leave.employee_dateOfBirth && (() => {
                          const dob = new Date(leave.employee_dateOfBirth);
                          const start = new Date(leave.start_date);

                          if (dob.getMonth() === start.getMonth() && dob.getDate() === start.getDate()) {
                            return (
                              <span style={{
                                background: "#ffebc8",
                                color: "#b45309",
                                fontSize: "12px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                display: "inline-block",
                                marginTop: "6px",
                                fontWeight: 600
                              }}>
                                🎂 Birthday Leave
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>
                          {leave.employee_email}
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
                        {leave.leave_type === "Casual" ? "🖐️" : leave.leave_type === "Sick" ? "🤒" : "⭐"}
                      </span>
                      <span style={{ fontWeight: 600, color: "#111827" }}>
                        {leave.leave_type} Leave
                      </span>
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
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ color: "#6b7280", marginBottom: 4 }}>Applied On</div>
                          <div style={{ fontWeight: 600 }}>{formatDate(leave.applied_on)}</div>
                        </div>

                        {/* ⭐ LOGOUT TIME DISPLAY (for Early Logout leaves) */}
                        {leave.logout_time && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ color: "#6b7280", marginBottom: 4 }}>Logout Time</div>
                            <div style={{ fontWeight: 600, color: "#dc2626" }}>🕐 {leave.logout_time}</div>
                          </div>
                        )}
      
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
      )}

      {/* My Leaves Tab */}
      {activeTab === "myLeaves" && (
        <div>
          {/* My Leave Balance */}
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>
              My Leave Balance
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 16 }}>
              {totalMyBalance} days
            </div>

            {myBalance && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                {/* Sick */}
                <div style={{ background: "rgba(255,255,255,0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Sick</div>
                  {/* UPDATED LINE BELOW */}
                  <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                    {myBalance.sick} <span style={{ fontSize: 14, fontWeight: 400 }}>days</span>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span>Total:</span>
                      <strong>{myBalance.sickTotal || 6}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Used:</span>
                      <strong>{(myBalance.sickTotal || 6) - myBalance.sick}</strong>
                    </div>
                  </div>
                </div>

                {/* Planned */}
                <div style={{ background: "rgba(255,255,255,0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Planned</div>
                  <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{myBalance.planned} days</div>
                  <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span>Total:</span>
                      <strong>{myBalance.plannedTotal || 12} days</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Used:</span>
                      <strong>{(myBalance.plannedTotal || 12) - myBalance.planned} days</strong>
                    </div>
                  </div>
                </div>

                {/* Optional */}
                <div style={{ background: "rgba(255,255,255,0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Optional</div>
                  <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                    {myBalance.optional || 0} days
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span>Total:</span>
                      <strong>{myBalance.optionalTotal || 2}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Used:</span>
                      <strong>{(myBalance.optionalTotal || 2) - (myBalance.optional || 0)}</strong>
                    </div>
                  </div>
                </div>

                {/* LWP */}
                <div style={{ background: "rgba(255,255,255,0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>📋 LWP</div>
                  <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{myBalance.lwp || 0} days</div>
                  <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span>Total:</span>
                      <strong>∞</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Used:</span>
                      <strong>{myBalance.lwp || 0} days</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Apply Leave */}
          <div className="card" style={{ padding: 24, marginBottom: 24, border: "1px solid #e5e7eb" }}>
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>Apply for Leave</h4>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  Leave Type *
                </label>
                <select
                  className="input"
                  value={leave.leave_type}
                  onChange={(e) => setLeave({ ...leave, leave_type: e.target.value, start_date: "", end_date: "" })}
                >
                  <option>Casual</option>
                  <option>Sick</option>
                  <option>Planned</option>
                  <option>Optional</option>
                  <option>Early Logout</option>
                  <option>Earned</option>
                  <option>LOP</option>
                </select>
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  Start Date *
                </label>
                <input
                  className="input"
                  type="date"
                  value={leave.start_date}
                  min={getMinDate()}
                  onChange={(e) => setLeave({ ...leave, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  End Date *
                </label>
                <input
                  className="input"
                  type="date"
                  value={leave.end_date}
                  min={leave.start_date || getMinDate()}
                  onChange={(e) => setLeave({ ...leave, end_date: e.target.value })}
                />
              </div>
              
              {leave.leave_type === "Early Logout" ? (
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    Logout Time * <span style={{ color: "#ef4444" }}>(Required)</span>
                  </label>
                  <input
                    className="input"
                    type="time"
                    value={leave.logout_time || ""}
                    onChange={(e) => setLeave({ ...leave, logout_time: e.target.value })}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    Reason
                  </label>
                  <input
                    className="input"
                    placeholder="Reason for leave"
                    value={leave.reason}
                    onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* ⬇️ REASON FIELD FOR EARLY LOGOUT (OUTSIDE THE GRID) */}
            {leave.leave_type === "Early Logout" && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  Reason
                </label>
                <input
                  className="input"
                  placeholder="Reason for early logout"
                  value={leave.reason}
                  onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
                />
              </div>
            )}

            <button
              className="btn"
              onClick={applyLeave}
              disabled={
                loading || 
                !leave.start_date || 
                !leave.end_date || 
                (leave.leave_type === "Early Logout" && !leave.logout_time)
              }
              style={{ width: "100%" }}
            >
              {loading ? "Submitting..." : "📝 Apply Leave"}
            </button>
          </div>

          {/* My History */}
          <div className="card" style={{ padding: 24, border: "1px solid #e5e7eb" }}>
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>My Leave History ({myHistory.length})</h4>
            {myHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14 }}>No leave applications yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myHistory.map((h) => {
                  const statusColors = getStatusColor(h.status);
                  return (
                    <div
                      key={h._id}
                      style={{
                        padding: 16,
                        border: `2px solid ${statusColors.border}`,
                        background: statusColors.bg,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 20 }}>
                              {h.leave_type === "Casual" ? "🖐️" : h.leave_type === "Sick" ? "🤒" : "⭐"}
                            </span>
                            <strong style={{ fontSize: 16 }}>{h.leave_type} Leave</strong>
                          </div>
                          <div className="muted" style={{ fontSize: 13 }}>
                            {formatDate(h.start_date)} to {formatDate(h.end_date)}
                          </div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                            {h.days} {h.days === 1 ? "day" : "days"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              background: statusColors.text,
                              color: "white",
                              fontWeight: 600,
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 13,
                            }}
                          >
                            {h.status}
                          </div>
                          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                            Applied: {formatDate(h.applied_on)}
                          </div>
                        </div>
                      </div>
                      {h.reason && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "rgba(255, 255, 255, 0.7)",
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                        >
                          <strong>Reason:</strong> {h.reason}
                        </div>
                      )}
                      {h.rejection_reason && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "#fef2f2",
                            borderRadius: 6,
                            fontSize: 13,
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <strong>✗ Rejection Reason:</strong> {h.rejection_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Balance Tab */}
      {activeTab === "teamBalance" && (
        <div>
          {teamMembers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>No team members</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Your team members will appear here</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {teamMembers.map((member) => (
                <div
                  key={member._id}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
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
                      {member.name?.charAt(0) || "E"}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {member.designation}
                      </div>
                    </div>
                  </div>

                  {member.leaveBalance && (
                    <div
                      style={{
                        background: "#f9fafb",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, fontWeight: 500 }}>
                        Leave Balance
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                        {/* Sick */}
                        <div style={{ background: "#fef2f2", padding: 10, borderRadius: 6, border: "1px solid #fca5a5" }}>
                          <div style={{ fontSize: 10, color: "#991b1b", marginBottom: 4 }}>🤒 Sick</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444", marginBottom: 2 }}>
                            {member.leaveBalance.sick || 0}
                          </div>
                          <div style={{ fontSize: 9, color: "#991b1b", borderTop: "1px solid #fca5a5", paddingTop: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                              <span>Total:</span>
                              <strong>{member.leaveBalance.sickTotal || 6}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Used:</span>
                              <strong>{(member.leaveBalance.sickTotal || 6) - (member.leaveBalance.sick || 0)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Planned */}
                        <div style={{ background: "#f0fdf4", padding: 10, borderRadius: 6, border: "1px solid #86efac" }}>
                          <div style={{ fontSize: 10, color: "#166534", marginBottom: 4 }}>🏖️ Planned</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", marginBottom: 2 }}>
                            {member.leaveBalance.planned || 0}
                          </div>
                          <div style={{ fontSize: 9, color: "#166534", borderTop: "1px solid #86efac", paddingTop: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                              <span>Total:</span>
                              <strong>{member.leaveBalance.plannedTotal || 12}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Used:</span>
                              <strong>{(member.leaveBalance.plannedTotal || 12) - (member.leaveBalance.planned || 0)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Optional - NEW CARD */}
                        <div style={{ background: "#f5f3ff", padding: 10, borderRadius: 6, border: "1px solid #c4b5fd" }}>
                          <div style={{ fontSize: 10, color: "#5b21b6", marginBottom: 4 }}>🎉 Optional</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#8b5cf6", marginBottom: 2 }}>
                            {member.leaveBalance.optional || 0}
                          </div>
                          <div style={{ fontSize: 9, color: "#5b21b6", borderTop: "1px solid #c4b5fd", paddingTop: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                              <span>Total:</span>
                              <strong>{member.leaveBalance.optionalTotal || 2}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Used:</span>
                              <strong>{(member.leaveBalance.optionalTotal || 2) - (member.leaveBalance.optional || 0)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* LWP */}
                        <div style={{ background: "#fffbeb", padding: 10, borderRadius: 6, border: "1px solid #fcd34d" }}>
                          <div style={{ fontSize: 10, color: "#92400e", marginBottom: 4 }}>📋 LOP</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", marginBottom: 2 }}>
                            {member.leaveBalance.lwp || 0}
                          </div>
                          <div style={{ fontSize: 9, color: "#92400e", borderTop: "1px solid #fcd34d", paddingTop: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                              <span>Total:</span>
                              <strong>∞</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Used:</span>
                              <strong>{member.leaveBalance.lwp || 0}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 1000,
          }}
        >
          {message}
        </div>
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
            background: "rgba(0, 0, 0, 0.6)",
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
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16, color: "#ef4444", fontSize: 22 }}>
              Reject Leave Request
            </h3>
            <p style={{ marginBottom: 16, fontSize: 14, color: "#6b7280" }}>
              Please provide a detailed reason for rejecting this leave request (mandatory):
            </p>
            <textarea
              placeholder="Enter detailed rejection reason..."
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
                  minWidth: 100,
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
                  minWidth: 150,
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

export default ManagerLeaves;