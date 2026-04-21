// src/components/LeaveDashboard.js
import React, { useState } from "react";
import axios from "axios";

const LeaveDashboard = () => {
  const [employeeLookup, setEmployeeLookup] = useState(""); // what user types to lookup (can be id)
  const [employeeRecord, setEmployeeRecord] = useState(null); // full employee object from backend
  const [managerEmail, setManagerEmail] = useState("");
  const [balance, setBalance] = useState(null);

  const [leaveData, setLeaveData] = useState({
    leave_type: "Casual",
    start_date: "",
    end_date: "",
    reason: ""
  });

  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch employee record, manager email and leave balance
  const fetchEmployeeAndBalance = async () => {
    setMessage("");
    setEmployeeRecord(null);
    setManagerEmail("");
    setBalance(null);

    if (!employeeLookup) {
      setMessage("Please enter Employee ID to lookup.");
      return;
    }

    try {
      // 1) Fetch employee record by id (returns employee object)
      const empRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${employeeLookup}`);
      const emp = empRes.data;
      setEmployeeRecord(emp);

      // 2) Fetch manager info (endpoint returns manager object when present)
      try {
        const mgrRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/get_manager/${employeeLookup}`);
        // user_routes in your project returns manager object directly (or an error)
        // guard if response shape differs
        const mgr = mgrRes.data.manager ? mgrRes.data.manager : mgrRes.data;
        setManagerEmail(mgr?.email || "");
      } catch (mgrErr) {
        // manager might not exist / no manager assigned
        setManagerEmail("");
      }

      // 3) Fetch leave balance
      try {
        const balRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/balance/${employeeLookup}`);
        setBalance(balRes.data);
      } catch (balErr) {
        setBalance(null);
      }

      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Employee not found or invalid ID");
    }
  };

  // Copy helper
  const copyToClipboard = async (text, label = "value") => {
    try {
      await navigator.clipboard.writeText(text || "");
      setMessage(`${label} copied to clipboard`);
      setTimeout(() => setMessage(""), 2000);
    } catch (e) {
      setMessage("Failed to copy");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  // Apply for leave
  const applyLeave = async () => {
    if (!employeeRecord || !employeeRecord._id) {
      setMessage("Please fetch employee details first.");
      return;
    }
    if (!leaveData.start_date || !leaveData.end_date) {
      setMessage("Please fill start and end dates.");
      return;
    }

    try {
      const payload = {
        employee_id: employeeRecord._id, // ensure we're using the DB _id
        leave_type: leaveData.leave_type,
        start_date: leaveData.start_date,
        end_date: leaveData.end_date,
        reason: leaveData.reason
      };
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/apply`, payload);
      setMessage("Leave applied successfully");
      // optionally refresh balance / history
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Error applying leave");
    }
  };

  // Manager: get pending requests
  const fetchPending = async () => {
    if (!managerEmail) {
      setMessage("Please fetch manager email or enter it to view pending requests.");
      return;
    }
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/pending/${encodeURIComponent(managerEmail)}`);
      setPending(res.data || []);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to fetch pending leaves");
    }
  };

  // Manager approve/reject
  const updateStatus = async (leaveId, status) => {
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/update_status/${leaveId}`, { status });
      setMessage(`Leave ${status.toLowerCase()} successfully`);
      fetchPending();
      // optionally refresh employee balance if needed
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to update status");
    }
  };

  return (
    <div className="leave-container" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div className="leave-header">
        <div>
          <h2>Leave Management</h2>
          <div className="muted">Lookup employee by their DB _id to view balance and manager</div>
        </div>

        <div className="leave-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Enter Employee _id (DB ObjectId)"
            value={employeeLookup}
            onChange={(e) => setEmployeeLookup(e.target.value)}
            style={{ width: 320 }}
          />
          <button className="btn" onClick={fetchEmployeeAndBalance}>Fetch</button>
        </div>
      </div>

      {/* Employee + Manager info */}
      <div className="leave-summary" style={{ alignItems: "start" }}>
        <div className="leave-card" style={{ padding: 18 }}>
          <div className="title">Employee</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="card-value" style={{ fontSize: 16 }}>{employeeRecord?.name || "—"}</div>
                <div className="muted" style={{ fontSize: 13 }}>{employeeRecord?.email || "—"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="muted" style={{ fontSize: 12 }}>Employee _id</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 13 }}>{employeeRecord?._id || "—"}</div>
                  <button className="btn ghost" onClick={() => copyToClipboard(employeeRecord?._id, "Employee ID")}>Copy</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="leave-card" style={{ padding: 18 }}>
          <div className="title">Reporting Manager</div>
          <div style={{ marginTop: 8 }}>
            <div className="card-value" style={{ fontSize: 16 }}>{managerEmail || "—"}</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn ghost" onClick={() => copyToClipboard(managerEmail, "Manager Email")}>Copy Manager Email</button>
            </div>
          </div>
        </div>

        <div className="leave-card" style={{ padding: 18 }}>
          <div className="title">Leave Balance</div>
          <div style={{ marginTop: 8 }}>
            {balance ? (
              <>
                <div className="kv"><div>Casual</div><div>{balance.casual}</div></div>
                <div className="kv"><div>Sick</div><div>{balance.sick}</div></div>
                <div className="kv"><div>Earned</div><div>{balance.earned}</div></div>
                <div className="kv"><div>LWP</div><div>{balance.lwp}</div></div>
              </>
            ) : <div className="muted">No balance loaded</div>}
          </div>
        </div>
      </div>

      {/* Apply leave form */}
      <div className="leave-form">
        <h3>Apply for Leave (employee)</h3>
        <div className="leave-form-grid">
          <select
            className="input"
            value={leaveData.leave_type}
            onChange={(e) => setLeaveData({ ...leaveData, leave_type: e.target.value })}
          >
            <option>Casual</option>
            <option>Sick</option>
            <option>Earned</option>
            <option>LWP</option>
          </select>

          <input
            className="input"
            type="date"
            value={leaveData.start_date}
            onChange={(e) => setLeaveData({ ...leaveData, start_date: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={leaveData.end_date}
            onChange={(e) => setLeaveData({ ...leaveData, end_date: e.target.value })}
          />
          <input
            className="input"
            placeholder="Reason"
            value={leaveData.reason}
            onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={applyLeave}>Apply Leave</button>
        </div>
      </div>

      {/* Manager pending */}
      <div className="leave-history">
        <h3>Manager Pending Requests</h3>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input className="input" placeholder="Manager email (or use loaded manager)" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
          <button className="btn ghost" onClick={fetchPending}>Fetch Pending</button>
        </div>

        {pending.length === 0 ? (
          <div className="muted">No pending requests</div>
        ) : (
          <table className="leave-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Type</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontFamily: "monospace" }}>{p.employee_id}</td>
                  <td>{p.leave_type}</td>
                  <td className="muted">{p.applied_on ? new Date(p.applied_on).toLocaleString() : "-"}</td>
                  <td>
                    <span className={`status ${p.status?.toLowerCase() === "approved" ? "approved" : p.status?.toLowerCase() === "rejected" ? "rejected" : "pending"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => updateStatus(p._id, "Approved")}>Approve</button>
                      <button className="btn ghost" style={{ background: "#fff0f0", color: "var(--danger)" }} onClick={() => updateStatus(p._id, "Rejected")}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {message && <div style={{ marginTop: 8 }} className="muted">{message}</div>}
    </div>
  );
};

export default LeaveDashboard;