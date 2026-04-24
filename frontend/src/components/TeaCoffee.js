import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  Coffee,
  Download,
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
import DataTable from "./DataTable";
import { downloadFileFromResponse } from "./exportUtils";

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

const AdminView = ({ blockedDates, onBlockDate, onUnblockDate, onRefresh, showToast }) => {
  const [showYearlyCalendar, setShowYearlyCalendar] = useState(false);
  const [records, setRecords] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [reportLoading, setReportLoading] = useState(false);
  const [filters, setFilters] = useState({
    datePreset: "last_month",
    startDate: "",
    endDate: "",
    type: "all",
    search: "",
  });
  const [summary, setSummary] = useState({
    total_people_taking_coffee: 0,
    total_people_not_taking_coffee: 0,
    guest_coffee_count: 0,
    snacks_consumption: 0,
  });

  const fetchReport = useCallback(async () => {
    try {
      setReportLoading(true);
      const response = await axios.get(`${API_BASE}/admin/report`, {
        params: {
          page: reportPage,
          page_size: 10,
          date_preset: filters.datePreset || undefined,
          start_date: filters.datePreset === "custom" ? filters.startDate || undefined : undefined,
          end_date: filters.datePreset === "custom" ? filters.endDate || undefined : undefined,
          type: filters.type !== "all" ? filters.type : undefined,
          search: filters.search || undefined,
        },
      });
      setRecords(response.data.items || []);
      setSummary(response.data.summary || {});
      setReportTotalPages(response.data.total_pages || 1);
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to load tea and coffee report");
      setRecords([]);
    } finally {
      setReportLoading(false);
    }
  }, [filters, reportPage, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async (format) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (filters.datePreset) params.set("date_preset", filters.datePreset);
    if (filters.datePreset === "custom" && filters.startDate) params.set("start_date", filters.startDate);
    if (filters.datePreset === "custom" && filters.endDate) params.set("end_date", filters.endDate);
    if (filters.type !== "all") params.set("type", filters.type);
    if (filters.search) params.set("search", filters.search);
    await downloadFileFromResponse(`${API_BASE}/admin/export?${params.toString()}`, `tea_coffee_report.${format === "excel" ? "xls" : "csv"}`);
  };

  return (
    <section className="tea-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Hospitality Operations</div>
          <h1>Tea and Coffee</h1>
          <p>Review beverage activity in a report table, filter by timeframe and order type, and export the current view with filter context.</p>
        </div>
        <div className="employee-directory-hero-actions">
          <button className="fiori-button secondary" onClick={() => handleExport("csv")}>
            <Download size={16} />
            <span>CSV</span>
          </button>
          <button className="fiori-button secondary" onClick={() => handleExport("excel")}>
            <Download size={16} />
            <span>Excel</span>
          </button>
          <button className="fiori-button primary" onClick={() => setShowYearlyCalendar(true)}>
            <CalendarDays size={16} />
            <span>Manage blocked dates</span>
          </button>
        </div>
      </header>

      <section className="tea-summary-grid">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Coffee drinkers</span>
            <Coffee size={18} />
          </div>
          <div className="fiori-stat-value">{summary.total_people_taking_coffee || 0}</div>
          <div className="fiori-stat-note">Unique employees with coffee orders in the filtered period</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">No coffee</span>
            <Users size={18} />
          </div>
          <div className="fiori-stat-value">{summary.total_people_not_taking_coffee || 0}</div>
          <div className="fiori-stat-note">Employees ordering without coffee in the filtered result set</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Guest coffee</span>
            <ShoppingBag size={18} />
          </div>
          <div className="fiori-stat-value">{summary.guest_coffee_count || 0}</div>
          <div className="fiori-stat-note">Guest beverage count captured in current records</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Snacks</span>
            <ShieldBan size={18} />
          </div>
          <div className="fiori-stat-value">{summary.snacks_consumption || 0}</div>
          <div className="fiori-stat-note">Snacks logged in the current filtered result set</div>
        </article>
      </section>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Report filters</h3>
            <p>Choose a time window, order type, and search term for the admin report.</p>
          </div>
          <div className="tea-toolbar">
            <button className="fiori-button secondary" onClick={() => { onRefresh(); fetchReport(); }}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        <div className="employee-directory-filters">
          <label className="employee-filter-field">
            <span>Period</span>
            <select className="input" value={filters.datePreset} onChange={(event) => { setFilters((current) => ({ ...current, datePreset: event.target.value })); setReportPage(1); }}>
              <option value="last_month">Last 1 month</option>
              <option value="last_3_months">Last 3 months</option>
              <option value="last_year">Last 1 year</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          <label className="employee-filter-field">
            <span>Type</span>
            <select className="input" value={filters.type} onChange={(event) => { setFilters((current) => ({ ...current, type: event.target.value })); setReportPage(1); }}>
              <option value="all">All</option>
              <option value="tea">Tea</option>
              <option value="coffee">Coffee</option>
              <option value="snacks">Snacks</option>
              <option value="guest">Guest orders</option>
            </select>
          </label>
          <label className="employee-filter-field employee-filter-search">
            <span>Search</span>
            <div className="employee-filter-input-shell">
              <input className="input" value={filters.search} onChange={(event) => { setFilters((current) => ({ ...current, search: event.target.value })); setReportPage(1); }} placeholder="Employee name or email" />
            </div>
          </label>
          {filters.datePreset === "custom" ? (
            <>
              <label className="employee-filter-field">
                <span>From</span>
                <input className="input" type="date" value={filters.startDate} onChange={(event) => { setFilters((current) => ({ ...current, startDate: event.target.value })); setReportPage(1); }} />
              </label>
              <label className="employee-filter-field">
                <span>To</span>
                <input className="input" type="date" value={filters.endDate} onChange={(event) => { setFilters((current) => ({ ...current, endDate: event.target.value })); setReportPage(1); }} />
              </label>
            </>
          ) : null}
        </div>
      </section>

      <DataTable
        columns={[
          { key: "date", header: "Date" },
          {
            key: "employee_name",
            header: "Employee",
            render: (row) => (
              <div className="fiori-primary-cell">
                <strong>{row.employee_name}</strong>
                <span>{row.employee_email}</span>
              </div>
            ),
          },
          { key: "order_type", header: "Type" },
          { key: "morning", header: "Morning" },
          { key: "evening", header: "Evening" },
          { key: "snacks", header: "Snacks" },
          { key: "guest_count", header: "Guest Count" },
        ]}
        rows={records}
        loading={reportLoading}
        page={reportPage}
        totalPages={reportTotalPages}
        onPageChange={setReportPage}
        emptyTitle="No beverage records match the current filters"
        emptyDescription="Try widening the period, type, or search query."
      />

      {showYearlyCalendar ? (
        <YearlyCalendarModal
          onClose={() => setShowYearlyCalendar(false)}
          blockedDates={blockedDates}
          onBlockDate={onBlockDate}
          onUnblockDate={onUnblockDate}
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
          blockedDates={blockedDates}
          onBlockDate={handleBlockDate}
          onUnblockDate={handleUnblockDate}
          onRefresh={refreshOrders}
          showToast={showToast}
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
