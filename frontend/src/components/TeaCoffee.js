// src/components/TeaCoffee.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "../App.css";

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/tea_coffee`;

const MORNING_CUTOFF = "10:30";
const EVENING_CUTOFF = "14:30";

// ===========================================
// YEARLY CALENDAR FOR BLOCKING DATES
// ===========================================
const YearlyCalendarModal = ({ onClose, blockedDates, onBlockDate, onUnblockDate }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDateToBlock, setSelectedDateToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const isDateBlocked = (date) => {
    return blockedDates.some(bd => bd.date === date);
  };

  const getBlockReason = (date) => {
    const blocked = blockedDates.find(bd => bd.date === date);
    return blocked ? blocked.reason : "";
  };

  const handleDateClick = (dateStr) => {
    if (isDateBlocked(dateStr)) {
      if (window.confirm(`Unblock ${dateStr}?\nReason: ${getBlockReason(dateStr)}`)) {
        onUnblockDate(dateStr);
      }
    } else {
      setSelectedDateToBlock(dateStr);
      setShowBlockDialog(true);
    }
  };

  const handleBlockSubmit = () => {
    if (!selectedDateToBlock) return;
    onBlockDate(selectedDateToBlock, blockReason || "Unavailable");
    setShowBlockDialog(false);
    setSelectedDateToBlock(null);
    setBlockReason("");
  };

  const renderMonth = (monthIndex) => {
    const firstDay = new Date(selectedYear, monthIndex, 1);
    const lastDay = new Date(selectedYear, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: 8 }} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const blocked = isDateBlocked(dateStr);
      const dayOfWeek = new Date(selectedYear, monthIndex, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      days.push(
        <div
          key={day}
          onClick={() => !isWeekend && handleDateClick(dateStr)}
          style={{
            padding: 8,
            textAlign: "center",
            cursor: isWeekend ? "not-allowed" : "pointer",
            background: blocked ? "#fee2e2" : isWeekend ? "#f3f4f6" : "white",
            border: blocked ? "2px solid #ef4444" : "1px solid #e5e7eb",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: blocked ? 600 : 400,
            color: isWeekend ? "#9ca3af" : blocked ? "#dc2626" : "#374151",
            opacity: isWeekend ? 0.5 : 1,
            transition: "all 0.2s",
          }}
          title={blocked ? `Blocked: ${getBlockReason(dateStr)}` : isWeekend ? "Weekend" : "Click to block"}
        >
          {day}
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 10, fontSize: 14, fontWeight: 600, color: "#374151" }}>
          {months[monthIndex]}
        </h4>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          fontSize: 12
        }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} style={{ padding: 4, textAlign: "center", fontWeight: 600, color: "#6b7280" }}>
              {d}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

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
        borderRadius: 12,
        maxWidth: 1200,
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
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
            <h2 style={{ margin: 0, fontSize: 24 }}>🗓️ Block Tea/Coffee Dates</h2>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 14 }}>
              Click on any date to block/unblock. Weekends are automatically disabled.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              style={{
                padding: "8px 16px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              ← {selectedYear - 1}
            </button>
            <span style={{ fontSize: 20, fontWeight: 700, minWidth: 80, textAlign: "center" }}>
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              style={{
                padding: "8px 16px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {selectedYear + 1} →
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                marginLeft: 20
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 24
        }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(monthIndex => renderMonth(monthIndex))}
        </div>

        <div style={{
          padding: 24,
          borderTop: "2px solid #e5e7eb",
          display: "flex",
          gap: 20,
          justifyContent: "center",
          background: "#f9fafb"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: 4 }} />
            <span style={{ fontSize: 13 }}>Available</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, background: "#fee2e2", border: "2px solid #ef4444", borderRadius: 4 }} />
            <span style={{ fontSize: 13 }}>Blocked</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4 }} />
            <span style={{ fontSize: 13 }}>Weekend</span>
          </div>
        </div>
      </div>

      {showBlockDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001
        }}>
          <div style={{
            background: "white",
            padding: 30,
            borderRadius: 12,
            maxWidth: 400,
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ marginBottom: 16 }}>🚫 Block Date</h3>
            <p style={{ marginBottom: 16, color: "#6b7280" }}>
              <strong>{selectedDateToBlock}</strong>
            </p>
            
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              Reason (optional):
            </label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g., Holiday, Maintenance"
              style={{
                width: "100%",
                padding: 10,
                border: "2px solid #e5e7eb",
                borderRadius: 6,
                marginBottom: 20,
                fontSize: 14
              }}
              autoFocus
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleBlockSubmit}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Block Date
              </button>
              <button
                onClick={() => {
                  setShowBlockDialog(false);
                  setSelectedDateToBlock(null);
                  setBlockReason("");
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer"
                }}
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

// ===========================================
// EMPLOYEE LIST MODAL FOR ADMIN
// ===========================================
const EmployeeListModal = ({ date, orders, onClose }) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getBeverageIcon = (beverage) => {
    switch(beverage) {
      case "tea": return "🍵";
      case "coffee": return "☕";
      case "milk": return "🥛";
      default: return "❌";
    }
  };

  const getBeverageColor = (beverage) => {
    switch(beverage) {
      case "tea": return "#10b981";
      case "coffee": return "#f59e0b";
      case "milk": return "#3b82f6";
      default: return "#9ca3af";
    }
  };

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
        borderRadius: 12,
        maxWidth: 800,
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
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
            <h2 style={{ margin: 0, fontSize: 24 }}>👥 Employee Orders</h2>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 14 }}>
              {formatDate(date)} • {orders.length} orders
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {orders.length === 0 ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
              No orders for this date
            </p>
          ) : (
            <>
              {/* Summary Statistics */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 24,
                padding: 20,
                background: "#f9fafb",
                borderRadius: 12,
                border: "1px solid #e5e7eb"
              }}>
                {[
                  { label: "🍵 Tea", count: orders.filter(o => o.morning === "tea" || o.evening === "tea").length, color: "#10b981" },
                  { label: "☕ Coffee", count: orders.filter(o => o.morning === "coffee" || o.evening === "coffee").length, color: "#f59e0b" },
                  { label: "🥛 Milk", count: orders.filter(o => o.morning === "milk" || o.evening === "milk").length, color: "#3b82f6" }
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.count}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Employee List Table */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>☀️ Morning</th>
                  <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>🌙 Evening</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>{order.employee_name}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>{order.employee_email}</div>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {order.morning ? (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          background: `${getBeverageColor(order.morning)}20`,
                          color: getBeverageColor(order.morning),
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 13
                        }}>
                          {getBeverageIcon(order.morning)} {order.morning}
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {order.evening ? (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          background: `${getBeverageColor(order.evening)}20`,
                          color: getBeverageColor(order.evening),
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 13
                        }}>
                          {getBeverageIcon(order.evening)} {order.evening}
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ===========================================
// ADMIN VIEW WITH EMPLOYEE LIST
// ===========================================
const AdminView = ({ dates, orders, formatDate, blockedDates, onBlockDate, onUnblockDate }) => {
  const [showYearlyCalendar, setShowYearlyCalendar] = useState(false);
  const [selectedDateForList, setSelectedDateForList] = useState(null);

  const getStats = (date) => {
    const dayOrders = orders[date] || [];

    let morningTea = 0;
    let morningCoffee = 0;
    let morningMilk = 0;
    let eveningTea = 0;
    let eveningCoffee = 0;
    let eveningMilk = 0;

    dayOrders.forEach((o) => {
      if (o.morning === "tea") morningTea++;
      if (o.morning === "coffee") morningCoffee++;
      if (o.morning === "milk") morningMilk++;
      if (o.evening === "tea") eveningTea++;
      if (o.evening === "coffee") eveningCoffee++;
      if (o.evening === "milk") eveningMilk++;
    });

    return {
      morningTea,
      morningCoffee,
      morningMilk,
      eveningTea,
      eveningCoffee,
      eveningMilk,
      total: dayOrders.length,
    };
  };

  const isBlocked = (date) => {
    return blockedDates.some(bd => bd.date === date);
  };

  const getBlockReason = (date) => {
    const blocked = blockedDates.find(bd => bd.date === date);
    return blocked ? blocked.reason : "";
  };

  const Metric = ({ label, value, color }) => (
    <div style={{ flex: 1, textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );

  const DayCard = ({ date, large = false }) => {
    const stats = getStats(date);
    const d = formatDate(date);
    const blocked = isBlocked(date);
    const reason = getBlockReason(date);
    const dayOrders = orders[date] || [];

    return (
      <div
        style={{
          background: blocked ? "#fee2e2" : "white",
          padding: large ? 28 : 18,
          borderRadius: 12,
          border: blocked ? "2px solid #ef4444" : "1px solid #e5e7eb",
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          position: "relative"
        }}
      >
        {blocked && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "#ef4444",
            color: "white",
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600
          }}>
            🚫 BLOCKED
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: large ? 24 : 18, fontWeight: 700 }}>
            {d.full}
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{date}</div>
          {blocked && (
            <div style={{ fontSize: 13, color: "#dc2626", marginTop: 4, fontStyle: "italic" }}>
              Reason: {reason}
            </div>
          )}
        </div>

        {!blocked && (
          <>
            {/* Total Orders and View List Button */}
            <div style={{
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12
            }}>
              <Metric label="Total Orders" value={stats.total} color="#1f2937" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDateForList(date);
                }}
                style={{
                  padding: "10px 20px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#2563eb";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#3b82f6";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                👥 View Employee List
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              <div style={{ padding: 14, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                  ☀️ Morning (by {MORNING_CUTOFF})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Metric label="🍵 Tea" value={stats.morningTea} color="#10b981" />
                  <Metric label="☕ Coffee" value={stats.morningCoffee} color="#f59e0b" />
                  <Metric label="🥛 Milk" value={stats.morningMilk} color="#3b82f6" />
                </div>
              </div>

              <div style={{ padding: 14, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                  🌙 Evening (by {EVENING_CUTOFF})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Metric label="🍵 Tea" value={stats.eveningTea} color="#10b981" />
                  <Metric label="☕ Coffee" value={stats.eveningCoffee} color="#f59e0b" />
                  <Metric label="🥛 Milk" value={stats.eveningMilk} color="#3b82f6" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>☕ Admin Tea/Coffee Dashboard</h1>
        <button
          onClick={() => setShowYearlyCalendar(true)}
          style={{
            padding: "12px 24px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 16,
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
          }}
        >
          🗓️ Manage Blocked Dates
        </button>
      </div>

      <DayCard date={dates[0]} large />

      <h2 style={{ marginTop: 32, marginBottom: 16, fontSize: 22 }}>
        📆 Upcoming Days (Next 14 Days)
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: 20,
      }}>
        {dates.slice(1).map((date) => (
          <DayCard key={date} date={date} />
        ))}
      </div>

      {showYearlyCalendar && (
        <YearlyCalendarModal
          onClose={() => setShowYearlyCalendar(false)}
          blockedDates={blockedDates}
          onBlockDate={onBlockDate}
          onUnblockDate={onUnblockDate}
        />
      )}

      {selectedDateForList && (
        <EmployeeListModal
          date={selectedDateForList}
          orders={orders[selectedDateForList] || []}
          onClose={() => setSelectedDateForList(null)}
        />
      )}
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================
const TeaCoffee = ({ user }) => {
  const [orders, setOrders] = useState({});
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchedOnce = useRef(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedDates, setBulkSelectedDates] = useState([]);
  const [bulkSelection, setBulkSelection] = useState({ morning: null, evening: null });
  const [blockedDates, setBlockedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tempSelection, setTempSelection] = useState({ morning: null, evening: null });
  
  const isAdmin = ["Admin", "admin", "System Administrator", "Administrator", "system-admin"].includes(
    (user?.role || "").trim()
  );

  const userId = user?._id || user?.id;

  const generateDates = useCallback(() => {
    const dateList = [];
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dateList.push(date.toISOString().split("T")[0]);
    }
    setDates(dateList);
  }, []);

  const fetchBlockedDates = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/blocked_dates`);
      setBlockedDates(res.data);
    } catch (err) {
      console.error("❌ Error fetching blocked dates:", err);
    }
  }, []);

  const fetchMyOrders = useCallback(async () => {
    if (!userId) {
      console.error("❌ No user ID available");
      alert("Error: User ID not found. Please refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/my_orders/${userId}`);
      const orderMap = {};
      res.data.forEach((order) => {
        orderMap[order.date] = order;
      });
      setOrders(orderMap);
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      alert(err.response?.data?.error || "Failed to load orders. Please refresh the page.");
    }
    setLoading(false);
  }, [userId]);

  const fetchAdminOrders = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const end = endDate.toISOString().split("T")[0];

      const res = await axios.get(`${API_BASE}/admin/orders?start_date=${today}&end_date=${end}`);
      
      const orderMap = {};
      res.data.forEach((order) => {
        if (!orderMap[order.date]) {
          orderMap[order.date] = [];
        }
        orderMap[order.date].push(order);
      });
      setOrders(orderMap);
    } catch (err) {
      console.error("❌ Error fetching admin orders:", err);
      alert(err.response?.data?.error || "Failed to load orders. Please refresh the page.");
    }
    setLoading(false);
  }, []);

  const handleBlockDate = async (date, reason) => {
    try {
      const res = await axios.post(`${API_BASE}/block_date`, { date, reason });
      alert(res.data.message);
      fetchBlockedDates();
      if (isAdmin) {
        fetchAdminOrders();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to block date");
    }
  };

  const handleUnblockDate = async (date) => {
    if (!window.confirm("Are you sure you want to unblock this date?")) {
      return;
    }
    try {
      const res = await axios.delete(`${API_BASE}/unblock_date`, { data: { date } });
      alert(res.data.message);
      fetchBlockedDates();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to unblock date");
    }
  };

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    generateDates();
    fetchBlockedDates();

    if (isAdmin) {
      fetchAdminOrders();
    } else if (userId) {
      fetchMyOrders();
    } else {
      alert("Error: User information not available. Please log out and log in again.");
    }
  }, [isAdmin, userId, generateDates, fetchMyOrders, fetchAdminOrders, fetchBlockedDates]);

  const isDateBlocked = (date) => {
    return blockedDates.some(bd => bd.date === date);
  };

  const isPastCutoff = (date, slot) => {
    const today = new Date().toISOString().split("T")[0];
    if (date !== today) return false;

    const now = new Date();
    const cutoffTime = slot === "morning" ? MORNING_CUTOFF : EVENING_CUTOFF;
    const [hours, minutes] = cutoffTime.split(":").map(Number);
    const cutoff = new Date();
    cutoff.setHours(hours, minutes, 0, 0);
    
    return now >= cutoff;
  };

  const handleDateClick = (date) => {
    const day = new Date(date).getDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) return;
    if (isDateBlocked(date)) return;

    if (bulkMode) {
      setBulkSelectedDates(prev =>
        prev.includes(date)
          ? prev.filter(d => d !== date)
          : [...prev, date]
      );
      return;
    }

    const existing = orders[date] || {};
    setSelectedDate(date);
    setTempSelection({
      morning: existing.morning || null,
      evening: existing.evening || null,
    });
  };

  const handleSlotToggle = (slot, value) => {
    // Check if this slot is past cutoff
    if (isPastCutoff(selectedDate, slot)) {
      alert(`Cannot modify ${slot} order after ${slot === "morning" ? MORNING_CUTOFF : EVENING_CUTOFF}`);
      return;
    }

    setTempSelection(prev => ({
      ...prev,
      [slot]: prev[slot] === value ? null : value
    }));
  };

  const handleSubmit = async () => {
    if (!selectedDate || !userId) {
      alert("Error: Missing required information");
      return;
    }

    if (!tempSelection.morning && !tempSelection.evening) {
      alert("Please select at least one item (morning or evening)");
      return;
    }

    try {
      const orderPayload = {
        employee_id: userId,
        date: selectedDate,
        morning: tempSelection.morning,
        evening: tempSelection.evening,
      };

      const response = await axios.post(`${API_BASE}/place_order`, orderPayload);

      setOrders({
        ...orders,
        [selectedDate]: {
          date: selectedDate,
          morning: tempSelection.morning,
          evening: tempSelection.evening,
          employee_name: user.name,
          employee_email: user.email,
        },
      });
      
      alert(response.data.message || "Order submitted successfully!");
      setSelectedDate(null);
      setTempSelection({ morning: null, evening: null });
      fetchMyOrders();
    } catch (err) {
      console.error("❌ Error submitting order:", err);
      alert(err.response?.data?.error || "Failed to submit order. Please try again.");
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkSelection.morning && !bulkSelection.evening) {
      alert("Select at least one item for morning/evening");
      return;
    }

    const validDates = bulkSelectedDates.filter(date => {
      const day = new Date(date).getDay();
      const isWeekend = day === 0 || day === 6;
      return !isWeekend && !isDateBlocked(date);
    });

    if (validDates.length === 0) {
      alert("No valid dates to submit");
      return;
    }

    try {
      for (const date of validDates) {
        await axios.post(`${API_BASE}/place_order`, {
          employee_id: userId,
          date,
          morning: bulkSelection.morning,
          evening: bulkSelection.evening,
        });
      }

      alert(`Bulk order placed for ${validDates.length} days!`);
      setBulkMode(false);
      setBulkSelectedDates([]);
      setBulkSelection({ morning: null, evening: null });
      fetchMyOrders();
    } catch (err) {
      console.error("❌ Bulk order error:", err);
      alert(err.response?.data?.error || "Error submitting bulk order");
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedDate) return;

    if (!window.confirm("Are you sure you want to cancel the entire order for this day?")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/cancel_order`, {
        data: { employee_id: userId, date: selectedDate }
      });

      const updated = { ...orders };
      delete updated[selectedDate];
      setOrders(updated);

      alert("Order cancelled successfully!");
      setSelectedDate(null);
      setTempSelection({ morning: null, evening: null });
    } catch (err) {
      console.error("❌ Error cancelling order:", err);
      alert(err.response?.data?.error || "Failed to cancel order!");
    }
  };

  const handleCancel = () => {
    setSelectedDate(null);
    setTempSelection({ morning: null, evening: null });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      full: `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`,
    };
  };

  const getBeverageIcon = (beverage) => {
    switch(beverage) {
      case "tea": return "🍵";
      case "coffee": return "☕";
      case "milk": return "🥛";
      default: return "";
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  if (isAdmin) {
    return (
      <AdminView
        dates={dates}
        orders={orders}
        formatDate={formatDate}
        blockedDates={blockedDates}
        onBlockDate={handleBlockDate}
        onUnblockDate={handleUnblockDate}
      />
    );
  }

  // EMPLOYEE VIEW
  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>☕ Tea/Coffee Ordering</h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        Morning orders by {MORNING_CUTOFF} • Evening orders by {EVENING_CUTOFF}
      </p>

      {/* Bulk Mode Toggle */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => {
            setBulkMode(!bulkMode);
            setBulkSelectedDates([]);
            setBulkSelection({ morning: null, evening: null });
          }}
          style={{
            padding: "10px 20px",
            background: bulkMode ? "#ef4444" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {bulkMode ? "✕ Cancel Bulk Mode" : "📅 Bulk Order Mode"}
        </button>
      </div>

      {/* Bulk Mode Selection */}
      {bulkMode && (
        <div style={{
          background: "#eff6ff",
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
          border: "2px solid #3b82f6"
        }}>
          <h3 style={{ marginBottom: 16 }}>🎯 Bulk Order Selection</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>☀️ Morning:</label>
            <div style={{ display: "flex", gap: 10 }}>
              {["tea", "coffee", "milk"].map(option => (
                <button
                  key={option}
                  onClick={() => setBulkSelection(prev => ({ ...prev, morning: prev.morning === option ? null : option }))}
                  style={{
                    padding: "8px 16px",
                    background: bulkSelection.morning === option ? "#10b981" : "white",
                    color: bulkSelection.morning === option ? "white" : "#374151",
                    border: "2px solid #e5e7eb",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {getBeverageIcon(option)} {option}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>🌙 Evening:</label>
            <div style={{ display: "flex", gap: 10 }}>
              {["tea", "coffee", "milk"].map(option => (
                <button
                  key={option}
                  onClick={() => setBulkSelection(prev => ({ ...prev, evening: prev.evening === option ? null : option }))}
                  style={{
                    padding: "8px 16px",
                    background: bulkSelection.evening === option ? "#10b981" : "white",
                    color: bulkSelection.evening === option ? "white" : "#374151",
                    border: "2px solid #e5e7eb",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {getBeverageIcon(option)} {option}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBulkSubmit}
            disabled={bulkSelectedDates.length === 0}
            style={{
              padding: "12px 24px",
              background: bulkSelectedDates.length > 0 ? "#10b981" : "#9ca3af",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: bulkSelectedDates.length > 0 ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            ✓ Submit Bulk Order ({bulkSelectedDates.length} days)
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}>
        {dates.map((date) => {
          const d = formatDate(date);
          const order = orders[date];
          const day = new Date(date).getDay();
          const isWeekend = day === 0 || day === 6;
          const blocked = isDateBlocked(date);
          const isSelected = selectedDate === date;
          const isBulkSelected = bulkSelectedDates.includes(date);
          const morningPastCutoff = isPastCutoff(date, "morning");
          const eveningPastCutoff = isPastCutoff(date, "evening");

          return (
            <div
              key={date}
              onClick={() => !isWeekend && !blocked && handleDateClick(date)}
              style={{
                padding: 16,
                background: blocked ? "#fee2e2" : isSelected ? "#dbeafe" : isBulkSelected ? "#fef3c7" : isWeekend ? "#f3f4f6" : "white",
                border: isSelected ? "3px solid #3b82f6" : isBulkSelected ? "3px solid #f59e0b" : "1px solid #e5e7eb",
                borderRadius: 12,
                cursor: isWeekend || blocked ? "not-allowed" : "pointer",
                opacity: isWeekend || blocked ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {d.day}, {d.date}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                {d.month}
              </div>

              {blocked ? (
                <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                  🚫 Unavailable
                </div>
              ) : isWeekend ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Weekend
                </div>
              ) : order ? (
                <>
                  {order.morning && (
                    <div style={{
                      fontSize: 12,
                      marginBottom: 4,
                      padding: "4px 8px",
                      background: morningPastCutoff ? "#fef2f2" : "#f0fdf4",
                      color: morningPastCutoff ? "#991b1b" : "#166534",
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      {getBeverageIcon(order.morning)} {order.morning}
                      {morningPastCutoff && " 🔒"}
                    </div>
                  )}
                  {order.evening && (
                    <div style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      background: eveningPastCutoff ? "#fef2f2" : "#f0fdf4",
                      color: eveningPastCutoff ? "#991b1b" : "#166534",
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      {getBeverageIcon(order.evening)} {order.evening}
                      {eveningPastCutoff && " 🔒"}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {isBulkSelected ? "✓ Selected" : "No order"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Order Modal */}
      {selectedDate && (
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
        }}>
          <div style={{
            background: "white",
            padding: 30,
            borderRadius: 12,
            maxWidth: 500,
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <h3 style={{ marginBottom: 16 }}>☕ Order for {formatDate(selectedDate).full}</h3>

            {/* Morning Slot */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                ☀️ Morning (by {MORNING_CUTOFF})
                {isPastCutoff(selectedDate, "morning") && (
                  <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 400 }}>
                    🔒 Cutoff passed
                  </span>
                )}
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["tea", "coffee", "milk"].map(option => (
                  <button
                    key={option}
                    onClick={() => handleSlotToggle("morning", option)}
                    disabled={isPastCutoff(selectedDate, "morning")}
                    style={{
                      padding: "10px 16px",
                      background: tempSelection.morning === option ? "#10b981" : "white",
                      color: tempSelection.morning === option ? "white" : "#374151",
                      border: "2px solid #e5e7eb",
                      borderRadius: 6,
                      cursor: isPastCutoff(selectedDate, "morning") ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: isPastCutoff(selectedDate, "morning") ? 0.5 : 1,
                    }}
                  >
                    {getBeverageIcon(option)} {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Evening Slot */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                🌙 Evening (by {EVENING_CUTOFF})
                {isPastCutoff(selectedDate, "evening") && (
                  <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 400 }}>
                    🔒 Cutoff passed
                  </span>
                )}
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["tea", "coffee", "milk"].map(option => (
                  <button
                    key={option}
                    onClick={() => handleSlotToggle("evening", option)}
                    disabled={isPastCutoff(selectedDate, "evening")}
                    style={{
                      padding: "10px 16px",
                      background: tempSelection.evening === option ? "#10b981" : "white",
                      color: tempSelection.evening === option ? "white" : "#374151",
                      border: "2px solid #e5e7eb",
                      borderRadius: 6,
                      cursor: isPastCutoff(selectedDate, "evening") ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: isPastCutoff(selectedDate, "evening") ? 0.5 : 1,
                    }}
                  >
                    {getBeverageIcon(option)} {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✓ Submit Order
              </button>
              {orders[selectedDate] && (
                <button
                  onClick={handleDeleteOrder}
                  style={{
                    padding: 12,
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🗑️
                </button>
              )}
              <button
                onClick={handleCancel}
                style={{
                  padding: 12,
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
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

export default TeaCoffee;