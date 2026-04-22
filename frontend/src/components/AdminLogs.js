import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronDown, ChevronUp, ClipboardList, History, ShieldCheck, UserRound } from "lucide-react";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/logs/all`);
        setLogs(Array.isArray(response.data) ? response.data : []);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const grouped = useMemo(() => {
    return logs.reduce((accumulator, log) => {
      const leaveId = log.leave_id || "unknown";
      if (!accumulator[leaveId]) {
        accumulator[leaveId] = [];
      }
      accumulator[leaveId].push(log);
      return accumulator;
    }, {});
  }, [logs]);

  const groupedEntries = Object.entries(grouped);

  const toggleExpand = (leaveId) => {
    setExpanded((previous) => ({ ...previous, [leaveId]: !previous[leaveId] }));
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatValue = (key, value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (key.includes("date") || key.includes("_on")) {
      if (typeof value === "object" && value.$date) {
        return formatDateTime(value.$date);
      }

      if (typeof value === "string" || value instanceof Date) {
        const candidate = new Date(value);
        if (!Number.isNaN(candidate.getTime())) {
          return formatDateTime(candidate);
        }
      }
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const formatKey = (key) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());

  return (
    <section className="audit-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Audit Trail</div>
          <h1>Audit Logs</h1>
          <p>
            Review every leave workflow change, see who performed it, and inspect before-and-after
            state without leaving the admin workspace.
          </p>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-hero-meta-item">
            <span>Total events</span>
            <strong>{logs.length}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Tracked requests</span>
            <strong>{groupedEntries.length}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Coverage</span>
            <strong>Leave actions</strong>
          </div>
        </div>
      </header>

      <section className="audit-summary-grid">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Log Events</span>
            <History size={18} />
          </div>
          <div className="fiori-stat-value">{logs.length}</div>
          <div className="fiori-stat-note">Detailed change events recorded in the log stream</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Requests Covered</span>
            <ClipboardList size={18} />
          </div>
          <div className="fiori-stat-value">{groupedEntries.length}</div>
          <div className="fiori-stat-note">Unique leave requests with recorded audit activity</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Traceability</span>
            <ShieldCheck size={18} />
          </div>
          <div className="fiori-stat-value audit-stat-text">End-to-end</div>
          <div className="fiori-stat-note">Each entry includes actor, timestamp, and data deltas</div>
        </article>
      </section>

      {loading ? (
        <div className="fiori-loading-card">
          <History size={28} />
          <div>
            <strong>Loading audit logs</strong>
            <p>Collecting recorded leave events and change history.</p>
          </div>
        </div>
      ) : error ? (
        <div className="admin-empty-state">
          <ClipboardList size={28} />
          <div>
            <strong>{error}</strong>
            <p>Try refreshing the page after the audit service is available again.</p>
          </div>
        </div>
      ) : groupedEntries.length === 0 ? (
        <div className="admin-empty-state">
          <ClipboardList size={28} />
          <div>
            <strong>No audit logs yet</strong>
            <p>Leave workflow changes will appear here once activity is recorded.</p>
          </div>
        </div>
      ) : (
        <div className="audit-log-list">
          {groupedEntries.map(([leaveId, items]) => {
            const first = items[0];

            return (
              <section key={leaveId} className="fiori-panel">
                <div className="audit-log-header">
                  <div className="audit-log-identity">
                    <div className="audit-log-avatar">
                      <UserRound size={16} />
                    </div>
                    <div>
                      <h3>{first.employee_name || "Unknown employee"}</h3>
                      <p>
                        {first.employeeId || "No ID"} • {first.employee_designation || "No designation"} •{" "}
                        {first.employee_department || "No department"}
                      </p>
                    </div>
                  </div>

                  <button className="fiori-button secondary" onClick={() => toggleExpand(leaveId)}>
                    {expanded[leaveId] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span>{expanded[leaveId] ? "Hide logs" : "View logs"}</span>
                  </button>
                </div>

                <div className="audit-log-meta">
                  <span>Leave Request: {leaveId}</span>
                  <span>{items.length} event{items.length !== 1 ? "s" : ""}</span>
                  <span>Latest: {formatDateTime(first.timestamp)}</span>
                </div>

                {expanded[leaveId] && (
                  <div className="audit-log-events">
                    {items.map((log) => (
                      <article key={log._id} className="audit-log-event">
                        <div className="audit-log-event-top">
                          <div>
                            <strong>{log.action}</strong>
                            <p>Performed by {log.performed_by || "Unknown actor"}</p>
                          </div>
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>

                        {log.remarks && <div className="audit-log-remarks">{log.remarks}</div>}

                        {(log.old_data || log.new_data) && (
                          <div
                            className={`audit-log-diff-grid ${
                              log.old_data && log.new_data ? "" : "is-single"
                            }`}
                          >
                            {log.old_data && (
                              <div className="audit-log-diff-card is-before">
                                <strong>Before</strong>
                                {Object.entries(log.old_data)
                                  .map(([key, value]) => {
                                    const formatted = formatValue(key, value);
                                    if (formatted === null) return null;

                                    return (
                                      <div key={key} className="audit-log-diff-row">
                                        <span>{formatKey(key)}</span>
                                        <b>{formatted}</b>
                                      </div>
                                    );
                                  })
                                  .filter(Boolean)}
                              </div>
                            )}

                            {log.new_data && (
                              <div className="audit-log-diff-card is-after">
                                <strong>After</strong>
                                {Object.entries(log.new_data)
                                  .map(([key, value]) => {
                                    const formatted = formatValue(key, value);
                                    if (formatted === null) return null;

                                    return (
                                      <div key={key} className="audit-log-diff-row">
                                        <span>{formatKey(key)}</span>
                                        <b>{formatted}</b>
                                      </div>
                                    );
                                  })
                                  .filter(Boolean)}
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
