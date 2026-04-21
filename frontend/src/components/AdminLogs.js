// src/components/AdminLogs.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState({}); // track which leave is expanded

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/logs/all`)
      .then((res) => setLogs(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Group logs by leave_id
  const grouped = logs.reduce((acc, log) => {
    const id = log.leave_id;
    if (!acc[id]) acc[id] = [];
    acc[id].push(log);
    return acc;
  }, {});

  const toggleExpand = (leaveId) => {
    setExpanded((prev) => ({ ...prev, [leaveId]: !prev[leaveId] }));
  };

  const formatDateTime = (ts) => {
    if (!ts) return "N/A";
    try {
      return new Date(ts).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  // 👇 UPDATED: Format values properly
  const formatValue = (key, value) => {
    // Skip null/undefined values
    if (value === null || value === undefined || value === "") {
      return null; // Will be filtered out
    }

    // Handle date fields - UPDATED to handle string dates too
    if (key.includes('date') || key.includes('_on')) {
      // If it's already a formatted date object
      if (typeof value === 'object' && value.$date) {
        return formatDateTime(value.$date);
      }
      
      // If it's a string date (like "2025-11-14T12:42:49.624000")
      if (typeof value === 'string' && (value.includes('T') || value.includes('-'))) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return formatDateTime(date);
          }
        } catch (e) {
          console.error('Date parse error:', e);
        }
      }
      
      // If it's already a Date object
      if (value instanceof Date) {
        return formatDateTime(value);
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    // Handle objects (but not dates we already processed)
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    // Return as string
    return String(value);
  };

  const formatKey = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="panel">
      <h2>📜 Change Logs</h2>
      <p className="muted">All activity on employees' leave requests</p>

      {Object.keys(grouped).length === 0 && (
        <div style={{ marginTop: 40, textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 48 }}>📘</div>
          <div>No logs yet</div>
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        {Object.entries(grouped).map(([leaveId, items]) => {
          const first = items[0]; // newest log
  
          return (
            <div
              key={leaveId}
              className="card"
              style={{
                padding: 20,
                borderLeft: "6px solid #3b82f6",
                background: "#f9fafb",
              }}
            >
              {/* Summary row */}
              <div
                onClick={() => toggleExpand(leaveId)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: 16 }}>
                    {first.employee_name} ({first.employeeId})
                  </strong>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {first.employee_designation} • {first.employee_department}
                  </div>
                </div>

                <button
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "6px 12px",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  {expanded[leaveId] ? "Hide" : "View Logs"}
                </button>
              </div>

              {/* Expanded logs */}
              {expanded[leaveId] && (
                <div style={{ marginTop: 16, paddingLeft: 12 }}>
                  {items.map((log) => (
                    <div
                      key={log._id}
                      style={{
                        background: "white",
                        padding: 16,
                        borderRadius: 8,
                        marginBottom: 12,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: 15, color: "#111827" }}>
                          {log.action}
                        </strong>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>

                      <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                        Performed by: <strong>{log.performed_by}</strong>
                      </div>

                      {log.remarks && (
                        <div style={{ 
                          marginTop: 8, 
                          fontStyle: "italic",
                          padding: "8px 12px",
                          background: "#fffbeb",
                          borderRadius: 6,
                          fontSize: 13,
                          color: "#92400e",
                          border: "1px solid #fcd34d"
                        }}>
                          💬 {log.remarks}
                        </div>
                      )}

                      {/* 👇 UPDATED Changes Section */}
                      {(log.old_data || log.new_data) && (
                        <div
                          style={{
                            marginTop: 12,
                            display: "grid",
                            gridTemplateColumns: log.old_data && log.new_data ? "1fr 1fr" : "1fr",
                            gap: 16,
                          }}
                        >
                          {/* BEFORE section */}
                          {log.old_data && (
                            <div style={{
                              background: "#fef2f2",
                              padding: 14,
                              borderRadius: 8,
                              border: "1px solid #fca5a5"
                            }}>
                              <strong style={{ color: "#dc2626", display: "block", marginBottom: 8, fontSize: 13 }}>
                                ❌ Before:
                              </strong>

                              {Object.entries(log.old_data)
                                .map(([key, val]) => {
                                  const formatted = formatValue(key, val);
                                  if (formatted === null) return null; // Skip null values
                                  
                                  return (
                                    <div
                                      key={key}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "6px 8px",
                                        borderBottom: "1px solid #fecaca",
                                        fontSize: 12,
                                      }}
                                    >
                                      <span style={{ fontWeight: 500, color: "#991b1b" }}>
                                        {formatKey(key)}:
                                      </span>
                                      <span style={{ fontWeight: 600, color: "#dc2626", wordBreak: "break-word", maxWidth: "60%" }}>
                                        {formatted}
                                      </span>
                                    </div>
                                  );
                                })
                                .filter(Boolean) // Remove null entries
                              }
                            </div>
                          )}

                          {/* AFTER section */}
                          {log.new_data && (
                            <div style={{
                              background: "#f0fdf4",
                              padding: 14,
                              borderRadius: 8,
                              border: "1px solid #86efac"
                            }}>
                              <strong style={{ color: "#16a34a", display: "block", marginBottom: 8, fontSize: 13 }}>
                                ✅ After:
                              </strong>

                              {Object.entries(log.new_data)
                                .map(([key, val]) => {
                                  const formatted = formatValue(key, val);
                                  if (formatted === null) return null; // Skip null values
                                  
                                  return (
                                    <div
                                      key={key}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "6px 8px",
                                        borderBottom: "1px solid #bbf7d0",
                                        fontSize: 12,
                                      }}
                                    >
                                      <span style={{ fontWeight: 500, color: "#166534" }}>
                                        {formatKey(key)}:
                                      </span>
                                      <span style={{ fontWeight: 600, color: "#16a34a", wordBreak: "break-word", maxWidth: "60%" }}>
                                        {formatted}
                                      </span>
                                    </div>
                                  );
                                })
                                .filter(Boolean) // Remove null entries
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}