import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  Coffee,
  CupSoda,
  ListChecks,
  Milk,
  RefreshCw,
  ShieldBan,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import "../App.css";

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/tea_coffee`;
const MORNING_CUTOFF = "10:30";
const EVENING_CUTOFF = "14:30";
const BEVERAGE_OPTIONS = ["tea", "coffee", "milk"];

const getBeverageIcon = (beverage) => {
  switch (beverage) {
    case "tea":
      return "Tea";
    case "coffee":
      return "Coffee";
    case "milk":
      return "Milk";
    default:
      return "";
  }
};

const getBeverageGlyph = (beverage) => {
  switch (beverage) {
    case "tea":
      return <CupSoda size={16} />;
    case "coffee":
      return <Coffee size={16} />;
    case "milk":
      return <Milk size={16} />;
    default:
      return null;
  }
};

const formatDateLabel = (dateStr) => {
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

const BeveragePill = ({ beverage, locked = false }) => {
  if (!beverage) return null;

  return (
    <span className={`tea-beverage-pill ${locked ? "is-locked" : ""}`}>
      {getBeverageGlyph(beverage)}
      <span>{getBeverageIcon(beverage)}</span>
      {locked ? <span className="tea-beverage-lock">Locked</span> : null}
    </span>
  );
};

const SlotSelector = ({ label, cutoff, value, locked, onToggle }) => (
  <div className="tea-slot-section">
    <div className="tea-slot-header">
      <strong>{label}</strong>
      <span>{cutoff}</span>
      {locked ? <em>Cutoff passed</em> : null}
    </div>
    <div className="tea-option-row">
      {BEVERAGE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={`tea-option-chip ${value === option ? "is-selected" : ""}`}
          onClick={() => onToggle(option)}
          disabled={locked}
        >
          {getBeverageGlyph(option)}
          <span>{getBeverageIcon(option)}</span>
        </button>
      ))}
    </div>
  </div>
);

const YearlyCalendarModal = ({ onClose, blockedDates, onBlockDate, onUnblockDate }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDateToBlock, setSelectedDateToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const isDateBlocked = (date) => blockedDates.some((item) => item.date === date);

  const getBlockReason = (date) => blockedDates.find((item) => item.date === date)?.reason || "";

  const handleDateClick = (dateStr) => {
    if (isDateBlocked(dateStr)) {
      if (window.confirm(`Unblock ${dateStr}?\nReason: ${getBlockReason(dateStr)}`)) {
        onUnblockDate(dateStr);
      }
      return;
    }

    setSelectedDateToBlock(dateStr);
  };

  const renderMonth = (monthIndex) => {
    const firstDay = new Date(selectedYear, monthIndex, 1);
    const lastDay = new Date(selectedYear, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const cells = [];

    for (let index = 0; index < startingDayOfWeek; index += 1) {
      cells.push(<div key={`empty-${monthIndex}-${index}`} className="tea-block-cell empty" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const blocked = isDateBlocked(dateStr);
      const weekday = new Date(selectedYear, monthIndex, day).getDay();
      const isWeekend = weekday === 0 || weekday === 6;

      cells.push(
        <button
          key={dateStr}
          type="button"
          className={`tea-block-cell ${blocked ? "is-blocked" : ""} ${isWeekend ? "is-weekend" : ""}`}
          onClick={() => !isWeekend && handleDateClick(dateStr)}
          title={blocked ? `Blocked: ${getBlockReason(dateStr)}` : isWeekend ? "Weekend" : "Click to block"}
          disabled={isWeekend}
        >
          {day}
        </button>
      );
    }

    return (
      <article key={months[monthIndex]} className="tea-block-month">
        <h4>{months[monthIndex]}</h4>
        <div className="tea-block-weekdays">
          {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
            <span key={`${months[monthIndex]}-${day}`}>{day}</span>
          ))}
        </div>
        <div className="tea-block-grid">{cells}</div>
      </article>
    );
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal admin-modal-wide">
        <div className="admin-modal-header">
          <div>
            <h2>Manage Blocked Dates</h2>
            <p>Block or unblock tea and coffee service dates. Weekends stay unavailable automatically.</p>
          </div>
          <div className="tea-modal-topbar">
            <button className="fiori-button secondary" onClick={() => setSelectedYear(selectedYear - 1)}>
              {selectedYear - 1}
            </button>
            <span className="tea-year-label">{selectedYear}</span>
            <button className="fiori-button secondary" onClick={() => setSelectedYear(selectedYear + 1)}>
              {selectedYear + 1}
            </button>
            <button className="fiori-button secondary danger" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="tea-block-month-grid">
          {months.map((_, monthIndex) => renderMonth(monthIndex))}
        </div>

        <div className="tea-block-legend">
          <span><i /> Available</span>
          <span><i className="is-blocked" /> Blocked</span>
          <span><i className="is-weekend" /> Weekend</span>
        </div>
      </div>

      {selectedDateToBlock ? (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <h2>Block Date</h2>
                <p>{selectedDateToBlock}</p>
              </div>
            </div>

            <label className="fiori-form-field">
              <label>Reason</label>
              <input
                className="input"
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                placeholder="Holiday, maintenance, office closure"
                autoFocus
              />
            </label>

            <div className="admin-modal-actions">
              <button
                className="fiori-button secondary"
                onClick={() => {
                  setSelectedDateToBlock(null);
                  setBlockReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="fiori-button danger"
                onClick={() => {
                  onBlockDate(selectedDateToBlock, blockReason || "Unavailable");
                  setSelectedDateToBlock(null);
                  setBlockReason("");
                }}
              >
                Block date
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const EmployeeListModal = ({ date, orders, onClose }) => {
  const teaCount = orders.filter((item) => item.morning === "tea" || item.evening === "tea").length;
  const coffeeCount = orders.filter((item) => item.morning === "coffee" || item.evening === "coffee").length;
  const milkCount = orders.filter((item) => item.morning === "milk" || item.evening === "milk").length;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal admin-modal-wide">
        <div className="admin-modal-header">
          <div>
            <h2>Employee Orders</h2>
            <p>{formatDateLabel(date).full} • {orders.length} orders</p>
          </div>
          <button className="fiori-button secondary danger" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="tea-employee-summary">
          <article className="fiori-stat-card">
            <div className="fiori-stat-label">Tea</div>
            <div className="fiori-stat-value">{teaCount}</div>
          </article>
          <article className="fiori-stat-card">
            <div className="fiori-stat-label">Coffee</div>
            <div className="fiori-stat-value">{coffeeCount}</div>
          </article>
          <article className="fiori-stat-card">
            <div className="fiori-stat-label">Milk</div>
            <div className="fiori-stat-value">{milkCount}</div>
          </article>
        </div>

        {orders.length === 0 ? (
          <div className="admin-empty-state">
            <Users size={24} />
            <div>
              <strong>No employee orders for this date</strong>
              <p>Orders will appear here once the team places them.</p>
            </div>
          </div>
        ) : (
          <div className="fiori-table-shell">
            <table className="fiori-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Morning</th>
                  <th>Evening</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={`${order.employee_email}-${index}`}>
                    <td>
                      <div className="fiori-primary-cell">
                        <strong>{order.employee_name}</strong>
                        <span>{order.employee_email}</span>
                      </div>
                    </td>
                    <td>{order.morning ? <BeveragePill beverage={order.morning} /> : "—"}</td>
                    <td>{order.evening ? <BeveragePill beverage={order.evening} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminView = ({ dates, orders, blockedDates, onBlockDate, onUnblockDate, onRefresh }) => {
  const [showYearlyCalendar, setShowYearlyCalendar] = useState(false);
  const [selectedDateForList, setSelectedDateForList] = useState(null);

  const getStats = useCallback(
    (date) => {
      const dayOrders = orders[date] || [];

      return dayOrders.reduce(
        (accumulator, order) => {
          if (order.morning === "tea") accumulator.morningTea += 1;
          if (order.morning === "coffee") accumulator.morningCoffee += 1;
          if (order.morning === "milk") accumulator.morningMilk += 1;
          if (order.evening === "tea") accumulator.eveningTea += 1;
          if (order.evening === "coffee") accumulator.eveningCoffee += 1;
          if (order.evening === "milk") accumulator.eveningMilk += 1;
          accumulator.total += 1;
          return accumulator;
        },
        {
          morningTea: 0,
          morningCoffee: 0,
          morningMilk: 0,
          eveningTea: 0,
          eveningCoffee: 0,
          eveningMilk: 0,
          total: 0,
        }
      );
    },
    [orders]
  );

  const isBlocked = useCallback(
    (date) => blockedDates.some((item) => item.date === date),
    [blockedDates]
  );

  const getBlockReason = useCallback(
    (date) => blockedDates.find((item) => item.date === date)?.reason || "",
    [blockedDates]
  );

  const summaryStats = useMemo(() => {
    return dates.reduce(
      (accumulator, order) => {
        const stats = getStats(order);
        accumulator.totalOrders += stats.total;
        if (isBlocked(order)) accumulator.blockedDays += 1;
        if (stats.total > 0) accumulator.activeDays += 1;
        return accumulator;
      },
      { totalOrders: 0, blockedDays: 0, activeDays: 0 }
    );
  }, [dates, getStats, isBlocked]);

    const DayCard = ({ date, large = false }) => {
      const stats = getStats(date);
      const label = formatDateLabel(date);
      const blocked = isBlocked(date);

      return (
      <article className={`tea-admin-day-card ${large ? "is-large" : ""} ${blocked ? "is-blocked" : ""}`}>
        <div className="tea-admin-day-top">
          <div>
            <h3>{label.full}</h3>
            <p>{date}</p>
          </div>
          {blocked ? <span className="fiori-status-pill is-rejected">Blocked</span> : null}
        </div>

        {blocked ? (
          <div className="tea-admin-block-reason">{getBlockReason(date) || "Unavailable"}</div>
        ) : (
          <>
            <div className="tea-admin-total">
              <div>
                <span>Total Orders</span>
                <strong>{stats.total}</strong>
              </div>
              <button className="fiori-button secondary" onClick={() => setSelectedDateForList(date)}>
                View employee list
              </button>
            </div>

            <div className="tea-admin-slot-grid">
              <div className="tea-admin-slot-card">
                <strong>Morning</strong>
                <div className="tea-admin-metric-grid">
                  <div><span>Tea</span><b>{stats.morningTea}</b></div>
                  <div><span>Coffee</span><b>{stats.morningCoffee}</b></div>
                  <div><span>Milk</span><b>{stats.morningMilk}</b></div>
                </div>
              </div>

              <div className="tea-admin-slot-card">
                <strong>Evening</strong>
                <div className="tea-admin-metric-grid">
                  <div><span>Tea</span><b>{stats.eveningTea}</b></div>
                  <div><span>Coffee</span><b>{stats.eveningCoffee}</b></div>
                  <div><span>Milk</span><b>{stats.eveningMilk}</b></div>
                </div>
              </div>
            </div>
          </>
        )}
      </article>
    );
  };

  return (
    <section className="tea-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Hospitality Operations</div>
          <h1>Tea and Coffee</h1>
          <p>
            Monitor daily beverage demand, review team orders, and manage blocked service dates
            from a single admin dashboard.
          </p>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-hero-meta-item">
            <span>Total orders</span>
            <strong>{summaryStats.totalOrders}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Active days</span>
            <strong>{summaryStats.activeDays}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Blocked days</span>
            <strong>{summaryStats.blockedDays}</strong>
          </div>
        </div>
      </header>

      <section className="tea-summary-grid">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Service Window</span>
            <ShoppingBag size={18} />
          </div>
          <div className="fiori-stat-value tea-stat-text">15 Days</div>
          <div className="fiori-stat-note">Current rolling view for tea and coffee demand</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Blocked Dates</span>
            <ShieldBan size={18} />
          </div>
          <div className="fiori-stat-value">{summaryStats.blockedDays}</div>
          <div className="fiori-stat-note">Dates currently unavailable for beverage service</div>
        </article>

        <article className="fiori-stat-card is-actionable" onClick={() => setShowYearlyCalendar(true)}>
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Manage Availability</span>
            <CalendarDays size={18} />
          </div>
          <div className="fiori-stat-value tea-stat-text">Open</div>
          <div className="fiori-inline-link">Block or unblock service dates</div>
        </article>
      </section>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Controls</h3>
            <p>Refresh orders or update the yearly service calendar</p>
          </div>
          <div className="tea-toolbar">
            <button className="fiori-button secondary" onClick={onRefresh}>
              <RefreshCw size={16} />
              <span>Refresh orders</span>
            </button>
            <button className="fiori-button primary" onClick={() => setShowYearlyCalendar(true)}>
              <CalendarDays size={16} />
              <span>Manage blocked dates</span>
            </button>
          </div>
        </div>
      </section>

      <DayCard date={dates[0]} large />

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Upcoming Days</h3>
            <p>Daily demand cards for the next 14 service days</p>
          </div>
        </div>

        <div className="tea-admin-grid">
          {dates.slice(1).map((date) => (
            <DayCard key={date} date={date} />
          ))}
        </div>
      </section>

      {showYearlyCalendar ? (
        <YearlyCalendarModal
          onClose={() => setShowYearlyCalendar(false)}
          blockedDates={blockedDates}
          onBlockDate={onBlockDate}
          onUnblockDate={onUnblockDate}
        />
      ) : null}

      {selectedDateForList ? (
        <EmployeeListModal
          date={selectedDateForList}
          orders={orders[selectedDateForList] || []}
          onClose={() => setSelectedDateForList(null)}
        />
      ) : null}
    </section>
  );
};

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
  const [message, setMessage] = useState("");

  const isAdmin = ["Admin", "admin", "System Administrator", "Administrator", "system-admin"].includes(
    (user?.role || "").trim()
  );
  const userId = user?._id || user?.id;

  const showToast = (nextMessage) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const generateDates = useCallback(() => {
    const dateList = [];
    const today = new Date();
    for (let index = 0; index < 15; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      dateList.push(date.toISOString().split("T")[0]);
    }
    setDates(dateList);
  }, []);

  const fetchBlockedDates = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/blocked_dates`);
      setBlockedDates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching blocked dates:", error);
    }
  }, []);

  const fetchMyOrders = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/my_orders/${userId}`);
      const orderMap = {};
      response.data.forEach((order) => {
        orderMap[order.date] = order;
      });
      setOrders(orderMap);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showToast(error.response?.data?.error || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchAdminOrders = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const end = endDate.toISOString().split("T")[0];
      const response = await axios.get(`${API_BASE}/admin/orders?start_date=${start}&end_date=${end}`);

      const orderMap = {};
      response.data.forEach((order) => {
        if (!orderMap[order.date]) {
          orderMap[order.date] = [];
        }
        orderMap[order.date].push(order);
      });
      setOrders(orderMap);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      showToast(error.response?.data?.error || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(() => {
    if (isAdmin) {
      fetchAdminOrders();
    } else {
      fetchMyOrders();
    }
  }, [isAdmin, fetchAdminOrders, fetchMyOrders]);

  const handleBlockDate = async (date, reason) => {
    try {
      const response = await axios.post(`${API_BASE}/block_date`, { date, reason });
      showToast(response.data.message || "Date blocked successfully");
      fetchBlockedDates();
      refreshOrders();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to block date");
    }
  };

  const handleUnblockDate = async (date) => {
    if (!window.confirm("Are you sure you want to unblock this date?")) return;

    try {
      const response = await axios.delete(`${API_BASE}/unblock_date`, { data: { date } });
      showToast(response.data.message || "Date unblocked successfully");
      fetchBlockedDates();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to unblock date");
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
      showToast("User information is not available");
    }
  }, [isAdmin, userId, generateDates, fetchBlockedDates, fetchAdminOrders, fetchMyOrders]);

  const isDateBlocked = (date) => blockedDates.some((item) => item.date === date);

  const isPastCutoff = (date, slot) => {
    const today = new Date().toISOString().split("T")[0];
    if (date !== today) return false;

    const cutoffTime = slot === "morning" ? MORNING_CUTOFF : EVENING_CUTOFF;
    const [hours, minutes] = cutoffTime.split(":").map(Number);
    const cutoff = new Date();
    cutoff.setHours(hours, minutes, 0, 0);
    return new Date() >= cutoff;
  };

  const handleDateClick = (date) => {
    const day = new Date(date).getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend || isDateBlocked(date)) return;

    if (bulkMode) {
      setBulkSelectedDates((previous) =>
        previous.includes(date) ? previous.filter((item) => item !== date) : [...previous, date]
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
    if (isPastCutoff(selectedDate, slot)) {
      showToast(`Cannot modify ${slot} order after ${slot === "morning" ? MORNING_CUTOFF : EVENING_CUTOFF}`);
      return;
    }

    setTempSelection((previous) => ({
      ...previous,
      [slot]: previous[slot] === value ? null : value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedDate || !userId) {
      showToast("Missing required information");
      return;
    }

    if (!tempSelection.morning && !tempSelection.evening) {
      showToast("Select at least one item");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/place_order`, {
        employee_id: userId,
        date: selectedDate,
        morning: tempSelection.morning,
        evening: tempSelection.evening,
      });

      setOrders((previous) => ({
        ...previous,
        [selectedDate]: {
          date: selectedDate,
          morning: tempSelection.morning,
          evening: tempSelection.evening,
          employee_name: user.name,
          employee_email: user.email,
        },
      }));

      showToast(response.data.message || "Order submitted successfully");
      setSelectedDate(null);
      setTempSelection({ morning: null, evening: null });
      fetchMyOrders();
    } catch (error) {
      console.error("Error submitting order:", error);
      showToast(error.response?.data?.error || "Failed to submit order");
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkSelection.morning && !bulkSelection.evening) {
      showToast("Select at least one morning or evening item");
      return;
    }

    const validDates = bulkSelectedDates.filter((date) => {
      const day = new Date(date).getDay();
      const isWeekend = day === 0 || day === 6;
      return !isWeekend && !isDateBlocked(date);
    });

    if (validDates.length === 0) {
      showToast("No valid dates selected");
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

      showToast(`Bulk order placed for ${validDates.length} days`);
      setBulkMode(false);
      setBulkSelectedDates([]);
      setBulkSelection({ morning: null, evening: null });
      fetchMyOrders();
    } catch (error) {
      console.error("Error submitting bulk order:", error);
      showToast(error.response?.data?.error || "Failed to submit bulk order");
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedDate) return;
    if (!window.confirm("Cancel the entire order for this day?")) return;

    try {
      await axios.delete(`${API_BASE}/cancel_order`, {
        data: { employee_id: userId, date: selectedDate },
      });

      setOrders((previous) => {
        const nextOrders = { ...previous };
        delete nextOrders[selectedDate];
        return nextOrders;
      });

      showToast("Order cancelled successfully");
      setSelectedDate(null);
      setTempSelection({ morning: null, evening: null });
    } catch (error) {
      console.error("Error cancelling order:", error);
      showToast(error.response?.data?.error || "Failed to cancel order");
    }
  };

  const handleCancel = () => {
    setSelectedDate(null);
    setTempSelection({ morning: null, evening: null });
  };

  const employeeSummary = useMemo(() => {
    return dates.reduce(
      (accumulator, date) => {
        const order = orders[date];
        if (!order) return accumulator;
        accumulator.totalDays += 1;
        if (order.morning) accumulator.morningSelections += 1;
        if (order.evening) accumulator.eveningSelections += 1;
        return accumulator;
      },
      { totalDays: 0, morningSelections: 0, eveningSelections: 0 }
    );
  }, [dates, orders]);

  if (loading) {
    return (
      <section className="tea-workspace">
        <div className="fiori-loading-card">
          <Coffee size={28} />
          <div>
            <strong>Loading tea and coffee workspace</strong>
            <p>Preparing beverage orders and availability windows.</p>
          </div>
        </div>
      </section>
    );
  }

  if (isAdmin) {
    return (
      <>
        <AdminView
          dates={dates}
          orders={orders}
          blockedDates={blockedDates}
          onBlockDate={handleBlockDate}
          onUnblockDate={handleUnblockDate}
          onRefresh={refreshOrders}
        />
        {message ? (
          <div className="admin-toast is-success">{message}</div>
        ) : null}
      </>
    );
  }

  return (
    <section className="tea-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Hospitality Requests</div>
          <h1>Tea and Coffee</h1>
          <p>
            Place beverage requests for the next 15 days, use bulk mode for repeated choices, and
            track cutoff windows for each slot.
          </p>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-hero-meta-item">
            <span>Morning cutoff</span>
            <strong>{MORNING_CUTOFF}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Evening cutoff</span>
            <strong>{EVENING_CUTOFF}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Blocked dates</span>
            <strong>{blockedDates.length}</strong>
          </div>
        </div>
      </header>

      <section className="tea-summary-grid">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Ordered Days</span>
            <ListChecks size={18} />
          </div>
          <div className="fiori-stat-value">{employeeSummary.totalDays}</div>
          <div className="fiori-stat-note">Days where you have at least one active beverage order</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Morning Selections</span>
            <CupSoda size={18} />
          </div>
          <div className="fiori-stat-value">{employeeSummary.morningSelections}</div>
          <div className="fiori-stat-note">Morning beverage selections currently recorded</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Evening Selections</span>
            <Coffee size={18} />
          </div>
          <div className="fiori-stat-value">{employeeSummary.eveningSelections}</div>
          <div className="fiori-stat-note">Evening beverage selections currently recorded</div>
        </article>
      </section>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Ordering Controls</h3>
            <p>Switch bulk mode on or off, then select dates from the calendar below</p>
          </div>
          <div className="tea-toolbar">
            <button className="fiori-button secondary" onClick={refreshOrders}>
              <RefreshCw size={16} />
              <span>Refresh orders</span>
            </button>
            <button
              className={`fiori-button ${bulkMode ? "danger" : "primary"}`}
              onClick={() => {
                setBulkMode(!bulkMode);
                setBulkSelectedDates([]);
                setBulkSelection({ morning: null, evening: null });
              }}
            >
              {bulkMode ? (
                <>
                  <X size={16} />
                  <span>Cancel bulk mode</span>
                </>
              ) : (
                <>
                  <CalendarDays size={16} />
                  <span>Bulk order mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {bulkMode ? (
          <div className="tea-bulk-panel">
            <div className="tea-bulk-grid">
              <SlotSelector
                label="Morning"
                cutoff={`By ${MORNING_CUTOFF}`}
                value={bulkSelection.morning}
                locked={false}
                onToggle={(option) =>
                  setBulkSelection((previous) => ({
                    ...previous,
                    morning: previous.morning === option ? null : option,
                  }))
                }
              />

              <SlotSelector
                label="Evening"
                cutoff={`By ${EVENING_CUTOFF}`}
                value={bulkSelection.evening}
                locked={false}
                onToggle={(option) =>
                  setBulkSelection((previous) => ({
                    ...previous,
                    evening: previous.evening === option ? null : option,
                  }))
                }
              />
            </div>

            <div className="tea-bulk-footer">
              <span>{bulkSelectedDates.length} dates selected</span>
              <button
                className="fiori-button primary"
                onClick={handleBulkSubmit}
                disabled={bulkSelectedDates.length === 0}
              >
                Submit bulk order
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Ordering Calendar</h3>
            <p>Select a service date to add, update, or cancel your beverage order</p>
          </div>
        </div>

        <div className="tea-employee-grid">
          {dates.map((date) => {
            const label = formatDateLabel(date);
            const order = orders[date];
            const day = new Date(date).getDay();
            const isWeekend = day === 0 || day === 6;
            const blocked = isDateBlocked(date);
            const isSelected = selectedDate === date;
            const isBulkSelected = bulkSelectedDates.includes(date);
            const morningPastCutoff = isPastCutoff(date, "morning");
            const eveningPastCutoff = isPastCutoff(date, "evening");

            return (
              <button
                key={date}
                type="button"
                className={`tea-day-card ${isSelected ? "is-selected" : ""} ${
                  isBulkSelected ? "is-bulk-selected" : ""
                } ${blocked ? "is-blocked" : ""} ${isWeekend ? "is-weekend" : ""}`}
                onClick={() => handleDateClick(date)}
                disabled={isWeekend || blocked}
              >
                <div className="tea-day-top">
                  <strong>{label.day}, {label.date}</strong>
                  <span>{label.month}</span>
                </div>

                {blocked ? (
                  <div className="tea-day-state is-danger">Unavailable</div>
                ) : isWeekend ? (
                  <div className="tea-day-state">Weekend</div>
                ) : order ? (
                  <div className="tea-day-orders">
                    {order.morning ? <BeveragePill beverage={order.morning} locked={morningPastCutoff} /> : null}
                    {order.evening ? <BeveragePill beverage={order.evening} locked={eveningPastCutoff} /> : null}
                  </div>
                ) : (
                  <div className="tea-day-state">{isBulkSelected ? "Selected for bulk" : "No order"}</div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDate ? (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <h2>Order Beverage</h2>
                <p>{formatDateLabel(selectedDate).full}</p>
              </div>
            </div>

            <div className="tea-modal-content">
              <SlotSelector
                label="Morning"
                cutoff={`By ${MORNING_CUTOFF}`}
                value={tempSelection.morning}
                locked={isPastCutoff(selectedDate, "morning")}
                onToggle={(option) => handleSlotToggle("morning", option)}
              />

              <SlotSelector
                label="Evening"
                cutoff={`By ${EVENING_CUTOFF}`}
                value={tempSelection.evening}
                locked={isPastCutoff(selectedDate, "evening")}
                onToggle={(option) => handleSlotToggle("evening", option)}
              />
            </div>

            <div className="admin-modal-actions">
              <button className="fiori-button secondary" onClick={handleCancel}>
                Cancel
              </button>
              {orders[selectedDate] ? (
                <button className="fiori-button secondary danger" onClick={handleDeleteOrder}>
                  Cancel order
                </button>
              ) : null}
              <button className="fiori-button primary" onClick={handleSubmit}>
                Submit order
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="admin-toast is-success">{message}</div>
      ) : null}
    </section>
  );
};

export default TeaCoffee;
