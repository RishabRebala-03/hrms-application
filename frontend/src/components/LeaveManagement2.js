// src/components/LeaveManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const LeaveManagement = ({ user, role }) => {
  const [activeTab, setActiveTab] = useState("managerWise"); // managerWise, allLeaves, employeeLookup
  const [managerWiseLeaves, setManagerWiseLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [expandedManager, setExpandedManager] = useState(null);
  const [expandedLeave, setExpandedLeave] = useState(null);
  
  // Employee lookup
  const [employeeId, setEmployeeId] = useState("");
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [leave, setLeave] = useState({ 
    leave_type: "Casual", 
    start_date: "", 
    end_date: "", 
    reason: "" 
  });
  
  const [approvalModal, setApprovalModal] = useState({ show: false, leaveId: null, reason: "" });
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: null, reason: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchManagerWiseLeaves = async () => {
    try {
      setLoading(true);
      const [usersRes, leavesRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/all`),
      ]);

      const users = usersRes.data;
      const leaves = leavesRes.data;
      const pending = leaves.filter((l) => l.status === "Pending");

      // Group pending leaves by manager
      const managerLeaveMap = {};
      
      for (const leave of pending) {
        const employee = users.find(u => u._id === leave.employee_id);
        if (employee && employee.managerEmail) {
          const managerEmail = employee.managerEmail;
          if (!managerLeaveMap[managerEmail]) {
            const manager = users.find(u => u.email === managerEmail);
            managerLeaveMap[managerEmail] = {
              manager: manager || { name: "Unknown Manager", email: managerEmail },
              leaves: []
            };
          }
          managerLeaveMap[managerEmail].leaves.push({
            ...leave,
            employee_name: employee.name,
            employee_designation: employee.designation,
            employee_department: employee.department,
            employee_email: employee.email
          });
        }
      }

      setManagerWiseLeaves(Object.values(managerLeaveMap));
    } catch (err) {
      console.error("Error fetching manager-wise leaves:", err);
      setMessage("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/all`);
      setAllLeaves(res.data);
    } catch (err) {
      console.error("Error fetching all leaves:", err);
      setMessage("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "managerWise") {
      fetchManagerWiseLeaves();
    } else if (activeTab === "allLeaves") {
      fetchAllLeaves();
    }
  }, [activeTab]);

  const getBalance = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/balance/${employeeId}`);
      setBalance(res.data);
      setMessage("Balance loaded successfully");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setMessage("Failed to fetch balance");
    }
  };

  const getHistory = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/history/${employeeId}`);
      setHistory(res.data);
      setMessage(`Loaded ${res.data.length} leave records`);
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setMessage("Failed to fetch history");
    }
  };

  const applyLeave = async () => {
    if (!employeeId) {
      setMessage("Please enter Employee ID first");
      return;
    }
    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/apply`, {
        employee_id: employeeId,
        leave_type: leave.leave_type,
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason
      });
      
      if (res.status === 201) {
        setMessage("Leave applied successfully ✓");
        setLeave({ leave_type: "Casual", start_date: "", end_date: "", reason: "" });
        if (history.length > 0) {
          getHistory();
        }
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error: " + (err.response?.data?.error || "failed"));
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleApprove = (leaveId) => {
    setApprovalModal({ show: true, leaveId, reason: "" });
  };

  const confirmApprove = async () => {
    if (!approvalModal.leaveId) return;
    await updateStatus(approvalModal.leaveId, "Approved", approvalModal.reason);
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

  const updateStatus = async (id, status, reason = "") => {
    try {
      const payload = { status };
      if (reason.trim()) {
        if (status === "Rejected") {
          payload.rejection_reason = reason;
        } else {
          payload.approval_note = reason;
        }
      }

      const res = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/update_status/${id}`,
        payload
      );
      
      if (res.status === 200) {
        setMessage(`Leave ${status.toLowerCase()} successfully ✓`);
        setApprovalModal({ show: false, leaveId: null, reason: "" });
        setRejectModal({ show: false, leaveId: null, reason: "" });
        
        // Refresh data based on active tab
        if (activeTab === "managerWise") {
          fetchManagerWiseLeaves();
        } else if (activeTab === "allLeaves") {
          fetchAllLeaves();
        }
        
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error");
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

  return (
    <>
      <div className="panel">
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: 0, marginBottom: 8 }}>Leave Management</h3>
          <p className="muted">Manage all leave requests across the organization</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "2px solid #e5e7eb" }}>
          <button
            onClick={() => setActiveTab("managerWise")}
            style={{
              padding: "12px 24px",
              background: activeTab === "managerWise" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
              color: activeTab === "managerWise" ? "white" : "#6b7280",
              border: "none",
              borderBottom: activeTab === "managerWise" ? "3px solid #667eea" : "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              borderRadius: "8px 8px 0 0",
            }}
          >
            ⏳ Manager-wise Pending
          </button>
          <button
            onClick={() => setActiveTab("allLeaves")}
            style={{
              padding: "12px 24px",
              background: activeTab === "allLeaves" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
              color: activeTab === "allLeaves" ? "white" : "#6b7280",
              border: "none",
              borderBottom: activeTab === "allLeaves" ? "3px solid #667eea" : "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              borderRadius: "8px 8px 0 0",
            }}
          >
            📋 All Leaves
          </button>
          <button
            onClick={() => setActiveTab("employeeLookup")}
            style={{
              padding: "12px 24px",
              background: activeTab === "employeeLookup" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
              color: activeTab === "employeeLookup" ? "white" : "#6b7280",
              border: "none",
              borderBottom: activeTab === "employeeLookup" ? "3px solid #667eea" : "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              borderRadius: "8px 8px 0 0",
            }}
          >
            🔍 Employee Lookup
          </button>
        </div>

        {/* Manager-wise Pending Tab */}
        {activeTab === "managerWise" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <div style={{ fontSize: 16 }}>Loading...</div>
              </div>
            ) : managerWiseLeaves.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>All caught up!</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>No pending leave requests</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {managerWiseLeaves.map((managerGroup, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "2px solid #e5e7eb",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {/* Manager Header */}
                    <div
                      onClick={() => setExpandedManager(expandedManager === idx ? null : idx)}
                      style={{
                        background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                        padding: "16px 20px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 700,
                            fontSize: 16,
                          }}
                        >
                          {managerGroup.manager.name?.charAt(0) || "M"}
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                            {managerGroup.manager.name}
                          </div>
                          <div style={{ fontSize: 13, color: "#6b7280" }}>
                            {managerGroup.leaves.length} pending {managerGroup.leaves.length === 1 ? "request" : "requests"}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 20 }}>
                        {expandedManager === idx ? "▼" : "▶"}
                      </div>
                    </div>

                    {/* Leaves under this manager */}
                    {expandedManager === idx && (
                      <div style={{ padding: "16px", background: "#fafafa" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {managerGroup.leaves.map((leave) => (
                            <div
                              key={leave._id}
                              style={{
                                padding: 16,
                                background: "#fffbeb",
                                borderRadius: 10,
                                border: "2px solid #fbbf24",
                              }}
                            >
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                  <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                                      {leave.employee_name}
                                    </div>
                                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                                      {leave.employee_designation} • {leave.employee_department}
                                    </div>
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
                                  onClick={() => handleApprove(leave._id)}
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Leaves Tab */}
        {activeTab === "allLeaves" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <div style={{ fontSize: 16 }}>Loading...</div>
              </div>
            ) : allLeaves.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16 }}>No leave records found</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {allLeaves.map((leave) => {
                  const statusColors = getStatusColor(leave.status);
                  return (
                    <div
                      key={leave._id}
                      className="card small"
                      style={{
                        padding: 16,
                        border: `2px solid ${statusColors.border}`,
                        background: statusColors.bg,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 20 }}>
                              {leave.leave_type === "Casual" ? "🖐️" : leave.leave_type === "Sick" ? "🤒" : "⭐"}
                            </span>
                            <strong style={{ fontSize: 16 }}>{leave.leave_type} Leave</strong>
                          </div>
                          <div className="muted" style={{ fontSize: 13 }}>
                            {formatDate(leave.start_date)} to {formatDate(leave.end_date)} ({leave.days} {leave.days === 1 ? 'day' : 'days'})
                          </div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            Employee ID: {leave.employee_id}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            className="badge"
                            style={{
                              background: statusColors.text,
                              color: "white",
                              fontWeight: 600,
                              padding: "6px 12px",
                            }}
                          >
                            {leave.status}
                          </div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            Applied: {formatDate(leave.applied_on)}
                          </div>
                        </div>
                      </div>

                      {leave.reason && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "rgba(255, 255, 255, 0.7)",
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                        >
                          <strong>Reason:</strong> {leave.reason}
                        </div>
                      )}

                      {leave.approval_note && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "#d1f4dd",
                            borderRadius: 6,
                            fontSize: 13,
                            color: "#0a5d2c",
                            border: "1px solid #7de3a6",
                          }}
                        >
                          <strong>✓ Approval Note:</strong> {leave.approval_note}
                        </div>
                      )}

                      {leave.rejection_reason && (
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
                          <strong>✗ Rejection Reason:</strong> {leave.rejection_reason}
                        </div>
                      )}

                      {leave.status === "Pending" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button
                            className="btn"
                            style={{ flex: 1, background: "#10b981" }}
                            onClick={() => handleApprove(leave._id)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn"
                            style={{ flex: 1, background: "#ef4444", color: "white" }}
                            onClick={() => handleReject(leave._id)}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Employee Lookup Tab */}
        {activeTab === "employeeLookup" && (
          <div>
            {/* Employee Lookup Section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 12 }}>
                <input
                  className="input"
                  placeholder="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
                <button className="btn" onClick={getBalance}>
                  Get Balance
                </button>
                <button className="btn ghost" onClick={getHistory}>
                  View History
                </button>
              </div>
            </div>

            {/* Leave Balance Card */}
            {balance && (
              <div style={{ marginBottom: 20 }} className="card small">
                <div className="card-title">Leave Balance</div>
                <div style={{ marginTop: 8 }}>
                  <div className="kv">
                    <div>Casual Leave</div>
                    <div style={{ fontWeight: 600 }}>{balance.casual}</div>
                  </div>
                  <div className="kv">
                    <div>Sick Leave</div>
                    <div style={{ fontWeight: 600 }}>{balance.sick}</div>
                  </div>
                  <div className="kv">
                    <div>Earned Leave</div>
                    <div style={{ fontWeight: 600 }}>{balance.earned}</div>
                  </div>
                  <div className="kv">
                    <div>LWP (Leave Without Pay)</div>
                    <div style={{ fontWeight: 600 }}>{balance.lwp}</div>
                  </div>
                </div>
              </div>
            )}

            <hr style={{ margin: "24px 0" }} />

            {/* Apply for Leave Section */}
            <h4>Apply for Leave</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <select
                className="input"
                value={leave.leave_type}
                onChange={(e) => setLeave({ ...leave, leave_type: e.target.value })}
              >
                <option>Casual</option>
                <option>Sick</option>
                <option>Earned</option>
                <option>LWP</option>
              </select>
              <input
                className="input"
                type="date"
                placeholder="Start date"
                value={leave.start_date}
                onChange={(e) => setLeave({ ...leave, start_date: e.target.value })}
              />
              <input
                className="input"
                type="date"
                placeholder="End date"
                value={leave.end_date}
                onChange={(e) => setLeave({ ...leave, end_date: e.target.value })}
              />
              <input
                className="input"
                placeholder="Reason"
                value={leave.reason}
                onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
              />
            </div>
            <button className="btn" onClick={applyLeave}>
              Apply Leave
            </button>

            {/* Leave History Section */}
            {history.length > 0 && (
              <>
                <hr style={{ margin: "24px 0" }} />
                <h4>Leave History ({history.length})</h4>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {history.map((h) => {
                    const statusColors = getStatusColor(h.status);
                    return (
                      <div
                        key={h._id}
                        className="card small"
                        style={{
                          padding: 16,
                          border: `2px solid ${statusColors.border}`,
                          background: statusColors.bg
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong style={{ fontSize: 15 }}>{h.leave_type} Leave</strong>
                            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                              {formatDate(h.start_date)} to {formatDate(h.end_date)} ({h.days} {h.days === 1 ? 'day' : 'days'})
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              className="badge"
                              style={{
                                background: statusColors.text,
                                color: "white",
                                fontWeight: 600
                              }}
                            >
                              {h.status}
                            </div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                              Applied: {formatDate(h.applied_on)}
                            </div>
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
          </>
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

    {/* Approval Modal */}
    {approvalModal.show && (
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
        onClick={() => setApprovalModal({ show: false, leaveId: null, reason: "" })}
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
          <h3 style={{ marginTop: 0, marginBottom: 16, color: "#10b981", fontSize: 22 }}>
            Approve Leave Request
          </h3>
          <p style={{ marginBottom: 16, fontSize: 14, color: "#6b7280" }}>
            You can add an optional note/reason for approving this leave request:
          </p>
          <textarea
            placeholder="Enter optional approval note..."
            value={approvalModal.reason}
            onChange={(e) => setApprovalModal({ ...approvalModal, reason: e.target.value })}
            rows={4}
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
          />
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              onClick={() => setApprovalModal({ show: false, leaveId: null, reason: "" })}
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
              onClick={confirmApprove}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                minWidth: 150,
              }}
            >
              Confirm Approval
            </button>
          </div>
        </div>
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
</>
);
};

export default LeaveManagement;