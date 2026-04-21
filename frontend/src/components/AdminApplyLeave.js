// src/components/AdminApplyLeave.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminApplyLeave = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeBalance, setEmployeeBalance] = useState(null);
  const [leave, setLeave] = useState({
    leave_type: "Sick",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/get_all_employees`)
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setMessage("Failed to load employees");
    }
  };

  const fetchEmployeeBalance = async (employeeId) => {
    if (!employeeId) {
      setEmployeeBalance(null);
      return;
    }

    try {
      const res = await axios.get(
        `process.env.REACT_APP_BACKEND_URL/api/leaves/balance/${employeeId}`
      );
      setEmployeeBalance(res.data);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setEmployeeBalance(null);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    fetchEmployeeBalance(employeeId);
    setMessage("");
  };

  const applyLeave = async () => {
    if (!selectedEmployee) {
      setMessage("Please select an employee");
      return;
    }

    if (!leave.start_date || !leave.end_date) {
      setMessage("Please select start and end dates");
      return;
    }

    if (leave.leave_type === "Planned") {
      const today = new Date();
      const startDate = new Date(leave.start_date);
      const daysDifference = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < 7) {
        setMessage("⚠️ Planned leave should be applied at least 7 days in advance");
        setTimeout(() => setMessage(""), 5000);
        // Continue anyway since admin can override
      }
    }

    try {
      setLoading(true);
      const res = await axios.post("process.env.REACT_APP_BACKEND_URL/api/leaves/apply", {
        employee_id: selectedEmployee,
        leave_type: leave.leave_type,
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason || `Applied by ${user.name} (${user.role})`,
      });

      if (res.status === 201) {
        setMessage("✓ Leave applied successfully for the employee");
        setLeave({ leave_type: "Sick", start_date: "", end_date: "", reason: "" });
        fetchEmployeeBalance(selectedEmployee);
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

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEmpData = employees.find((e) => e._id === selectedEmployee);

  return (
    <div className="panel">
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Apply Leave on Behalf</h3>
        <p className="muted">
          As an {user.role}, you can apply for leave on behalf of any employee
        </p>
      </div>

      {/* Employee Selection */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: 16, color: "white" }}>
          Select Employee
        </h4>

        {/* Search */}
        <input
          className="input"
          placeholder="🔍 Search by name, email, or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            marginBottom: 16,
            background: "rgba(255, 255, 255, 0.9)",
            border: "none",
          }}
        />

        {/* Employee List */}
        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 8,
            padding: 8,
          }}
        >
          {filteredEmployees.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              No employees found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredEmployees.map((emp) => (
                <div
                  key={emp._id}
                  onClick={() => handleEmployeeSelect(emp._id)}
                  style={{
                    padding: 12,
                    background:
                      selectedEmployee === emp._id
                        ? "rgba(255, 255, 255, 0.3)"
                        : "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    cursor: "pointer",
                    border:
                      selectedEmployee === emp._id
                        ? "2px solid white"
                        : "2px solid transparent",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEmployee !== emp._id) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEmployee !== emp._id) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {emp.name?.charAt(0) || "E"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {emp.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.9,
                          marginTop: 2,
                        }}
                      >
                        {emp.designation} • {emp.department}
                      </div>
                    </div>
                    {selectedEmployee === emp._id && (
                      <div style={{ fontSize: 20 }}>✓</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Employee Info & Leave Balance */}
      {selectedEmpData && employeeBalance && (
        <div
          className="card"
          style={{
            padding: 24,
            marginBottom: 24,
            border: "2px solid #667eea",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
            <div>
              <h4 style={{ margin: 0, marginBottom: 8 }}>
                Applying leave for: {selectedEmpData.name}
              </h4>
              <div className="muted" style={{ fontSize: 13 }}>
                {selectedEmpData.email} • {selectedEmpData.designation}
              </div>
            </div>
            <div
              style={{
                padding: "6px 12px",
                background: "#e6f0ff",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#1f6feb",
              }}
            >
              {selectedEmpData.role}
            </div>
          </div>

          {/* Leave Balance */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                🤒 Sick Leave
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#ef4444",
                  marginBottom: 2,
                }}
              >
                {employeeBalance.sick}
              </div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>
                Total: {employeeBalance.sickTotal || 6} • Used:{" "}
                {(employeeBalance.sickTotal || 6) - employeeBalance.sick}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                📅 Planned Leave
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#3b82f6",
                  marginBottom: 2,
                }}
              >
                {employeeBalance.planned}
              </div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>
                Total: {employeeBalance.plannedTotal || 12} • Used:{" "}
                {(employeeBalance.plannedTotal || 12) - employeeBalance.planned}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Form */}
      {selectedEmployee && (
        <div
          className="card"
          style={{
            padding: 24,
            marginBottom: 24,
            border: "1px solid #e5e7eb",
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 16 }}>Leave Details</h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Leave Type *
              </label>
              <select
                className="input"
                value={leave.leave_type}
                onChange={(e) =>
                  setLeave({ ...leave, leave_type: e.target.value })
                }
              >
                <option>Sick</option>
                <option>Planned</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Start Date *
              </label>
              <input
                className="input"
                type="date"
                value={leave.start_date}
                onChange={(e) =>
                  setLeave({ ...leave, start_date: e.target.value })
                }
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                End Date *
              </label>
              <input
                className="input"
                type="date"
                value={leave.end_date}
                onChange={(e) =>
                  setLeave({ ...leave, end_date: e.target.value })
                }
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Reason (Optional)
              </label>
              <input
                className="input"
                placeholder="Leave reason..."
                value={leave.reason}
                onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
              />
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: "#fffbeb",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
              color: "#92400e",
              border: "1px solid #fcd34d",
            }}
          >
            <strong>ℹ️ Note:</strong> Leave will be automatically approved when
            applied by {user.role}. The employee will be notified.
          </div>

          <button
            className="btn"
            onClick={applyLeave}
            disabled={loading || !leave.start_date || !leave.end_date}
            style={{ width: "100%" }}
          >
            {loading ? "Applying..." : "📝 Apply Leave for Employee"}
          </button>
        </div>
      )}

      {!selectedEmployee && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#9ca3af",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>👆</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            Select an employee to apply leave
          </div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Search and click on an employee from the list above
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background:
              message.includes("Error") || message.includes("⚠️")
                ? "#fef2f2"
                : "#d1f4dd",
            color:
              message.includes("Error") || message.includes("⚠️")
                ? "#ef4444"
                : "#0a5d2c",
            padding: "16px 24px",
            borderRadius: 12,
            border: `2px solid ${
              message.includes("Error") || message.includes("⚠️")
                ? "#ffb3b3"
                : "#7de3a6"
            }`,
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
  );
};

export default AdminApplyLeave;