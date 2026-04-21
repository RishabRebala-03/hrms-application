// src/components/EmployeeLeaves.js - WITH INTERN RESTRICTIONS + LOOPHOLE FIX
import React, { useState, useEffect } from "react";
import axios from "axios";

const EmployeeLeaves = ({ user }) => {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [leave, setLeave] = useState({
    leave_type: "Sick",
    start_date: "",
    end_date: "",
    reason: "",
    logout_time: "",
    is_half_day: false,
    half_day_period: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showTeamApprovals, setShowTeamApprovals] = useState(false);
  const [hasReportees, setHasReportees] = useState(false);
  const [teamPendingLeaves, setTeamPendingLeaves] = useState([]);
  const [expandedTeamLeave, setExpandedTeamLeave] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: null, reason: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyFilterStatus, setHistoryFilterStatus] = useState("all");
  const [historyFilterType, setHistoryFilterType] = useState("all");
  const [historySortBy, setHistorySortBy] = useState("newest");
  
  const [activeTab, setActiveTab] = useState("my-leaves");

  const fetchData = async () => {
    try {
      setLoading(true);

      const balanceRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/balance/${user.id}`
      );
      setBalance(balanceRes.data);

      const historyRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/history/${user.id}`
      );
      setHistory(historyRes.data);
    } catch (err) {
      console.error("Error fetching leave data:", err);
      setMessage("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  const checkForReportees = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(user.email)}`
      );
      const reportees = res.data;
      
      if (Array.isArray(reportees) && reportees.length > 0) {
        setHasReportees(true);
      } else {
        setHasReportees(false);
      }
    } catch (err) {
      console.error("Error checking reportees:", err);
      setHasReportees(false);
    }
  };

  const fetchTeamPendingLeaves = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/pending/${encodeURIComponent(user.email)}`
      );
      setTeamPendingLeaves(res.data);
    } catch (err) {
      console.error("Error fetching team pending leaves:", err);
    }
  };

  useEffect(() => {
    if (user?.id && user?.email) { 
      fetchData();
      checkForReportees();
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (hasReportees && activeTab === "team-leaves") {
      fetchTeamPendingLeaves();
    }
  }, [hasReportees, activeTab]);

  const isBirthdayDate = (dateStr) => {
    if (!dateStr || !user?.dateOfBirth) return false;
    
    try {
      let dob = user.dateOfBirth;
      if (typeof dob === "object" && dob.$date) {
        dob = new Date(dob.$date);
      } else {
        dob = new Date(dob);
      }
      
      const selectedDate = new Date(dateStr);
      
      return (
        dob.getMonth() === selectedDate.getMonth() &&
        dob.getDate() === selectedDate.getDate()
      );
    } catch (err) {
      return false;
    }
  };

  // ============================================================
  // ✅ LOOPHOLE FIX: getMinDate and getMaxDate now accept an
  //    optional leaveType param so the edit modal uses the same
  //    date constraints as the apply form.
  // ============================================================
  const getMinDate = (leaveType) => {
    const type = (leaveType || leave.leave_type).toLowerCase();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (type === "planned") {
      const minDate = new Date(today);
      minDate.setDate(today.getDate() + 8); // 7 days advance
      return minDate.toISOString().split('T')[0];
    }

    return todayStr; // sick, early logout, lwp, optional — today at earliest
  };

  const getMaxDate = (leaveType) => {
    const type = (leaveType || leave.leave_type).toLowerCase();
    if (type === "sick") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    return undefined;
  };

  const isDateBlockedForPlanned = (dateStr) => {
    if (leave.leave_type !== "Planned") return false;
    
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.floor((selectedDate - today) / (1000 * 60 * 60 * 24));
    return daysDifference < 7;
  };

  const handleDateClick = (e, dateField) => {
    const selectedDate = e.target.value;
    
    if (dateField === "start") {
      handleStartDateChange(selectedDate);
    } else {
      setLeave(prev => ({ ...prev, end_date: selectedDate }));
    }
  };

  const handleHalfDayChange = (checked) => {
    setLeave(prev => ({
      ...prev,
      is_half_day: checked,
      half_day_period: checked ? "morning" : "",
      end_date: checked ? prev.start_date : prev.end_date
    }));
  };

  const handleStartDateChange = (value) => {
    setLeave(prev => ({
      ...prev,
      start_date: value,
      end_date: prev.is_half_day ? value : prev.end_date
    }));
  };

  // ============================================================
  // ✅ LOOPHOLE FIX: Client-side edit validation — mirrors apply
  //    rules so the user sees errors before the request is sent.
  // ============================================================
  const validateEditLeave = (editData) => {
    const { leave_type, start_date, end_date, is_half_day, half_day_period, logout_time } = editData;
    const type = leave_type.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(end_date);
    end.setHours(0, 0, 0, 0);

    const daysDiff = Math.round((start - today) / (1000 * 60 * 60 * 24));

    if (type === "planned") {
      if (daysDiff < 7) {
        return "Planned leave must be applied at least 7 days in advance.";
      }
    } else if (type === "sick") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      if (start < today) return `Sick leave cannot be applied for past dates (${start_date}).`;
      if (start > tomorrow) return "Sick leave can only be applied for today or tomorrow.";
      if (end > tomorrow) return "Sick leave end date cannot be beyond tomorrow.";
    } else if (type === "early logout") {
      if (start < today) return `Early logout cannot be applied for past dates (${start_date}).`;
      if (!logout_time || !logout_time.trim()) return "Logout time is mandatory for early logout.";
    } else {
      if (start < today) return `Cannot apply leave for past dates (${start_date}).`;
      if (end < today) return "End date cannot be before today.";
    }

    if (is_half_day) {
      if (start_date !== end_date) return "Half-day leave can only be applied for a single day.";
      if (!half_day_period || !["morning", "afternoon"].includes(half_day_period)) {
        return "Please select half-day period (morning or afternoon).";
      }
    }

    return null; // no error
  };

  const applyLeave = async () => {
    if (!leave.start_date || !leave.end_date) {
      setMessage("Please select start and end dates");
      return;
    }

    if (!leave.reason || !leave.reason.trim()) {
      setMessage("⚠️ Reason is mandatory. Please provide a reason for your leave.");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    if (leave.is_half_day && !leave.half_day_period) {
      setMessage("⚠️ Please select half-day period (morning or afternoon)");
      setTimeout(() => setMessage(""), 5000);
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
        is_half_day: leave.is_half_day,
        half_day_period: leave.half_day_period || "",
      });

      if (res.status === 201) {
        setMessage("Leave applied successfully ✓");
        setLeave({ 
          leave_type: "Sick", 
          start_date: "", 
          end_date: "", 
          reason: "", 
          logout_time: "",
          is_half_day: false,
          half_day_period: "",
        });
        fetchData();
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

  const updateLeave = async () => {
    if (!editingLeave.start_date || !editingLeave.end_date) {
      setMessage("Please select start and end dates");
      return;
    }

    // ✅ LOOPHOLE FIX: Run client-side validation before submitting
    const validationError = validateEditLeave(editingLeave);
    if (validationError) {
      setMessage("⚠️ " + validationError);
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/update/${editingLeave._id}`,
        {
          leave_type: editingLeave.leave_type,
          start_date: editingLeave.start_date,
          end_date: editingLeave.end_date,
          reason: editingLeave.reason,
          logout_time: editingLeave.logout_time || "",
          is_half_day: editingLeave.is_half_day || false,
          half_day_period: editingLeave.half_day_period || "",
        }
      );

      if (res.status === 200) {
        setMessage("Leave updated successfully ✓");
        setEditingLeave(null);
        fetchData();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error: " + (err.response?.data?.error || "Failed to update leave"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
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

  const getFilteredAndSortedHistory = (leaves) => {
    let filtered = [...leaves];
    
    if (historySearchTerm.trim()) {
      filtered = filtered.filter(leave => 
        (leave.leave_type || "").toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        (leave.reason || "").toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        (leave.status || "").toLowerCase().includes(historySearchTerm.toLowerCase())
      );
    }
    
    if (historyFilterStatus !== "all") {
      filtered = filtered.filter(leave => 
        leave.status?.toLowerCase() === historyFilterStatus.toLowerCase()
      );
    }
    
    if (historyFilterType !== "all") {
      filtered = filtered.filter(leave => 
        leave.leave_type?.toLowerCase() === historyFilterType.toLowerCase()
      );
    }
    
    const sorted = [...filtered].sort((a, b) => {
      switch (historySortBy) {
        case "newest":
          return new Date(b.applied_on) - new Date(a.applied_on);
        case "oldest":
          return new Date(a.applied_on) - new Date(b.applied_on);
        case "start_date":
          return new Date(b.start_date) - new Date(a.start_date);
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        case "type":
          return (a.leave_type || "").localeCompare(b.leave_type || "");
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  const getFilteredAndSortedTeamLeaves = (leaves) => {
    let filtered = leaves;
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(leave => 
        (leave.employee_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leave.employee_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leave.employee_designation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leave.employee_department || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
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

  const displayHistory = getFilteredAndSortedHistory(history);
  const displayTeamLeaves = getFilteredAndSortedTeamLeaves(teamPendingLeaves);

  const cancelLeave = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave?")) return;

    try {
      setLoading(true);

      const res = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/cancel/${leaveId}`
      );

      if (res.status === 200) {
        setMessage("Leave cancelled successfully ✓");
        fetchData();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage(
        "Error: " + (err.response?.data?.error || "Failed to cancel leave")
      );
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamReject = (leaveId) => {
    setRejectModal({ show: true, leaveId, reason: "" });
  };

  const confirmTeamReject = async () => {
    if (!rejectModal.reason.trim()) {
      setMessage("Please enter a rejection reason");
      return;
    }
    await updateTeamLeaveStatus(rejectModal.leaveId, "Rejected", rejectModal.reason);
  };

  const updateTeamLeaveStatus = async (leaveId, status, rejectionReason = "") => {
    try {
      const payload = { 
        status,
        approved_by: user.name || user.email
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
        fetchTeamPendingLeaves();
        setTimeout(() => setMessage(""), 3000);
        
        // Trigger notification refresh
        window.dispatchEvent(new Event('refreshNotifications'));
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

  const totalBalance = balance
    ? (balance.sick || 0) + (balance.planned || 0)
    : 0;

  // Check if user is an intern
  const isIntern = user.employment_type === "Intern";

  return (
    <div className="panel">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>
          {hasReportees && activeTab === "team-leaves" ? "Team Leave Approvals" : "My Leaves"}
        </h3>
        <p className="muted">
          {hasReportees && activeTab === "team-leaves" 
            ? "Review and approve leave requests from your team" 
            : "Apply for leave and track your leave balance"}
        </p>
      </div>

      {/* Tab Navigation for users with reportees */}
      {hasReportees && (
        <div style={{ 
          display: "flex", 
          gap: 8, 
          marginBottom: 24,
          borderBottom: "2px solid #e5e7eb"
        }}>
          <button
            onClick={() => setActiveTab("my-leaves")}
            style={{
              padding: "12px 24px",
              background: activeTab === "my-leaves" ? "white" : "transparent",
              border: "none",
              borderBottom: activeTab === "my-leaves" ? "3px solid #667eea" : "3px solid transparent",
              color: activeTab === "my-leaves" ? "#667eea" : "#6b7280",
              fontWeight: activeTab === "my-leaves" ? 600 : 400,
              cursor: "pointer",
              fontSize: 15,
              transition: "all 0.2s"
            }}
          >
            My Leaves
          </button>
          <button
            onClick={() => setActiveTab("team-leaves")}
            style={{
              padding: "12px 24px",
              background: activeTab === "team-leaves" ? "white" : "transparent",
              border: "none",
              borderBottom: activeTab === "team-leaves" ? "3px solid #667eea" : "3px solid transparent",
              color: activeTab === "team-leaves" ? "#667eea" : "#6b7280",
              fontWeight: activeTab === "team-leaves" ? 600 : 400,
              cursor: "pointer",
              fontSize: 15,
              transition: "all 0.2s",
              position: "relative"
            }}
          >
            Team Leaves
            {teamPendingLeaves.length > 0 && (
              <span style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "#ef4444",
                color: "white",
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700
              }}>
                {teamPendingLeaves.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* CONDITIONAL RENDERING BASED ON ACTIVE TAB */}
      {activeTab === "my-leaves" ? (
        <>
          {/* Leave Balance Section */}
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
              Total Leave Balance
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 16 }}>
              {isIntern ? (balance?.sick || 0) : totalBalance} days
            </div>
            
            {balance && (
              <>
                {isIntern ? (
                  // INTERNS: ONLY Sick Leave Card
                  <div style={{ maxWidth: 300 }}>
                    <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>🤒 Sick</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.sick || 0} days</div>
                      <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span>Total:</span>
                          <strong>{balance.sickTotal || 0} days</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Used:</span>
                          <strong>{(balance.sickTotal || 0) - (balance.sick || 0)} days</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // REGULAR EMPLOYEES: All Leave Cards
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                    {/* Sick */}
                    <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>🤒 Sick</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.sick} days</div>
                      <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span>Total:</span>
                          <strong>{balance.sickTotal || 6} days</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Used:</span>
                          <strong>{(balance.sickTotal || 6) - balance.sick} days</strong>
                        </div>
                      </div>
                    </div>

                    {/* Planned */}
                    <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>📅 Planned</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.planned} days</div>
                      <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span>Total:</span>
                          <strong>{balance.plannedTotal || 12} days</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Used:</span>
                          <strong>{(balance.plannedTotal || 12) - balance.planned} days</strong>
                        </div>
                      </div>
                    </div>

                    {/* Optional Holiday */}
                    <div style={{ background: "rgba(255,255,255,0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)" }}>
                      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Optional</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.optional || 0} days</div>
                      <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span>Total:</span>
                          <strong>{balance.optionalTotal || 2} days</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Used:</span>
                          <strong>{(balance.optionalTotal || 2) - (balance.optional || 0)} days</strong>
                        </div>
                      </div>
                    </div>

                    {/* LWP */}
                    <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>📋 LOP</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.lwp} days</div>
                      <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span>Total:</span>
                          <strong>∞</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Used:</span>
                          <strong>{balance.lwp} days</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Apply Leave Form */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>Apply for Leave</h4>
            
            {message && (
              <div style={{
                padding: 12,
                marginBottom: 16,
                borderRadius: 8,
                background: message.includes("Error") || message.includes("⚠️") ? "#fee2e2" : "#d1f4dd",
                color: message.includes("Error") || message.includes("⚠️") ? "#dc2626" : "#0a5d2c",
                border: `1px solid ${message.includes("Error") || message.includes("⚠️") ? "#fecaca" : "#7de3a6"}`,
                fontSize: 14,
                fontWeight: 500
              }}>
                {message}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Leave Type</label>
                <select
                  className="input"
                  value={leave.leave_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const allowsHalfDay = ["Sick", "LWP", "LOP"].includes(newType);
                    setLeave(prev => ({
                      ...prev,
                      leave_type: newType,
                      is_half_day: allowsHalfDay ? prev.is_half_day : false,
                      half_day_period: allowsHalfDay ? prev.half_day_period : "",
                      start_date: "",
                      end_date: "",
                    }));
                  }}
                >
                  <option value="Sick">Sick Leave</option>
                  {isIntern ? (
                    <>
                      <option value="LOP">Leave Without Pay (LOP)</option>
                      <option value="Early Logout">Early Logout</option>
                    </>
                  ) : (
                    <>
                      <option value="Planned">Planned Leave</option>
                      <option value="Optional">Optional Holiday</option>
                      <option value="LOP">Leave Without Pay (LOP)</option>
                      <option value="Early Logout">Early Logout</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="label">Start Date</label>
                <input
                  className="input"
                  type="date"
                  value={leave.start_date}
                  onChange={(e) => handleDateClick(e, "start")}
                  min={getMinDate()}
                  max={getMaxDate()}
                />
              </div>

              <div>
                <label className="label">End Date</label>
                <input
                  className="input"
                  type="date"
                  value={leave.end_date}
                  onChange={(e) => handleDateClick(e, "end")}
                  min={leave.start_date || getMinDate()}
                  max={leave.leave_type === "Sick" ? getMaxDate() : undefined}
                  disabled={leave.is_half_day}
                />
              </div>

              {leave.leave_type === "Early Logout" && (
                <div>
                  <label className="label">Logout Time *</label>
                  <input
                    className="input"
                    type="time"
                    value={leave.logout_time}
                    onChange={(e) => setLeave({ ...leave, logout_time: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Planned Leave Warning Message */}
            {leave.leave_type === "Planned" && !isIntern && (
              <div style={{ 
                marginBottom: 16, 
                padding: 12, 
                background: "#fef3c7", 
                borderRadius: 8, 
                border: "1px solid #fbbf24",
                display: "flex",
                gap: 10,
                alignItems: "start"
              }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#92400e", marginBottom: 4 }}>
                    Planned Leave Policy
                  </div>
                  <div style={{ fontSize: 13, color: "#92400e" }}>
                    Planned leave must be applied at least <strong>7 days in advance</strong>. 
                    The calendar above will only allow you to select dates that are 7 or more days from today.
                  </div>
                </div>
              </div>
            )}

            {/* Sick Leave Policy Warning */}
            {leave.leave_type === "Sick" && (
              <div style={{ 
                marginBottom: 16, 
                padding: 12, 
                background: "#e0f2fe", 
                borderRadius: 8, 
                border: "1px solid #0ea5e9",
                display: "flex",
                gap: 10,
                alignItems: "start"
              }}>
                <span style={{ fontSize: 18 }}>ℹ️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#075985", marginBottom: 4 }}>
                    Sick Leave Policy
                  </div>
                  <div style={{ fontSize: 13, color: "#075985", lineHeight: 1.6 }}>
                    • Sick leave can only be applied for <strong>today or tomorrow</strong><br/>
                    • Sick leave exceeding <strong>3 days</strong> must be supported with medical documentation 
                    (such as a medical certificate or doctor's note). Please ensure you submit the necessary 
                    documents to HR for leave approval.
                  </div>
                </div>
              </div>
            )}

            {/* Half-Day Option for Sick Leave and LOP/LWP */}
            {["Sick", "LWP", "LOP"].includes(leave.leave_type) && (
              <div style={{ marginBottom: 16, padding: 14, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={leave.is_half_day}
                    onChange={(e) => handleHalfDayChange(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>This is a half-day leave</span>
                </label>

                {leave.is_half_day && (
                  <div style={{ marginTop: 12 }}>
                    <label className="label">Half-Day Period *</label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="half_day_period"
                          value="morning"
                          checked={leave.half_day_period === "morning"}
                          onChange={(e) => setLeave({ ...leave, half_day_period: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span>Morning (First Half)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="half_day_period"
                          value="afternoon"
                          checked={leave.half_day_period === "afternoon"}
                          onChange={(e) => setLeave({ ...leave, half_day_period: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span>Afternoon (Second Half)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="label">
                Reason <span style={{ color: "#ef4444", fontWeight: 600 }}>*</span>
              </label>
              <textarea
                className="input"
                value={leave.reason}
                onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
                rows={3}
                placeholder="Enter reason for leave (mandatory)"
                required
                style={{
                  border: !leave.reason.trim() && message.includes("Reason") ? "1px solid #ef4444" : undefined
                }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={applyLeave}
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Applying..." : "Apply for Leave"}
            </button>
          </div>

          {/* Leave History Section */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>Leave History</h4>
              <span style={{ fontSize: 14, color: "#6b7280" }}>
                {displayHistory.length} of {history.length} records
              </span>
            </div>

            {/* Search and Filter Controls */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "2fr 1fr 1fr 1fr", 
              gap: 12, 
              marginBottom: 16,
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb"
            }}>
              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4 }}>Search</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by type, status, reason..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  style={{ fontSize: 14 }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4 }}>Status</label>
                <select
                  className="input"
                  value={historyFilterStatus}
                  onChange={(e) => setHistoryFilterStatus(e.target.value)}
                  style={{ fontSize: 14 }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4 }}>Type</label>
                <select
                  className="input"
                  value={historyFilterType}
                  onChange={(e) => setHistoryFilterType(e.target.value)}
                  style={{ fontSize: 14 }}
                >
                  <option value="all">All Types</option>
                  <option value="sick">Sick</option>
                  {!isIntern && (
                    <>
                      <option value="planned">Planned</option>
                      <option value="optional">Optional</option>
                      <option value="lwp">LWP</option>
                      <option value="early logout">Early Logout</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4 }}>Sort By</label>
                <select
                  className="input"
                  value={historySortBy}
                  onChange={(e) => setHistorySortBy(e.target.value)}
                  style={{ fontSize: 14 }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="start_date">Start Date</option>
                  <option value="status">Status</option>
                  <option value="type">Leave Type</option>
                </select>
              </div>
            </div>

            {/* History Table */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                Loading leave history...
              </div>
            ) : displayHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                {history.length === 0 
                  ? "No leave history found"
                  : "No records match your filters"}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: 12, textAlign: "left", fontSize: 13, fontWeight: 600 }}>Leave Type</th>
                      <th style={{ padding: 12, textAlign: "left", fontSize: 13, fontWeight: 600 }}>Period</th>
                      <th style={{ padding: 12, textAlign: "left", fontSize: 13, fontWeight: 600 }}>Days</th>
                      <th style={{ padding: 12, textAlign: "left", fontSize: 13, fontWeight: 600 }}>Status</th>
                      <th style={{ padding: 12, textAlign: "left", fontSize: 13, fontWeight: 600 }}>Applied On</th>
                      <th style={{ padding: 12, textAlign: "left", fontSize: 13, fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayHistory.map((item, idx) => {
                      const statusStyle = getStatusColor(item.status);
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: 12, fontSize: 14 }}>
                            <div style={{ fontWeight: 500 }}>{item.leave_type}</div>
                            {item.is_half_day && (
                              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                Half-day ({item.half_day_period})
                              </div>
                            )}
                            {item.reason && (
                              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                {item.reason}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: 12, fontSize: 13 }}>
                            {formatDate(item.start_date)} - {formatDate(item.end_date)}
                          </td>
                          <td style={{ padding: 12, fontSize: 14, fontWeight: 500 }}>
                            {item.leave_type === "Early Logout"
                              ? `🕐 ${item.logout_time || "N/A"}`
                              : item.days}
                          </td>
                          <td style={{ padding: 12 }}>
                            <span style={{
                              padding: "4px 12px",
                              borderRadius: 16,
                              fontSize: 12,
                              fontWeight: 500,
                              background: statusStyle.bg,
                              color: statusStyle.text,
                              border: `1px solid ${statusStyle.border}`
                            }}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>
                            {formatDate(item.applied_on)}
                          </td>
                          <td style={{ padding: 12 }}>
                            {item.status === "Pending" && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => setEditingLeave(item)}
                                  style={{ fontSize: 12, padding: "4px 12px" }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => cancelLeave(item._id)}
                                  style={{ fontSize: 12, padding: "4px 12px" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* TEAM LEAVES TAB */
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h4 style={{ margin: 0 }}>Pending Leave Requests</h4>
            <span style={{ fontSize: 14, color: "#6b7280" }}>
              {displayTeamLeaves.length} pending request{displayTeamLeaves.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Team Search and Sort */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "2fr 1fr", 
            gap: 12, 
            marginBottom: 16,
            padding: 16,
            background: "#f9fafb",
            borderRadius: 8,
            border: "1px solid #e5e7eb"
          }}>
            <div>
              <label className="label" style={{ fontSize: 12, marginBottom: 4 }}>Search Employee</label>
              <input
                type="text"
                className="input"
                placeholder="Search by name, email, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
            <div>
              <label className="label" style={{ fontSize: 12, marginBottom: 4 }}>Sort By</label>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ fontSize: 14 }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Employee Name</option>
                <option value="department">Department</option>
              </select>
            </div>
          </div>

          {/* Team Leaves List */}
          {displayTeamLeaves.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              {teamPendingLeaves.length === 0 
                ? "No pending leave requests"
                : "No requests match your search"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {displayTeamLeaves.map((teamLeave) => {
                const isExpanded = expandedTeamLeave === teamLeave._id;
                const isBirthday = isBirthdayLeave(teamLeave);

                return (
                  <div
                    key={teamLeave._id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 16,
                      background: isBirthday ? "#fef3c7" : "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <h4 style={{ margin: 0, fontSize: 16 }}>
                            {teamLeave.employee_name || "Unknown"}
                          </h4>
                          {isBirthday && (
                            <span style={{
                              background: "#fbbf24",
                              color: "white",
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              🎂 BIRTHDAY
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                          {teamLeave.employee_email}
                          {teamLeave.employee_designation && ` • ${teamLeave.employee_designation}`}
                          {teamLeave.employee_department && ` • ${teamLeave.employee_department}`}
                        </div>
                        <div style={{ fontSize: 14, marginBottom: 8 }}>
                          <strong>{teamLeave.leave_type}</strong>
                          {teamLeave.is_half_day && (
                            <span style={{ marginLeft: 8, color: "#6b7280" }}>
                              (Half-day - {teamLeave.half_day_period})
                            </span>
                          )}
                          {" • "}
                          {formatDate(teamLeave.start_date)} to {formatDate(teamLeave.end_date)}
                          {" • "}
                          {teamLeave.leave_type === "Early Logout" ? (
                            <strong>🕐 Logout at {teamLeave.logout_time || "N/A"}</strong>
                          ) : (
                            <strong>{teamLeave.days} day{teamLeave.days !== 1 ? "s" : ""}</strong>
                          )}
                        </div>
                        {teamLeave.reason && (
                          <div style={{ 
                            fontSize: 13, 
                            color: "#374151",
                            background: "#f3f4f6",
                            padding: 8,
                            borderRadius: 4,
                            marginBottom: 8
                          }}>
                            <strong>Reason:</strong> {teamLeave.reason}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => updateTeamLeaveStatus(teamLeave._id, "Approved")}
                          style={{ fontSize: 13, padding: "6px 16px" }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleTeamReject(teamLeave._id)}
                          style={{ fontSize: 13, padding: "6px 16px" }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ✅ LOOPHOLE FIX: Edit Leave Modal
          - Leave type dropdown restricted for interns
          - Date inputs use getMinDate/getMaxDate with the *edited* type
          - Logout time field shown when editing Early Logout
          - validateEditLeave() called before submitting
          ============================================================ */}
      {editingLeave && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: 24,
            borderRadius: 12,
            maxWidth: 500,
            width: "90%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h4 style={{ marginTop: 0 }}>Edit Leave Request</h4>

            {/* Inline message for edit modal */}
            {message && (
              <div style={{
                padding: 10,
                marginBottom: 14,
                borderRadius: 8,
                background: message.includes("Error") || message.includes("⚠️") ? "#fee2e2" : "#d1f4dd",
                color: message.includes("Error") || message.includes("⚠️") ? "#dc2626" : "#0a5d2c",
                border: `1px solid ${message.includes("Error") || message.includes("⚠️") ? "#fecaca" : "#7de3a6"}`,
                fontSize: 13,
                fontWeight: 500
              }}>
                {message}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="label">Leave Type</label>
              <div
                className="input"
                style={{
                  background: "#f3f4f6",
                  color: "#6b7280",
                  cursor: "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                🔒 {editingLeave.leave_type}
                <span style={{ fontSize: 11, marginLeft: "auto", color: "#9ca3af" }}>
                  Cannot be changed
                </span>
              </div>
            </div>

            {/* ✅ Policy reminder in edit modal for Planned */}
            {editingLeave.leave_type === "Planned" && (
              <div style={{
                marginBottom: 14,
                padding: 10,
                background: "#fef3c7",
                borderRadius: 8,
                border: "1px solid #fbbf24",
                fontSize: 13,
                color: "#92400e"
              }}>
                ⚠️ Planned leave must be at least <strong>7 days in advance</strong>.
              </div>
            )}

            {/* ✅ Policy reminder for Sick in edit modal */}
            {editingLeave.leave_type === "Sick" && (
              <div style={{
                marginBottom: 14,
                padding: 10,
                background: "#e0f2fe",
                borderRadius: 8,
                border: "1px solid #0ea5e9",
                fontSize: 13,
                color: "#075985"
              }}>
                ℹ️ Sick leave can only be for <strong>today or tomorrow</strong>.
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="label">Start Date</label>
              <input
                className="input"
                type="date"
                value={editingLeave.start_date}
                min={getMinDate(editingLeave.leave_type)}
                max={getMaxDate(editingLeave.leave_type)}
                onChange={(e) =>
                  setEditingLeave({
                    ...editingLeave,
                    start_date: e.target.value,
                    end_date: editingLeave.is_half_day ? e.target.value : editingLeave.end_date,
                  })
                }
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">End Date</label>
              <input
                className="input"
                type="date"
                value={editingLeave.end_date}
                min={editingLeave.start_date || getMinDate(editingLeave.leave_type)}
                max={getMaxDate(editingLeave.leave_type)}
                disabled={editingLeave.is_half_day}
                onChange={(e) =>
                  setEditingLeave({ ...editingLeave, end_date: e.target.value })
                }
              />
            </div>

            {/* ✅ Logout time shown when editing Early Logout */}
            {editingLeave.leave_type === "Early Logout" && (
              <div style={{ marginBottom: 16 }}>
                <label className="label">Logout Time *</label>
                <input
                  className="input"
                  type="time"
                  value={editingLeave.logout_time || ""}
                  onChange={(e) =>
                    setEditingLeave({ ...editingLeave, logout_time: e.target.value })
                  }
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="label">Reason</label>
              <textarea
                className="input"
                value={editingLeave.reason || ""}
                onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                rows={3}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={updateLeave}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Updating..." : "Update Leave"}
              </button>
              <button
                className="btn"
                onClick={() => { setEditingLeave(null); setMessage(""); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.show && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: 24,
            borderRadius: 12,
            maxWidth: 500,
            width: "90%"
          }}>
            <h4 style={{ marginTop: 0, color: "#dc2626" }}>Reject Leave Request</h4>
            
            <div style={{ marginBottom: 16 }}>
              <label className="label">Rejection Reason *</label>
              <textarea
                className="input"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                rows={4}
                placeholder="Please provide a reason for rejection..."
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-danger"
                onClick={confirmTeamReject}
                disabled={!rejectModal.reason.trim()}
                style={{ flex: 1 }}
              >
                Confirm Rejection
              </button>
              <button
                className="btn"
                onClick={() => setRejectModal({ show: false, leaveId: null, reason: "" })}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaves;
