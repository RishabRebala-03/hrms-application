// src/components/AdminLeaves.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminLeaves = ({ user }) => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedLeave, setExpandedLeave] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: null, reason: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, name, department
  const [approveModal, setApproveModal] = useState({ show: false, leaveId: null, approverName: "" });
  const [partialApprovalModal, setPartialApprovalModal] = useState({
  show: false,
  leaveId: null,
  originalStart: "",
  originalEnd: "",
  approvedStart: "",
  approvedEnd: "",
  approverName: ""
  });

  // ========== ⭐ NEW ESCALATION HELPER FUNCTION ⭐ ==========
  const getEscalationInfo = (leave) => {
    const escalationLevel = leave.escalation_level || 0;
    const appliedOn = new Date(leave.applied_on);
    const now = new Date();
    const daysPending = Math.floor((now - appliedOn) / (1000 * 60 * 60 * 24));
    
    if (escalationLevel === 0) {
      const daysUntilEscalation = Math.max(0, 2 - daysPending);
      return {
        level: "Manager",
        status: daysPending >= 2 ? "overdue" : "pending",
        message: daysPending >= 2 
          ? "⚠️ Overdue - Will escalate soon"
          : `⏱️ ${daysUntilEscalation} day${daysUntilEscalation !== 1 ? 's' : ''} until escalation`,
        color: daysPending >= 2 ? "#dc2626" : "#f59e0b"
      };
    } else if (escalationLevel === 1) {
      return {
        level: "Admin (Escalated)",
        status: "escalated",
        message: "⚠️ Escalated after 2-day timeout",
        color: "#dc2626"
      };
    }
    return null;
  };
  // ========== END OF HELPER FUNCTION ==========

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching admin leaves...");
      
      // ⭐ FIX: Fetch admin-specific pending leaves using the correct endpoint
      const pendingRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/pending/admin`
      );
      console.log("✅ Admin pending leaves response:", pendingRes.data);
      
      // ⭐ FIX: Fetch all leaves for the "All Leaves" tab
      const allRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/all`
      );
      console.log("✅ All leaves response:", allRes.data.length);
      
      // ⭐ CRITICAL FIX: Use the pending/admin endpoint data for Pending tab
      const adminPending = Array.isArray(pendingRes.data) ? pendingRes.data : [];
      const allLeaves = Array.isArray(allRes.data) ? allRes.data : [];
      
      console.log(`📊 Admin pending leaves: ${adminPending.length}`);
      console.log(`📊 All leaves: ${allLeaves.length}`);
      
      // ⭐ FIX: Set the correct data to the correct state
      setPendingLeaves(adminPending);  // Only escalated admin leaves
      setAllLeaves(allLeaves.sort((a, b) => new Date(b.applied_on) - new Date(a.applied_on)));
      
      console.log(`✅ State updated: ${adminPending.length} in Pending tab, ${allLeaves.length} in All tab`);
    } catch (err) {
      console.error("❌ Error fetching leaves:", err);
      console.error("Error details:", err.response?.data);
      setMessage("Failed to load leaves");
      
      setPendingLeaves([]);
      setAllLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

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

  const handleApprove = (leave) => {
    // Open modal with date range
    setPartialApprovalModal({
      show: true,
      leaveId: leave._id,
      originalStart: leave.start_date,
      originalEnd: leave.end_date,
      approvedStart: leave.start_date, // Default to full approval
      approvedEnd: leave.end_date,
      approverName: ""
    });
  };

  const handleReject = (leaveId) => {
    setRejectModal({ show: true, leaveId, reason: "" });
  };

  const confirmApprove = async () => {
    if (!approveModal.approverName.trim()) {
      setMessage("Please enter the approver's name");
      return;
    }
    await updateStatus(approveModal.leaveId, "Approved", "", approveModal.approverName);
  };

  const confirmPartialApproval = async () => {
    if (!partialApprovalModal.approverName.trim()) {
      setMessage("Please enter the approver's name");
      return;
    }

    const isPartial = 
      partialApprovalModal.approvedStart !== partialApprovalModal.originalStart ||
      partialApprovalModal.approvedEnd !== partialApprovalModal.originalEnd;

    await updateStatus(
      partialApprovalModal.leaveId,
      "Approved",
      "",
      partialApprovalModal.approverName,
      isPartial,
      partialApprovalModal.approvedStart,
      partialApprovalModal.approvedEnd
    );
  };

  const confirmReject = async () => {
    if (!rejectModal.reason.trim()) {
      setMessage("Please enter a rejection reason");
      return;
    }
    await updateStatus(rejectModal.leaveId, "Rejected", rejectModal.reason);
  };

  const updateStatus = async (
    leaveId, 
    status, 
    rejectionReason = "", 
    approverName = "",
    isPartial = false,
    approvedStart = null,
    approvedEnd = null
  ) => {
    try {
      const payload = { status };
      
      if (status === "Rejected" && rejectionReason.trim()) {
        payload.rejection_reason = rejectionReason;
      }
      
      if (status === "Approved" && approverName.trim()) {
        payload.approved_by = approverName;
        payload.approved_on = new Date().toISOString();
        
        // Add partial approval data
        if (isPartial) {
          payload.is_partial = true;
          payload.approved_start_date = approvedStart;
          payload.approved_end_date = approvedEnd;
        }
      }

      const res = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/update_status/${leaveId}`,
        payload
      );

      if (res.status === 200) {
        setMessage(`Leave ${status.toLowerCase()} successfully ✓`);
        setRejectModal({ show: false, leaveId: null, reason: "" });
        setApproveModal({ show: false, leaveId: null, approverName: "" });
        setPartialApprovalModal({ 
          show: false, 
          leaveId: null, 
          originalStart: "", 
          originalEnd: "", 
          approvedStart: "", 
          approvedEnd: "",
          approverName: ""
        });
        fetchLeaves();
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
      default:
        return { bg: "#fff4e6", text: "#d97706", border: "#fbbf24" };
    }
  };

  // Filter and sort logic
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

  const displayLeaves = getFilteredAndSortedLeaves(
    activeTab === "pending" ? pendingLeaves : allLeaves
  );

  return (
    <div className="panel">
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Leave Management</h3>
        <p className="muted">Review and manage all leave requests across the organization</p>
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
          onClick={() => setActiveTab("all")}
          style={{
            padding: "12px 24px",
            background: activeTab === "all" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
            color: activeTab === "all" ? "white" : "#6b7280",
            border: "none",
            borderBottom: activeTab === "all" ? "3px solid #667eea" : "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            borderRadius: "8px 8px 0 0",
          }}
        >
          📋 All Leaves ({allLeaves.length})
        </button>
      </div>
      
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
          📊 Showing {displayLeaves.length} of {activeTab === "pending" ? pendingLeaves.length : allLeaves.length} leaves
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}

      {/* Leaves List */}
      {displayLeaves.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {activeTab === "pending" ? "✅" : "📋"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {activeTab === "pending" ? "All caught up!" : "No leave records"}
          </div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            {activeTab === "pending" ? "No pending leave requests" : "Leave history will appear here"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {displayLeaves.map((leave) => {
            const statusColors = getStatusColor(leave.status);
            const isPending = leave.status === "Pending";

            return (
              <div
                key={leave._id}
                style={{
                  padding: 20,
                  background: statusColors.bg,
                  borderRadius: 12,
                  border: `2px solid ${statusColors.border}`,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                        {leave.employee_name || "Unknown"}

                        {/* ⭐ ESCALATION BADGE */}
                        {leave.escalation_level === 1 && (
                          <span
                            style={{
                              marginLeft: 8,
                              background: "#dc2626",
                              color: "white",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            ⚠️ ESCALATED
                          </span>
                        )}

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
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          padding: "6px 16px",
                          borderRadius: 8,
                          background: statusColors.text,
                          color: "white",
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        {leave.status}
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
                        }}
                      >
                        {expandedLeave === leave._id ? "Hide" : "Details"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                    <span style={{ fontSize: 20 }}>
                      {leave.leave_type === "Casual" ? "🖖" : leave.leave_type === "Sick" ? "🤒" : "⭐"}
                    </span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{leave.leave_type} Leave</span>
                    <span style={{ color: "#6b7280" }}>•</span>
                    {leave.leave_type === "Early Logout" ? (
                      <span style={{ color: "#6b7280" }}>
                        🕐 Logout at {leave.logout_time || "N/A"}
                      </span>
                    ) : (
                      <span style={{ color: "#6b7280" }}>
                        {leave.days} {leave.days === 1 ? "day" : "days"}
                      </span>
                    )}
                  </div>

                  {/* ⭐ ESCALATION STATUS BOX */}
                  {leave.status === "Pending" && (() => {
                    const escalationInfo = getEscalationInfo(leave);
                    if (!escalationInfo) return null;
                    
                    return (
                      <div style={{
                        marginTop: 12,
                        padding: "12px 16px",
                        background: escalationInfo.status === "escalated" ? "#fef2f2" : "#fffbeb",
                        borderRadius: 8,
                        border: `2px solid ${escalationInfo.status === "escalated" ? "#fca5a5" : "#fcd34d"}`,
                      }}>
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 8,
                          marginBottom: 6
                        }}>
                          <span style={{ fontSize: 18 }}>
                            {escalationInfo.status === "escalated" ? "⚠️" : "📊"}
                          </span>
                          <div style={{ 
                            fontWeight: 600, 
                            color: escalationInfo.color,
                            fontSize: 14
                          }}>
                            Approval Level: {escalationInfo.level}
                          </div>
                        </div>
                        <div style={{ 
                          color: escalationInfo.color,
                          fontSize: 13 
                        }}>
                          {escalationInfo.message}
                        </div>
                      </div>
                    );
                  })()}
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
                      {leave.approved_by && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ color: "#6b7280", marginBottom: 4 }}>Approved By</div>
                          <div style={{ fontWeight: 600, color: "#10b981" }}>
                            ✓ {leave.approved_by}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {leave.rejection_reason && (
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(220, 38, 38, 0.1)",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#dc2626",
                      border: "1px solid rgba(220, 38, 38, 0.3)",
                      marginBottom: 12,
                    }}
                  >
                    <strong>✗ Rejection Reason:</strong> {leave.rejection_reason}
                  </div>
                )}

                {isPending && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleApprove(leave)}
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
                )}
              </div>
            );
          })}
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
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
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
      {/* Approval Modal */}
      {approveModal.show && (
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
          onClick={() => setApproveModal({ show: false, leaveId: null, approverName: "" })}
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
            <h3 style={{ marginTop: 0, marginBottom: 8, color: "#10b981", fontSize: 22 }}>
              ✓ Approve Leave Request
            </h3>
            <p style={{ marginBottom: 24, fontSize: 14, color: "#6b7280" }}>
              Please enter your name to approve this leave request (mandatory for audit trail)
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                fontSize: 13, 
                color: "#374151", 
                display: "block", 
                marginBottom: 8,
                fontWeight: 600 
              }}>
                Approver Name *
              </label>
              <input
                type="text"
                placeholder="Enter your full name (e.g., John Doe - CEO)"
                value={approveModal.approverName}
                onChange={(e) => setApproveModal({ ...approveModal, approverName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14,
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  outline: "none",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.borderColor = "#10b981"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                autoFocus
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                💡 Tip: Include your designation for better tracking (e.g., "Sarah Johnson - CFO")
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setApproveModal({ show: false, leaveId: null, approverName: "" })}
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
                disabled={!approveModal.approverName.trim()}
                style={{
                  background: approveModal.approverName.trim() ? "#10b981" : "#cbd5e1",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: approveModal.approverName.trim() ? "pointer" : "not-allowed",
                  minWidth: 150,
                }}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Partial Approval Modal */}
      {partialApprovalModal.show && (
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
          onClick={() => setPartialApprovalModal({ 
            show: false, 
            leaveId: null, 
            originalStart: "", 
            originalEnd: "", 
            approvedStart: "", 
            approvedEnd: "",
            approverName: ""
          })}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 16,
              maxWidth: 600,
              width: "90%",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, color: "#10b981", fontSize: 22 }}>
              ✓ Approve Leave Request
            </h3>
            <p style={{ marginBottom: 24, fontSize: 14, color: "#6b7280" }}>
              You can approve the entire leave period or select specific dates
            </p>

            {/* Original Date Range Display */}
            <div style={{ 
              background: "#eff6ff", 
              padding: 16, 
              borderRadius: 8, 
              marginBottom: 20,
              border: "1px solid #bfdbfe"
            }}>
              <div style={{ fontSize: 12, color: "#1e40af", marginBottom: 8, fontWeight: 600 }}>
                📅 Requested Leave Period
              </div>
              <div style={{ fontSize: 14, color: "#3b82f6", fontWeight: 500 }}>
                {formatDate(partialApprovalModal.originalStart)} → {formatDate(partialApprovalModal.originalEnd)}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                ({(() => {
                  const start = new Date(partialApprovalModal.originalStart);
                  const end = new Date(partialApprovalModal.originalEnd);
                  return (Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
                })()} days total)
              </div>
            </div>

            {/* Approved Date Range Selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                fontSize: 13, 
                color: "#374151", 
                display: "block", 
                marginBottom: 8,
                fontWeight: 600 
              }}>
                Approve Date Range *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={partialApprovalModal.approvedStart}
                    min={partialApprovalModal.originalStart}
                    max={partialApprovalModal.originalEnd}
                    onChange={(e) => setPartialApprovalModal({ 
                      ...partialApprovalModal, 
                      approvedStart: e.target.value 
                    })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 14,
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#10b981"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={partialApprovalModal.approvedEnd}
                    min={partialApprovalModal.approvedStart || partialApprovalModal.originalStart}
                    max={partialApprovalModal.originalEnd}
                    onChange={(e) => setPartialApprovalModal({ 
                      ...partialApprovalModal, 
                      approvedEnd: e.target.value 
                    })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 14,
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#10b981"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
              </div>
              
              {/* Show calculated days */}
              {partialApprovalModal.approvedStart && partialApprovalModal.approvedEnd && (
                <div style={{ 
                  marginTop: 8, 
                  padding: "8px 12px", 
                  background: "#f0fdf4",
                  borderRadius: 6,
                  border: "1px solid #86efac",
                  fontSize: 12,
                  color: "#166534"
                }}>
                  ✓ Approving {(() => {
                    const start = new Date(partialApprovalModal.approvedStart);
                    const end = new Date(partialApprovalModal.approvedEnd);
                    return (Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
                  })()} day(s)
                  {partialApprovalModal.approvedStart !== partialApprovalModal.originalStart ||
                  partialApprovalModal.approvedEnd !== partialApprovalModal.originalEnd ? (
                    <span style={{ fontWeight: 600 }}> (Partial Approval)</span>
                  ) : (
                    <span style={{ fontWeight: 600 }}> (Full Approval)</span>
                  )}
                </div>
              )}
            </div>

            {/* Approver Name */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                fontSize: 13, 
                color: "#374151", 
                display: "block", 
                marginBottom: 8,
                fontWeight: 600 
              }}>
                Approver Name *
              </label>
              <input
                type="text"
                placeholder="Enter your full name (e.g., John Doe - CEO)"
                value={partialApprovalModal.approverName}
                onChange={(e) => setPartialApprovalModal({ 
                  ...partialApprovalModal, 
                  approverName: e.target.value 
                })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14,
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  outline: "none",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.borderColor = "#10b981"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setPartialApprovalModal({ 
                  show: false, 
                  leaveId: null, 
                  originalStart: "", 
                  originalEnd: "", 
                  approvedStart: "", 
                  approvedEnd: "",
                  approverName: ""
                })}
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
                onClick={confirmPartialApproval}
                disabled={!partialApprovalModal.approverName.trim() || 
                        !partialApprovalModal.approvedStart || 
                        !partialApprovalModal.approvedEnd}
                style={{
                  background: (partialApprovalModal.approverName.trim() && 
                              partialApprovalModal.approvedStart && 
                              partialApprovalModal.approvedEnd) ? "#10b981" : "#cbd5e1",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (partialApprovalModal.approverName.trim() && 
                          partialApprovalModal.approvedStart && 
                          partialApprovalModal.approvedEnd) ? "pointer" : "not-allowed",
                  minWidth: 150,
                }}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeaves;