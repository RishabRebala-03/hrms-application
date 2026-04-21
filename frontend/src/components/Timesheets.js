// Timesheets.js — Production-grade, matches the existing codebase architecture
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addDays, parseISO, subMonths,
} from 'date-fns';
import {
  ChevronDown, Plus, Trash2, Coffee, Send, AlertCircle,
  CheckCircle, CheckCircle2, XCircle, Clock, Eye, Search,
  Download, TrendingUp, BarChart3, Building2, UserCheck,
  FileText, Calendar, Users, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API_BASE = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'http://localhost:5000/api';

// ─── Design tokens (matches leave/user colour system exactly) ────────────────
const C = {
  purple:       '#6b5b7a',
  purpleDark:   '#5a4a69',
  purpleLight:  '#f3f0f7',
  purpleBorder: '#c8bfd4',
  purpleMid:    '#8b7a99',
  green:        '#4a7c59',
  greenLight:   '#f0f7f0',
  greenBorder:  '#b8d4bc',
  red:          '#c1666b',
  redLight:     '#fef3f3',
  redBorder:    '#e8c4c6',
  amber:        '#d97706',
  amberLight:   '#fff4e6',
  amberBorder:  '#fcd34d',
  holiday:      '#fef3c7',
  holidayText:  '#92400e',
  text:         '#32363a',
  textMid:      '#6a6d70',
  bg:           '#f8f8f8',
  white:        '#ffffff',
  border:       '#e0e0e0',
  borderLight:  '#f0f0f0',
  rowAlt:       '#fcfcfc',
  headerBg:     '#fafafa',
  totalBg:      '#f9f8fb',
  totalBorder:  '#e0dae6',
};

// ─── Shared style objects ────────────────────────────────────────────────────
const S = {
  page:        { background: C.bg, width: '100%', boxSizing: 'border-box', minWidth: 0 },
  inner:       { padding: '20px 16px' },
  maxW:        { maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' },
  pageHeader:  { marginBottom: '24px' },
  pageTitle:   { fontSize: '28px', fontWeight: '400', color: C.text, margin: '0 0 6px 0' },
  pageSub:     { fontSize: '14px', color: C.textMid, margin: 0 },

  card: {
    background: C.white, borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`,
  },
  cardPad:   { padding: '20px' },
  cardPadSm: { padding: '16px' },

  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statsGrid5: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' },

  statCard: {
    background: C.white, borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`,
    padding: '20px',
  },
  statLabel: { fontSize: '13px', color: C.textMid, margin: '0 0 8px 0', fontWeight: '500' },
  statValue: { fontSize: '30px', fontWeight: '600', color: C.text, margin: '0 0 4px 0' },
  statSub:   { fontSize: '12px', color: C.textMid, margin: 0 },
  statRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },

  row:        { display: 'flex', alignItems: 'center' },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' },
  rowGap4:    { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  rowGap2:    { display: 'flex', alignItems: 'center', gap: '8px' },

  select: {
    appearance: 'none', background: C.white, border: `1px solid ${C.border}`,
    borderRadius: '5px', padding: '8px 36px 8px 12px', fontSize: '14px',
    color: C.text, cursor: 'pointer', outline: 'none',
  },
  selectWrap: { position: 'relative', display: 'inline-block' },
  chevron:    { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.textMid },

  input: {
    border: `1px solid ${C.border}`, borderRadius: '5px',
    padding: '8px 12px', fontSize: '14px', color: C.text, outline: 'none', background: C.white,
  },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMid },

  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: C.purple, color: C.white,
    border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: '500',
    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', background: C.white, color: C.text,
    border: `1px solid #b0b0b0`, borderRadius: '5px', fontSize: '14px',
    fontWeight: '500', cursor: 'pointer',
  },
  btnGreen: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: C.green, color: C.white,
    border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
  },
  btnDisabled: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: '#d1d5db', color: '#9ca3af',
    border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: '500', cursor: 'not-allowed',
  },
  btnIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '6px', background: 'transparent', border: 'none',
    borderRadius: '4px', cursor: 'pointer', color: C.textMid,
  },

  table:    { width: '100%', borderCollapse: 'collapse' },
  thead:    { background: C.headerBg, borderBottom: `1px solid ${C.border}` },
  th:       { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: C.text, whiteSpace: 'nowrap' },
  thRight:  { padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: C.text },
  thCenter: { padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: C.text },
  td:       { padding: '14px 16px', fontSize: '14px', color: C.text, borderBottom: `1px solid ${C.borderLight}` },
  tdMid:    { padding: '14px 16px', fontSize: '14px', color: C.textMid, borderBottom: `1px solid ${C.borderLight}` },
  tdRight:  { padding: '14px 16px', fontSize: '14px', color: C.text, textAlign: 'right', borderBottom: `1px solid ${C.borderLight}` },
  tdCenter: { padding: '14px 16px', textAlign: 'center', borderBottom: `1px solid ${C.borderLight}` },
  trEven:   { background: C.white },
  trOdd:    { background: C.rowAlt },

  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
    fontWeight: '500', border: '1px solid',
  },
  tag: {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
  },

  infoBox: {
    padding: '14px 16px', borderRadius: '6px',
    border: `1px solid ${C.totalBorder}`, background: C.totalBg, marginTop: '20px',
  },
  infoTitle: { fontSize: '13px', fontWeight: '600', color: C.purple, margin: '0 0 8px 0' },
  infoList:  { listStyle: 'none', margin: 0, padding: 0 },
  infoItem:  { fontSize: '13px', color: C.textMid, marginBottom: '4px' },

  tableScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
};

// ─── fetchAPI ────────────────────────────────────────────────────────────────
const fetchAPI = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    let errMsg = 'API request failed';
    try { const e = await response.json(); errMsg = e.error || errMsg; } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
};

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_STYLES = {
  draft:               { bg: '#f9fafb', color: '#6b7280', border: '#d1d5db' },
  pending_lead:        { bg: C.purpleLight, color: C.purple, border: C.purpleBorder },
  pending_manager:     { bg: C.amberLight,  color: C.amber,  border: C.amberBorder  },
  approved:            { bg: C.greenLight,  color: C.green,  border: C.greenBorder  },
  rejected_by_lead:    { bg: C.redLight,    color: C.red,    border: C.redBorder    },
  rejected_by_manager: { bg: C.redLight,    color: C.red,    border: C.redBorder    },
};
const STATUS_LABELS = {
  draft:               'Draft',
  pending_lead:        'Pending Approval',
  pending_manager:     'Pending Manager',
  approved:            'Approved',
  rejected_by_lead:    'Rejected',
  rejected_by_manager: 'Rejected by Manager',
};

// ─── Shared components ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const st = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span style={{ ...S.badge, background: st.bg, color: st.color, borderColor: st.border }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function SelectWrap({ value, onChange, children, style = {} }) {
  return (
    <div style={{ ...S.selectWrap, ...style }}>
      <select value={value} onChange={onChange} style={S.select}>{children}</select>
      <ChevronDown size={14} style={S.chevron} />
    </div>
  );
}

function ChargeCodeSelector({ chargeCodes, selectedId, onChange, disabled }) {
  return (
    <div style={S.selectWrap}>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...S.select, width: '100%',
          opacity: disabled ? 0.5 : 1,
          cursor:  disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="">Select charge code</option>
        {chargeCodes.map((cc) => (
          <option key={cc._id} value={cc.charge_code_id}>
            {cc.charge_code} – {cc.charge_code_name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} style={S.chevron} />
    </div>
  );
}

// ─── TimesheetTabBar ──────────────────────────────────────────────────────────
function TimesheetTabBar({ activeTab, setActiveTab, user }) {
  const role = user?.role || 'Employee';
  const tabs = role === 'Admin'
    ? [
        { key: 'all_timesheets', label: 'All Timesheets', Icon: Building2  },
        { key: 'approvals',      label: 'Approvals',       Icon: CheckCircle },
        { key: 'charge_codes',   label: 'Charge Codes',    Icon: FileText   },
      ]
    : [
        { key: 'timesheet',      label: 'My Timesheet',    Icon: FileText  },
        ...(user?.reportsTo || role === 'Manager'
          ? [{ key: 'team_timesheets', label: 'Team Timesheets', Icon: Users }]
          : []),
        { key: 'approvals',      label: 'Approvals',       Icon: CheckCircle },
        { key: 'history',        label: 'History',          Icon: Clock      },
        { key: 'reports',        label: 'Reports',          Icon: BarChart3  },
      ];

  return (
    <div style={{
      background: C.headerBg, borderBottom: `1px solid ${C.border}`,
      padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      width: '100%', boxSizing: 'border-box',
    }}>
      <nav style={{ display: 'flex', gap: '4px', minWidth: 'max-content' }}>
        {tabs.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '12px 16px', background: 'none', border: 'none',
                borderBottom: active ? `2px solid ${C.purple}` : '2px solid transparent',
                color: active ? C.purple : C.textMid,
                fontSize: '14px', fontWeight: active ? '600' : '400',
                cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />{label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── TimesheetGrid ────────────────────────────────────────────────────────────
function TimesheetGrid({
  dates, rows, chargeCodes, onRowUpdate, onRowAdd, onRowDelete,
  readOnly = false, approvedLeaves = [], holidays = [],
}) {
  const getEntry = (row, dateStr) =>
    row.entries.find((e) => e.date === dateStr) || { date: dateStr, hours: 0, entry_type: 'work' };

  const isHoliday = (d) => holidays.some((h) => h.date === d);

  const numericVal = (e) => {
    const v = e.value !== undefined ? e.value : String(e.hours ?? '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const getColTotal = (dateStr) =>
    rows.reduce((s, row) => s + numericVal(getEntry(row, dateStr)), 0);

  const getRowTotal = (row) =>
    row.entries.reduce((s, e) => s + numericVal(e), 0);

  const thStyle = (isHol) => ({
    padding: '10px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600',
    minWidth: '90px', borderLeft: `1px solid ${C.borderLight}`,
    background: isHol ? C.holiday : C.headerBg,
    color:      isHol ? C.holidayText : C.text,
    position: 'relative', zIndex: 1,
  });

  const stickyThStyle = {
    padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600',
    color: C.text,
    position: 'sticky', left: 0,
    background: C.headerBg,
    zIndex: 20,
    minWidth: '260px',
    boxShadow: '2px 0 4px rgba(0,0,0,0.06)',
  };

  return (
    <div style={{ ...S.card, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
        <table style={{ ...S.table, minWidth: 'max-content' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.headerBg }}>
              <th style={stickyThStyle}>Charge Code</th>

              {dates.map((d) => {
                const isHol = isHoliday(d);
                return (
                  <th key={d} style={thStyle(isHol)}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: isHol ? C.holidayText : C.textMid }}>
                        {format(parseISO(d), 'EEE')}
                      </span>
                      <span>{format(parseISO(d), 'MMM d')}</span>
                      {isHol && <span style={{ fontSize: '10px' }}>🎉</span>}
                    </div>
                  </th>
                );
              })}

              <th style={{
                padding: '12px 16px', textAlign: 'center', fontSize: '13px',
                fontWeight: '600', color: C.purple, background: C.totalBg,
                minWidth: '80px', borderLeft: `1px solid ${C.border}`,
                position: 'relative', zIndex: 1,
              }}>
                Total
              </th>
              {!readOnly && (
                <th style={{
                  padding: '12px', background: C.headerBg,
                  position: 'sticky', right: 0, zIndex: 15,
                  borderLeft: `1px solid ${C.borderLight}`, width: '50px',
                  boxShadow: '-2px 0 4px rgba(0,0,0,0.04)',
                }} />
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, ri) => {
              const rowBg = ri % 2 === 0 ? C.white : C.rowAlt;

              return (
                <tr
                  key={row.id}
                  style={{ background: rowBg, borderBottom: `1px solid ${C.borderLight}` }}
                >
                  <td style={{
                    padding: '10px 16px',
                    position: 'sticky', left: 0,
                    background: rowBg,
                    zIndex: 10,
                    borderRight: `1px solid ${C.borderLight}`,
                    boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                  }}>
                    <ChargeCodeSelector
                      chargeCodes={chargeCodes}
                      selectedId={row.chargeCodeId}
                      onChange={(id) => onRowUpdate(row.id, { chargeCodeId: id })}
                      disabled={readOnly}
                    />
                  </td>

                  {dates.map((d) => {
                    const isHol = isHoliday(d);
                    const entry = getEntry(row, d);
                    return (
                      <td key={d} style={{
                        padding: '8px', textAlign: 'center',
                        borderLeft: `1px solid ${C.borderLight}`,
                        background: isHol ? '#fffbeb' : 'transparent',
                      }}>
                        <input
                          type="text"
                          value={entry.value ?? ''}
                          disabled={readOnly}
                          onChange={(e) =>
                            onRowUpdate(row.id, {
                              entries: row.entries.map((ent) =>
                                ent.date === d
                                  ? { ...ent, value: e.target.value, hours: parseFloat(e.target.value) || 0, entry_type: 'work' }
                                  : ent
                              ),
                            })
                          }
                          style={{
                            width: '52px', padding: '4px 6px',
                            border: `1px solid ${isHol ? '#e5c84a' : C.border}`, borderRadius: '4px',
                            textAlign: 'center', fontSize: '13px', outline: 'none',
                            background: readOnly ? C.headerBg : isHol ? '#fffde7' : C.white,
                            color: C.text,
                          }}
                        />
                      </td>
                    );
                  })}

                  <td style={{
                    padding: '10px 16px', textAlign: 'center', fontWeight: '600',
                    background: C.totalBg, borderLeft: `1px solid ${C.border}`, color: C.purple,
                  }}>
                    {getRowTotal(row)}h
                  </td>

                  {!readOnly && (
                    <td style={{
                      padding: '10px', textAlign: 'center',
                      position: 'sticky', right: 0,
                      background: rowBg,
                      zIndex: 10,
                      borderLeft: `1px solid ${C.borderLight}`,
                      boxShadow: '-2px 0 4px rgba(0,0,0,0.04)',
                    }}>
                      <button onClick={() => onRowDelete(row.id)} style={{ ...S.btnIcon, color: C.red }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            <tr style={{ background: C.totalBg, borderTop: `2px solid ${C.totalBorder}` }}>
              <td style={{
                padding: '10px 16px', fontWeight: '600', color: C.purple,
                position: 'sticky', left: 0,
                background: C.totalBg,
                zIndex: 10,
                boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
              }}>
                Daily Total
              </td>
              {dates.map((d) => (
                <td key={d} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: C.purple, borderLeft: `1px solid ${C.borderLight}` }}>
                  {getColTotal(d)}h
                </td>
              ))}
              <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '700', background: C.purpleLight, color: C.purple, borderLeft: `1px solid ${C.totalBorder}` }}>
                {dates.reduce((s, d) => s + getColTotal(d), 0)}h
              </td>
              {!readOnly && (
                <td style={{
                  borderLeft: `1px solid ${C.borderLight}`,
                  position: 'sticky', right: 0,
                  background: C.totalBg,
                  zIndex: 10,
                }} />
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.headerBg }}>
          <button onClick={onRowAdd} style={S.btnSecondary}>
            <Plus size={14} /> Add Charge Code
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TimesheetPage (Employee) ─────────────────────────────────────────────────
function TimesheetPage({ user }) {
  const currentDate = new Date();

  const buildAvailablePeriods = () => {
    const today = new Date();
    const periods = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(2026, month, 1);
      if (monthStart > today) continue;
      const lastDay = endOfMonth(monthStart).getDate();
      periods.push({
        value: `2026-${String(month + 1).padStart(2, '0')}-1st`,
        label: `${format(monthStart, 'MMMM yyyy')} – 1st Half (1–15)`,
        start: format(monthStart, 'yyyy-MM-dd'),
        end:   format(new Date(2026, month, 15), 'yyyy-MM-dd'),
      });
      const sixteenth = new Date(2026, month, 16);
      if (sixteenth <= today) {
        periods.push({
          value: `2026-${String(month + 1).padStart(2, '0')}-2nd`,
          label: `${format(monthStart, 'MMMM yyyy')} – 2nd Half (16–${lastDay})`,
          start: format(sixteenth, 'yyyy-MM-dd'),
          end:   format(endOfMonth(monthStart), 'yyyy-MM-dd'),
        });
      }
    }
    return periods.reverse();
  };

  const availablePeriods = useMemo(() => buildAvailablePeriods(), []);
  const [selectedPeriod, setSelectedPeriod]     = useState(availablePeriods[0]?.value || '');
  const [timesheetStatus, setTimesheetStatus]   = useState('draft');
  const [rows, setRows]                         = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [chargeCodes, setChargeCodes]           = useState([]);
  const [approvedLeaves, setApprovedLeaves]     = useState([]);
  const [holidays, setHolidays]                 = useState([]);
  const [loading, setLoading]                   = useState(false);
  // FIX 2: reload trigger — incrementing forces the timesheet data useEffect to re-run
  const [reloadTrigger, setReloadTrigger]       = useState(0);

  const userId = user?._id || user?.id;

  const dates = useMemo(() => {
    const period = availablePeriods.find((p) => p.value === selectedPeriod);
    if (!period) return [];
    return eachDayOfInterval({
      start: parseISO(period.start),
      end:   parseISO(period.end),
    }).map((d) => format(d, 'yyyy-MM-dd'));
  }, [selectedPeriod, availablePeriods]);

  useEffect(() => {
    if (!userId) return;

    fetchAPI(`/charge_codes/employee/${userId}?active_only=true`)
      .then((data) => setChargeCodes(Array.isArray(data) ? data : []))
      .catch((err) => { console.error('Charge codes error:', err); setChargeCodes([]); });

    fetchAPI(`/leaves/history/${userId}`)
      .then((d) => setApprovedLeaves(Array.isArray(d) ? d.filter((l) => l.status === 'Approved') : []))
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!dates.length) return;
    fetchAPI('/timesheets/populate_holidays', {
      method: 'POST',
      body: JSON.stringify({ period_start: dates[0], period_end: dates[dates.length - 1] }),
    })
      .then((d) => setHolidays(d.holidays || []))
      .catch(console.error);
  }, [dates]);

  // FIX 2: Added reloadTrigger to deps so this re-runs after recall/submit
  useEffect(() => {
    if (!userId || !dates.length || !chargeCodes.length) return;

    fetchAPI(`/timesheets/employee/${userId}`)
      .then((existing) => {
        const match = Array.isArray(existing)
          ? existing.find((ts) =>
              ts.period_start === dates[0] &&
              ts.period_end   === dates[dates.length - 1]
            )
          : null;

        if (match) {
          setTimesheetStatus(match.status || 'draft');

          // FIX 3: Build ccMap keyed by charge_code_id (or charge_code as fallback)
          // Store the full label (code + name) alongside entries
          const ccMap = {};
          (match.entries || []).forEach((e) => {
            if (!e.charge_code_id && !e.charge_code) return;
            // Use charge_code_id as the stable key to match against chargeCodes dropdown
            const ccId = e.charge_code_id || e.charge_code || '';
            if (!ccMap[ccId]) ccMap[ccId] = {};
            ccMap[ccId][e.date] = e;
          });

          const loadedRows = Object.entries(ccMap).map(([ccId, byDate], i) => {
            // Try to find the matching charge code in our loaded list to get the proper id
            // The chargeCodeId stored in the entry may be the ObjectId string
            const matchingCC = chargeCodes.find(
              (cc) => cc.charge_code_id === ccId || cc.charge_code === ccId
            );
            return {
              id: `loaded-${i}`,
              // Use the charge_code_id that matches the dropdown's option values
              chargeCodeId: matchingCC ? matchingCC.charge_code_id : ccId,
              entries: dates.map((d) => byDate[d]
                // FIX 3: Use hours as the display value, not description
                ? { date: d, hours: byDate[d].hours || 0, value: String(byDate[d].hours || ''), entry_type: 'work' }
                : { date: d, hours: 0, value: '', entry_type: 'work' }
              ),
            };
          });

          if (loadedRows.length === 0) {
            setRows([{ id: 'row1', chargeCodeId: '', entries: dates.map((d) => ({ date: d, hours: 0, value: '', entry_type: 'work' })) }]);
          } else {
            setRows(loadedRows);
          }
        } else {
          setTimesheetStatus('draft');
          setRows([{ id: 'row1', chargeCodeId: '', entries: dates.map((d) => ({ date: d, hours: 0, value: '', entry_type: 'work' })) }]);
        }
      })
      .catch(() => {
        setRows([{ id: 'row1', chargeCodeId: '', entries: dates.map((d) => ({ date: d, hours: 0, value: '', entry_type: 'work' })) }]);
      });
  }, [userId, dates, chargeCodes, reloadTrigger]); // FIX 2: reloadTrigger added

  const validate = useCallback(() => {
    const errors = [];
    if (rows.length === 0)           errors.push('Add at least one charge code row');
    if (rows.some((r) => !r.chargeCodeId)) errors.push(`${rows.filter((r) => !r.chargeCodeId).length} row(s) missing a charge code`);
    if (rows.every((r) => r.entries.every((e) => !e.hours || e.hours === 0)))
      errors.push('Enter hours for at least one row');
    return errors;
  }, [rows]);

  useEffect(() => { setValidationErrors(validate()); }, [rows, validate]);

  const getTotalHours = () =>
    rows.reduce((t, row) =>
      t + row.entries.reduce((s, e) => {
        const v = e.value !== undefined ? e.value : String(e.hours ?? '');
        const n = parseFloat(v);
        return s + (isNaN(n) ? 0 : n);
      }, 0), 0);

  // FIX 2: handleRecall now triggers a full reload via reloadTrigger
  const handleRecall = async () => {
    setLoading(true);
    try {
      const existing = await fetchAPI(`/timesheets/employee/${userId}`);
      const match = Array.isArray(existing)
        ? existing.find((ts) =>
            ts.period_start === dates[0] &&
            ts.period_end   === dates[dates.length - 1]
          )
        : null;

      if (match) {
        await fetchAPI(`/timesheets/recall/${match._id || match.id}`, { method: 'PUT' });
      }
      // FIX 2: increment trigger so the data useEffect re-fetches fresh rows
      setReloadTrigger((t) => t + 1);
    } catch (err) {
      // Even on error, reset to draft and reload
      setTimesheetStatus('draft');
      setReloadTrigger((t) => t + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (errors.length) { alert('Please fix:\n\n' + errors.join('\n')); return; }
    setLoading(true);
    try {
      const entries = [];
      rows.forEach((row) => {
        if (!row.chargeCodeId) return;
        row.entries.forEach((e) => {
          const rawVal = e.value !== undefined ? e.value : String(e.hours || '');
          const numHrs = parseFloat(rawVal);
          if (rawVal && rawVal.trim() !== '' && rawVal.trim() !== '0') {
            entries.push({
              date:           e.date,
              entry_type:     'work',
              charge_code_id: row.chargeCodeId,
              hours:          isNaN(numHrs) ? 0 : numHrs,
              description:    isNaN(numHrs) ? rawVal : '',
            });
          }
        });
      });

      let existingId = null;
      try {
        const existing = await fetchAPI(`/timesheets/employee/${userId}`);
        const match = Array.isArray(existing)
          ? existing.find((ts) =>
              ts.period_start === dates[0] &&
              ts.period_end   === dates[dates.length - 1]
            )
          : null;
        existingId = match ? (match._id || match.id) : null;
      } catch (_) {}

      if (existingId) {
        await fetchAPI(`/timesheets/update/${existingId}`, {
          method: 'PUT',
          body: JSON.stringify({ entries }),
        });
        await fetchAPI(`/timesheets/submit/${existingId}`, { method: 'PUT' });
      } else {
        await fetchAPI('/timesheets/create', {
          method: 'POST',
          body: JSON.stringify({
            employee_id:  userId,
            period_start: dates[0],
            period_end:   dates[dates.length - 1],
            entries,
          }),
        });
      }
      // FIX 2: reload after submit so lead sees fresh data and employee sees correct state
      setReloadTrigger((t) => t + 1);
      alert('Timesheet submitted successfully!');
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly   = ['approved', 'pending_lead'].includes(timesheetStatus);
  const canSubmit    = timesheetStatus === 'draft' || timesheetStatus.startsWith('rejected');
  const errors       = validationErrors;

  const statusMessage = () => {
    const isPending  = timesheetStatus === 'pending_lead';
    const isApproved = timesheetStatus === 'approved';
    const isRejected = timesheetStatus.startsWith('rejected');
    const isLegacyPending = timesheetStatus === 'pending_manager';
    if (!isPending && !isApproved && !isRejected && !isLegacyPending) return null;

    const bg    = (isPending || isLegacyPending) ? C.purpleLight : isApproved ? C.greenLight : C.redLight;
    const brd   = (isPending || isLegacyPending) ? C.purpleBorder : isApproved ? C.greenBorder : C.redBorder;
    const color = (isPending || isLegacyPending) ? C.purple : isApproved ? C.green : C.red;

    const msg = isPending
      ? (<><strong>Pending Approval:</strong> Your timesheet is awaiting review from your reporting lead.</>)
      : isLegacyPending
      ? (<><strong>Pending Manager Approval:</strong> Awaiting final manager sign-off.</>)
      : isApproved
      ? (<><strong>Approved:</strong> This timesheet is permanently locked. Contact your lead for corrections.</>)
      : (<><strong>Rejected:</strong> Review the feedback, make corrections, and resubmit.</>);

    return (
      <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', background: bg, border: `1px solid ${brd}`, color }}>
        {msg}
      </div>
    );
  };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>My Timesheet</h1>
            <p style={S.pageSub}>Track and submit your hours by fortnight period</p>
          </div>

          <div style={{ ...S.card, marginBottom: '20px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px 10px 16px',
              borderBottom: `1px solid ${C.borderLight}`,
              flexWrap: 'wrap',
            }}>
              <SelectWrap
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setTimesheetStatus('draft');
                }}
              >
                {availablePeriods.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </SelectWrap>
              <StatusBadge status={timesheetStatus} />
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 16px 14px 16px',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '13px', color: C.textMid }}>
                Total hours: <strong style={{ color: C.text }}>{getTotalHours()}h</strong>
              </span>
              {canSubmit && (
                <button
                  onClick={handleSubmit}
                  disabled={errors.length > 0 || loading}
                  style={errors.length > 0 || loading ? S.btnDisabled : S.btnPrimary}
                >
                  <Send size={14} />{loading ? 'Submitting…' : 'Submit Timesheet'}
                </button>
              )}
              {timesheetStatus === 'pending_lead' && (
                <button
                  onClick={handleRecall}
                  disabled={loading}
                  style={loading ? S.btnDisabled : { ...S.btnPrimary, background: '#ea580c' }}
                >
                  Edit Timesheet
                </button>
              )}
            </div>
          </div>

          {canSubmit && errors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fca5a5', background: '#fef2f2' }}>
              <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', margin: '0 0 6px 0' }}>
                  Fix the following before submitting:
                </p>
                {errors.map((e, i) => (
                  <p key={i} style={{ fontSize: '13px', color: '#b91c1c', margin: '0 0 2px 0' }}>• {e}</p>
                ))}
              </div>
            </div>
          )}

          {statusMessage()}

          <TimesheetGrid
            dates={dates}
            rows={rows}
            chargeCodes={chargeCodes}
            onRowUpdate={(id, u) => setRows((p) => p.map((r) => r.id === id ? { ...r, ...u } : r))}
            onRowAdd={() => setRows((p) => [...p, {
              id: `row${Date.now()}`,
              chargeCodeId: '',
              entries: dates.map((d) => ({ date: d, hours: 0, value: '', entry_type: 'work' })),
            }])}
            onRowDelete={(id) => setRows((p) => p.filter((r) => r.id !== id))}
            readOnly={isReadOnly}
            approvedLeaves={approvedLeaves}
            holidays={holidays}
          />

          <div style={S.infoBox}>
            <p style={S.infoTitle}>How it works</p>
            <ul style={S.infoList}>
              {[
                'Select a charge code for each row (only your assigned codes appear here)',
                'Enter hours worked per day in 0.5h increments',
                'For leave days (SL, CL, PL), add the leave charge code as a row and enter hours as normal',
                'Public holidays are highlighted automatically — no hours needed',
                'Your reporting lead is the sole approver — use "Edit Timesheet" to recall while pending',
              ].map((t, i) => <li key={i} style={S.infoItem}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── useCcLookup — shared hook ────────────────────────────────────────────────
// Fetches all charge codes once and returns a lookup keyed by both ObjectId
// string and code string. Used by every component that renders timesheets so
// old DB records missing charge_code_name still display correctly.
function useCcLookup() {
  const [ccLookup, setCcLookup] = useState({});
  useEffect(() => {
    fetchAPI('/charge_codes/all')
      .then((codes) => {
        if (!Array.isArray(codes)) return;
        const lookup = {};
        codes.forEach((c) => {
          if (c._id)  lookup[c._id]  = { code: c.code, name: c.name };
          if (c.code) lookup[c.code] = { code: c.code, name: c.name };
        });
        setCcLookup(lookup);
      })
      .catch(console.error);
  }, []);
  return ccLookup;
}

// ─── csvRow — safe CSV cell escaping ─────────────────────────────────────────
// Wraps a value in quotes and escapes inner quotes so commas/newlines in
// charge code names don't corrupt the CSV.
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}
function buildCsvRow(cols) { return cols.map(csvCell).join(','); }

// ─── buildChargeCodeMap ───────────────────────────────────────────────────────
// Shared helper for TimesheetDetailModal and TimesheetFullPageView.
// ccLookup: optional object keyed by charge_code_id → { code, name } for
// enriching old DB records that were saved before charge_code_name was stored.
function buildChargeCodeMap(entries, ccLookup = {}) {
  const chargeCodeMap = {};
  const holidaysByDate = {};

  (entries || []).forEach((e) => {
    if (e.entry_type === 'holiday') {
      holidaysByDate[e.date] = e;
      return;
    }
    const key = e.charge_code_id || e.charge_code || 'unknown';

    // Prefer fields stored on the entry; fall back to ccLookup for old records
    const looked = ccLookup[key] || ccLookup[e.charge_code_id] || ccLookup[e.charge_code] || {};
    const code  = e.charge_code      || looked.code || '';
    const cname = e.charge_code_name || looked.name || '';
    const label = [code, cname].filter((v) => v && v.trim() !== '').join(' – ') || 'Unknown';

    if (!chargeCodeMap[key]) {
      chargeCodeMap[key] = { label, byDate: {} };
    }
    chargeCodeMap[key].byDate[e.date] = e;
  });

  return { chargeCodeMap, holidaysByDate };
}

// ─── TimesheetDetailModal ─────────────────────────────────────────────────────
function TimesheetDetailModal({ timesheet, onClose, ccLookup = {} }) {
  if (!timesheet) return null;

  const period = timesheet.period_start && timesheet.period_end
    ? `${format(new Date(timesheet.period_start), 'MMM d')} – ${format(new Date(timesheet.period_end), 'MMM d, yyyy')}`
    : '—';

  const allDates = (() => {
    if (!timesheet.period_start || !timesheet.period_end) return [];
    const start = parseISO(timesheet.period_start);
    const end   = parseISO(timesheet.period_end);
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
  })();

  const { chargeCodeMap, holidaysByDate } = buildChargeCodeMap(timesheet.entries, ccLookup);
  const chargeCodeRows = Object.entries(chargeCodeMap);

  const getDateTotal = (date) =>
    chargeCodeRows.reduce((s, [, cc]) => s + (cc.byDate[date]?.hours || 0), 0);

  const grandTotal = allDates.reduce((s, d) => s + getDateTotal(d), 0);

  const stickyLeft = {
    position: 'sticky', left: 0, zIndex: 10,
    boxShadow: '2px 0 4px rgba(0,0,0,0.06)',
  };

  const thDate = (date) => {
    const isHol = !!holidaysByDate[date];
    const isWkd = ['Sat', 'Sun'].includes(format(parseISO(date), 'EEE'));
    return {
      padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: '600',
      minWidth: '72px', maxWidth: '72px', whiteSpace: 'nowrap',
      borderLeft: `1px solid ${C.borderLight}`,
      background: isHol ? C.holiday : isWkd ? '#f5f5f5' : C.headerBg,
      color:      isHol ? C.holidayText : isWkd ? C.textMid : C.text,
      position: 'sticky', top: 0, zIndex: 2,
    };
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.white, borderRadius: '8px',
          width: '100%', maxWidth: '1100px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          background: C.headerBg, flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: C.text }}>
              {timesheet.employee_name}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: C.textMid }}>
              {timesheet.employee_email}
              <span style={{ margin: '0 8px', color: C.borderLight }}>|</span>
              Period: <strong style={{ color: C.text }}>{period}</strong>
              <span style={{ margin: '0 8px', color: C.borderLight }}>|</span>
              Total: <strong style={{ color: C.purple }}>{grandTotal}h</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <StatusBadge status={timesheet.status} />
            <button
              onClick={onClose}
              style={{
                background: 'none', border: `1px solid ${C.border}`, borderRadius: '5px',
                padding: '5px 10px', cursor: 'pointer', fontSize: '18px',
                color: C.textMid, lineHeight: 1,
              }}
            >×</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, position: 'relative' }}>
          {allDates.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: C.textMid }}>
              No date range available for this timesheet.
            </div>
          ) : (
            <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
              <thead>
                <tr style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{
                    ...stickyLeft,
                    padding: '12px 16px', textAlign: 'left', fontSize: '13px',
                    fontWeight: '600', color: C.text, background: C.headerBg,
                    minWidth: '220px', zIndex: 11,
                    borderRight: `1px solid ${C.borderLight}`,
                  }}>
                    Charge Code
                  </th>
                  {allDates.map((date) => {
                    const isHol = !!holidaysByDate[date];
                    const dow   = format(parseISO(date), 'EEE');
                    const isWkd = ['Sat', 'Sun'].includes(dow);
                    return (
                      <th key={date} style={thDate(date)}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                          <span style={{ fontSize: '10px', color: isHol ? C.holidayText : isWkd ? C.textMid : C.textMid, fontWeight: '400' }}>{dow}</span>
                          <span>{format(parseISO(date), 'MMM d')}</span>
                          {isHol && <span style={{ fontSize: '9px' }}>🎉</span>}
                        </div>
                      </th>
                    );
                  })}
                  <th style={{
                    padding: '12px 10px', textAlign: 'center', fontSize: '12px',
                    fontWeight: '600', color: C.purple, background: C.totalBg,
                    minWidth: '68px', borderLeft: `1px solid ${C.border}`,
                    position: 'sticky', top: 0, zIndex: 2,
                  }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {chargeCodeRows.length === 0 ? (
                  <tr>
                    <td colSpan={allDates.length + 2} style={{ padding: '32px', textAlign: 'center', color: C.textMid }}>
                      No entries recorded.
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* FIX 1: use cc.label instead of the raw key */}
                    {chargeCodeRows.map(([key, cc], ri) => {
                      const rowTotal = allDates.reduce((s, d) => s + (cc.byDate[d]?.hours || 0), 0);
                      const rowBg    = ri % 2 === 0 ? C.white : C.rowAlt;
                      return (
                        <tr key={key} style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBg }}>
                          <td style={{
                            ...stickyLeft, padding: '10px 16px',
                            fontSize: '13px', fontWeight: '500', color: C.purple,
                            background: rowBg, borderRight: `1px solid ${C.borderLight}`,
                          }}>
                            {cc.label}
                          </td>
                          {allDates.map((date) => {
                            const entry = cc.byDate[date];
                            const isHol = !!holidaysByDate[date];
                            return (
                              <td key={date} style={{
                                padding: '10px 4px', textAlign: 'center',
                                borderLeft: `1px solid ${C.borderLight}`,
                                fontSize: '13px',
                                background: isHol ? '#fffbeb' : 'transparent',
                              }}>
                                {entry && entry.hours > 0
                                  ? <strong style={{ color: C.text }}>{entry.hours}h</strong>
                                  : <span style={{ color: C.borderLight }}>—</span>}
                              </td>
                            );
                          })}
                          <td style={{
                            padding: '10px 10px', textAlign: 'center', fontWeight: '700',
                            background: C.totalBg, borderLeft: `1px solid ${C.border}`,
                            color: C.purple, fontSize: '13px',
                          }}>
                            {rowTotal}h
                          </td>
                        </tr>
                      );
                    })}

                    <tr style={{ background: C.totalBg, borderTop: `2px solid ${C.totalBorder}` }}>
                      <td style={{
                        ...stickyLeft, padding: '10px 16px',
                        fontWeight: '600', color: C.purple, fontSize: '13px',
                        background: C.totalBg, borderRight: `1px solid ${C.borderLight}`,
                      }}>
                        Daily Total
                      </td>
                      {allDates.map((date) => (
                        <td key={date} style={{
                          padding: '10px 4px', textAlign: 'center',
                          fontWeight: '700', color: C.purple, fontSize: '13px',
                          borderLeft: `1px solid ${C.borderLight}`,
                        }}>
                          {getDateTotal(date) > 0 ? `${getDateTotal(date)}h` : <span style={{ color: C.textMid, fontWeight: '400' }}>—</span>}
                        </td>
                      ))}
                      <td style={{
                        padding: '10px 10px', textAlign: 'center', fontWeight: '700',
                        background: C.purpleLight, color: C.purple, fontSize: '14px',
                        borderLeft: `1px solid ${C.totalBorder}`,
                      }}>
                        {grandTotal}h
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>

        {timesheet.approval_history && timesheet.approval_history.length > 0 && (
          <div style={{
            padding: '12px 24px', borderTop: `1px solid ${C.border}`,
            background: C.headerBg, flexShrink: 0,
          }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '600', color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Approval History
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {timesheet.approval_history.map((h, i) => (
                <div key={i} style={{ fontSize: '12px', color: C.textMid }}>
                  <span style={{ fontWeight: '600', color: h.action === 'approved' ? C.green : C.red }}>
                    {h.stage === 'lead' ? 'Lead' : 'Manager'} {h.action}
                  </span>
                  {' by '}{h.approver_name}
                  {h.timestamp && ` · ${format(new Date(h.timestamp), 'MMM d, yyyy')}`}
                  {h.comments && ` — "${h.comments}"`}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'flex-end', background: C.white, flexShrink: 0,
        }}>
          <button onClick={onClose} style={S.btnSecondary}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── TimesheetFullPageView ────────────────────────────────────────────────────
function TimesheetFullPageView({ timesheet, onClose, onApprove, onReject, user, onNavigate, ccLookup = {} }) {
  if (!timesheet) return null;

  const role = user?.role;
  const isPending  = timesheet.status === 'pending_lead';
  const isApprover = role === 'Lead';
  const canAction  = isApprover && onApprove && isPending;

  const period = timesheet.period_start && timesheet.period_end
    ? `${format(new Date(timesheet.period_start), 'MMM d')} – ${format(new Date(timesheet.period_end), 'MMM d, yyyy')}`
    : '—';

  const isLegacyManagerPending = role === 'Manager' && timesheet.status === 'pending_manager' && onApprove;

  const allDates = (() => {
    if (!timesheet.period_start || !timesheet.period_end) return [];
    return eachDayOfInterval({
      start: parseISO(timesheet.period_start),
      end:   parseISO(timesheet.period_end),
    }).map((d) => format(d, 'yyyy-MM-dd'));
  })();

  // use shared helper with ccLookup for old records missing charge_code_name
  const { chargeCodeMap, holidaysByDate } = buildChargeCodeMap(timesheet.entries, ccLookup);
  const chargeCodeRows = Object.entries(chargeCodeMap);

  const getDateTotal = (date) =>
    chargeCodeRows.reduce((s, [, cc]) => s + (cc.byDate[date]?.hours || 0), 0);
  const grandTotal = allDates.reduce((s, d) => s + getDateTotal(d), 0);

  const stickyLeft = {
    position: 'sticky', left: 0, zIndex: 10,
    boxShadow: '2px 0 4px rgba(0,0,0,0.06)',
  };

  const showActionButtons = canAction || isLegacyManagerPending;

  return (
    <div style={{ ...S.page, minHeight: '100vh' }}>
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onClose} style={S.btnSecondary}>
            {onApprove ? '← Back to Approvals' : '← Back to History'}
          </button>
          <div>
            <span style={{ fontSize: '16px', fontWeight: '600', color: C.text }}>
              {timesheet.employee_name}
            </span>
            <span style={{ fontSize: '13px', color: C.textMid, marginLeft: '10px' }}>
              {timesheet.employee_email}
            </span>
          </div>
          <StatusBadge status={timesheet.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: C.textMid }}>
            Period: <strong style={{ color: C.text }}>{period}</strong>
          </span>
          <span style={{ fontSize: '13px', color: C.textMid }}>
            Total: <strong style={{ color: C.purple }}>{grandTotal}h</strong>
          </span>
          {showActionButtons && (
            <>
              <button onClick={onApprove} style={{ ...S.btnGreen, padding: '7px 16px' }}>
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={onReject} style={{ ...S.btnPrimary, background: C.red, padding: '7px 16px' }}>
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          {onNavigate && (timesheet.status === 'draft' || timesheet.status?.startsWith('rejected')) && (
            <button
              onClick={() => { onClose(); onNavigate('timesheet'); }}
              style={{ ...S.btnPrimary, padding: '7px 16px' }}
            >
              ✏️ Edit Timesheet
            </button>
          )}
        </div>
      </div>

      <div style={S.inner}>
        <div style={S.maxW}>
          {timesheet.status?.startsWith('rejected') && timesheet.rejection_reason && (
            <div style={{
              padding: '12px 16px', borderRadius: '6px', marginBottom: '16px',
              background: C.redLight, border: `1px solid ${C.redBorder}`,
              fontSize: '13px', color: C.red,
            }}>
              <strong>Rejection reason:</strong> {timesheet.rejection_reason}
            </div>
          )}

          <div style={{ ...S.card, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
                <thead>
                  <tr style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{
                      ...stickyLeft, padding: '12px 16px', textAlign: 'left',
                      fontSize: '13px', fontWeight: '600', color: C.text,
                      background: C.headerBg, minWidth: '220px', zIndex: 11,
                      borderRight: `1px solid ${C.borderLight}`,
                    }}>
                      Charge Code
                    </th>
                    {allDates.map((date) => {
                      const isHol = !!holidaysByDate[date];
                      const dow   = format(parseISO(date), 'EEE');
                      const isWkd = ['Sat', 'Sun'].includes(dow);
                      return (
                        <th key={date} style={{
                          padding: '8px 6px', textAlign: 'center', fontSize: '11px',
                          fontWeight: '600', minWidth: '72px', whiteSpace: 'nowrap',
                          borderLeft: `1px solid ${C.borderLight}`,
                          background: isHol ? C.holiday : isWkd ? '#f5f5f5' : C.headerBg,
                          color:      isHol ? C.holidayText : isWkd ? C.textMid : C.text,
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '400', color: isHol ? C.holidayText : C.textMid }}>{dow}</span>
                            <span>{format(parseISO(date), 'MMM d')}</span>
                            {isHol && <span style={{ fontSize: '9px' }}>🎉</span>}
                          </div>
                        </th>
                      );
                    })}
                    <th style={{
                      padding: '12px 10px', textAlign: 'center', fontSize: '12px',
                      fontWeight: '600', color: C.purple, background: C.totalBg,
                      minWidth: '68px', borderLeft: `1px solid ${C.border}`,
                    }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chargeCodeRows.length === 0 ? (
                    <tr>
                      <td colSpan={allDates.length + 2} style={{ padding: '40px', textAlign: 'center', color: C.textMid }}>
                        No entries recorded.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* FIX 1: use cc.label for display */}
                      {chargeCodeRows.map(([key, cc], ri) => {
                        const rowTotal = allDates.reduce((s, d) => s + (cc.byDate[d]?.hours || 0), 0);
                        const rowBg = ri % 2 === 0 ? C.white : C.rowAlt;
                        return (
                          <tr key={key} style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBg }}>
                            <td style={{
                              ...stickyLeft, padding: '10px 16px', fontSize: '13px',
                              fontWeight: '600', color: C.purple,
                              background: rowBg, borderRight: `1px solid ${C.borderLight}`,
                            }}>
                              {cc.label}
                            </td>
                            {allDates.map((date) => {
                              const entry = cc.byDate[date];
                              const isHol = !!holidaysByDate[date];
                              return (
                                <td key={date} style={{
                                  padding: '10px 4px', textAlign: 'center', fontSize: '13px',
                                  borderLeft: `1px solid ${C.borderLight}`,
                                  background: isHol ? '#fffbeb' : 'transparent',
                                }}>
                                  {entry && entry.hours > 0
                                    ? <strong style={{ color: C.text }}>{entry.hours}h</strong>
                                    : <span style={{ color: C.borderLight }}>—</span>}
                                </td>
                              );
                            })}
                            <td style={{
                              padding: '10px 10px', textAlign: 'center', fontWeight: '700',
                              background: C.totalBg, borderLeft: `1px solid ${C.border}`,
                              color: C.purple, fontSize: '13px',
                            }}>
                              {rowTotal}h
                            </td>
                          </tr>
                        );
                      })}

                      <tr style={{ background: C.totalBg, borderTop: `2px solid ${C.totalBorder}` }}>
                        <td style={{ ...stickyLeft, padding: '10px 16px', fontWeight: '600', color: C.purple, fontSize: '13px', background: C.totalBg, borderRight: `1px solid ${C.borderLight}` }}>
                          Daily Total
                        </td>
                        {allDates.map((date) => (
                          <td key={date} style={{ padding: '10px 4px', textAlign: 'center', fontWeight: '700', color: C.purple, fontSize: '13px', borderLeft: `1px solid ${C.borderLight}` }}>
                            {getDateTotal(date) > 0 ? `${getDateTotal(date)}h` : <span style={{ color: C.textMid, fontWeight: '400' }}>—</span>}
                          </td>
                        ))}
                        <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: '700', background: C.purpleLight, color: C.purple, fontSize: '14px', borderLeft: `1px solid ${C.totalBorder}` }}>
                          {grandTotal}h
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {timesheet.approval_history?.length > 0 && (
            <div style={{ ...S.card, ...S.cardPad }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '600', color: C.text }}>
                Approval History
              </p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {timesheet.approval_history.map((h, i) => (
                  <div key={i} style={{ fontSize: '13px', color: C.textMid, padding: '8px 12px', background: h.action === 'approved' ? C.greenLight : C.redLight, borderRadius: '6px', border: `1px solid ${h.action === 'approved' ? C.greenBorder : C.redBorder}` }}>
                    <span style={{ fontWeight: '600', color: h.action === 'approved' ? C.green : C.red }}>
                      {h.stage === 'lead' ? 'Lead' : 'Manager'} {h.action}
                    </span>
                    {' by '}{h.approver_name}
                    {h.timestamp && ` · ${format(new Date(h.timestamp), 'MMM d, yyyy')}`}
                    {h.comments && <div style={{ marginTop: '4px', fontSize: '12px' }}>"{h.comments}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Approvals ────────────────────────────────────────────────────────────────
function Approvals({ user }) {
  const [searchTerm,          setSearchTerm]          = useState('');
  const [statusFilter,        setStatusFilter]        = useState('pending_lead');
  const [selectedTimesheets,  setSelectedTimesheets]  = useState([]);
  const [approvals,           setApprovals]           = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [viewingTimesheet,    setViewingTimesheet]    = useState(null);
  const [fullPageView,        setFullPageView]        = useState(false);

  // shared hook — enriches old entries missing charge_code_name
  const ccLookup = useCcLookup();

  const role   = user?.role;
  const userId = user?._id || user?.id;

  const loadApprovals = useCallback(() => {
    if (!userId) return;
    setLoading(true);

    const leadFetch    = fetchAPI(`/timesheets/pending/lead/${userId}`);
    const managerFetch = role === 'Manager'
      ? fetchAPI(`/timesheets/pending/manager/${userId}`)
      : Promise.resolve([]);

    Promise.all([leadFetch, managerFetch])
      .then(([leadData, managerData]) => {
        const combined = [
          ...(Array.isArray(leadData)    ? leadData    : []),
          ...(Array.isArray(managerData) ? managerData : []),
        ];
        const seen = new Set();
        const deduped = combined.filter((ts) => {
          const id = ts._id || ts.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setApprovals(deduped);
      })
      .catch((err) => alert(`Failed to load approvals: ${err.message}`))
      .finally(() => setLoading(false));
  }, [userId, role]);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  // Auto-refresh when the browser tab becomes visible again
  // (e.g. lead switches back after employee has resubmitted)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadApprovals(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadApprovals]);

  const filtered = approvals.filter((a) => {
    const name  = (a.employee_name  || '').toLowerCase();
    const email = (a.employee_email || '').toLowerCase();
    const q     = searchTerm.toLowerCase();
    const matchSearch = name.includes(q) || email.includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount  = approvals.filter((a) => ['pending_lead', 'pending_manager'].includes(a.status)).length;
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const pendingHours  = approvals
    .filter((a) => ['pending_lead', 'pending_manager'].includes(a.status))
    .reduce((s, a) => s + (a.total_hours || 0), 0);

  const handleApprove = async (id, status) => {
    if (!window.confirm('Approve this timesheet?')) return;
    setLoading(true);
    const ep = status === 'pending_manager'
      ? `/timesheets/approve/manager/${id}`
      : `/timesheets/approve/lead/${id}`;
    try {
      await fetchAPI(ep, {
        method: 'PUT',
        body: JSON.stringify({ approved_by: userId, comments: '' }),
      });
      setApprovals((p) => p.filter((a) => (a._id || a.id) !== id));
      setSelectedTimesheets((p) => p.filter((x) => x !== id));
      alert('Timesheet approved successfully');
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id, status) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason?.trim()) return;
    setLoading(true);
    const ep = status === 'pending_manager'
      ? `/timesheets/reject/manager/${id}`
      : `/timesheets/reject/lead/${id}`;
    try {
      await fetchAPI(ep, {
        method: 'PUT',
        body: JSON.stringify({ rejected_by: userId, rejection_reason: reason }),
      });
      setApprovals((p) => p.map((a) =>
        (a._id || a.id) === id
          ? { ...a, status: status === 'pending_manager' ? 'rejected_by_manager' : 'rejected_by_lead' }
          : a
      ));
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Timesheet Approvals</h1>
            <p style={S.pageSub}>Review and action your direct reports' timesheets</p>
          </div>

          <div style={S.statsGrid}>
            {[
              { label: 'Pending Review', value: pendingCount,        sub: 'Awaiting your action', Icon: Clock,       color: C.text  },
              { label: 'Approved',       value: approvedCount,       sub: 'This period',           Icon: CheckCircle, color: C.green },
              { label: 'Hours Pending',  value: `${pendingHours}h`,  sub: 'Awaiting approval',     Icon: TrendingUp,  color: C.text  },
              { label: 'Your Role',      value: role || 'Lead',      sub: 'Approval authority',    Icon: UserCheck,   color: C.text  },
            ].map(({ label, value, sub, Icon, color }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}>
                  <span style={S.statLabel}>{label}</span>
                  <Icon size={18} style={{ color: C.purpleMid }} />
                </div>
                <div style={{ ...S.statValue, color }}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={S.rowBetween}>
              <div style={S.rowGap4}>
                <div style={S.searchWrap}>
                  <Search size={14} style={S.searchIcon} />
                  <input
                    placeholder="Search by name or email…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...S.input, paddingLeft: '32px', width: '220px' }}
                  />
                </div>
                <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="pending_lead">Pending Approval</option>
                  <option value="pending_manager">Pending Manager (Legacy)</option>
                  <option value="approved">Approved</option>
                  <option value="rejected_by_lead">Rejected</option>
                  <option value="rejected_by_manager">Rejected by Manager (Legacy)</option>
                </SelectWrap>
                <button onClick={loadApprovals} style={S.btnSecondary} title="Refresh">
                  <RefreshCw size={14} />
                </button>
              </div>
              {selectedTimesheets.length > 0 && (
                <button
                  onClick={() => {
                    const selected = approvals.filter((a) => selectedTimesheets.includes(a._id || a.id));
                    selected.forEach((a) => handleApprove(a._id || a.id, a.status));
                  }}
                  style={S.btnGreen}
                >
                  <CheckCircle size={14} /> Approve Selected ({selectedTimesheets.length})
                </button>
              )}
            </div>
          </div>

          {pendingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '6px', marginBottom: '20px', border: `1px solid ${C.purpleBorder}`, background: C.purpleLight }}>
              <AlertCircle size={16} style={{ color: C.purple, flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: C.purple, margin: '0 0 2px 0' }}>
                  {pendingCount} timesheet{pendingCount !== 1 ? 's' : ''} pending your approval
                </p>
                <p style={{ fontSize: '12px', color: C.textMid, margin: 0 }}>
                  Please review promptly to ensure timely payroll processing
                </p>
              </div>
            </div>
          )}

          <div style={{ ...S.card, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '850px' }}>
                <thead style={S.thead}>
                  <tr>
                    <th style={S.th}></th>
                    {['Employee', 'Period', 'Total Hours', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={
                        h === 'Total Hours'                     ? S.thRight
                        : h === 'Status' || h === 'Actions'    ? S.thCenter
                        : S.th
                      }>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No timesheets found</td></tr>
                  ) : filtered.map((a, i) => {
                    const id        = a._id || a.id;
                    const isPending = ['pending_lead', 'pending_manager'].includes(a.status);
                    const period    = a.period_start && a.period_end
                      ? `${format(new Date(a.period_start), 'MMM d')} – ${format(new Date(a.period_end), 'MMM d, yyyy')}`
                      : '—';
                    return (
                      <tr key={id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}>
                          {isPending && (
                            <input
                              type="checkbox"
                              checked={selectedTimesheets.includes(id)}
                              onChange={() =>
                                setSelectedTimesheets((p) =>
                                  p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
                                )
                              }
                              style={{ width: '15px', height: '15px' }}
                            />
                          )}
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight: '500' }}>{a.employee_name}</div>
                          <div style={{ fontSize: '12px', color: C.textMid }}>{a.employee_email}</div>
                        </td>
                        <td style={S.td}>{period}</td>
                        <td style={S.tdRight}><strong>{a.total_hours || 0}h</strong></td>
                        <td style={S.tdMid}>
                          {a.submitted_at ? format(new Date(a.submitted_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td style={S.tdCenter}><StatusBadge status={a.status} /></td>
                        <td style={S.tdCenter}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              style={{ ...S.btnIcon, color: C.purple }}
                              title="View full timesheet"
                              onClick={async () => {
                                try {
                                  const full = await fetchAPI(`/timesheets/${id}`);
                                  setViewingTimesheet(full);
                                  // FIX: update the list entry with fresh total_hours
                                  if (full && full.total_hours !== undefined) {
                                    setApprovals((prev) => prev.map((ts) =>
                                      (ts._id || ts.id) === id
                                        ? { ...ts, total_hours: full.total_hours }
                                        : ts
                                    ));
                                  }
                                } catch (_) {
                                  setViewingTimesheet(a);
                                }
                                setFullPageView(true);
                              }}
                            >
                              <Eye size={15} />
                            </button>
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApprove(id, a.status)}
                                  disabled={loading}
                                  style={{ ...S.btnIcon, color: C.green }}
                                  title="Approve"
                                >
                                  <CheckCircle size={15} />
                                </button>
                                <button
                                  onClick={() => handleReject(id, a.status)}
                                  disabled={loading}
                                  style={{ ...S.btnIcon, color: C.red }}
                                  title="Reject"
                                >
                                  <XCircle size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {viewingTimesheet && fullPageView ? (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: C.bg, overflowY: 'auto' }}>
              <TimesheetFullPageView
                timesheet={viewingTimesheet}
                user={user}
                ccLookup={ccLookup}
                onClose={() => { setViewingTimesheet(null); setFullPageView(false); }}
                onApprove={async () => {
                  const id = viewingTimesheet._id || viewingTimesheet.id;
                  if (!window.confirm('Approve this timesheet?')) return;
                  try {
                    const ep = viewingTimesheet.status === 'pending_manager'
                      ? `/timesheets/approve/manager/${id}`
                      : `/timesheets/approve/lead/${id}`;
                    await fetchAPI(ep, {
                      method: 'PUT',
                      body: JSON.stringify({ approved_by: userId, comments: '' }),
                    });
                    alert('Timesheet approved successfully');
                    setViewingTimesheet(null);
                    setFullPageView(false);
                    loadApprovals();
                  } catch (err) {
                    alert(`Approval failed: ${err.message}`);
                  }
                }}
                onReject={async () => {
                  const id = viewingTimesheet._id || viewingTimesheet.id;
                  const reason = window.prompt('Please provide a reason for rejection:');
                  if (!reason?.trim()) return;
                  try {
                    const ep = viewingTimesheet.status === 'pending_manager'
                      ? `/timesheets/reject/manager/${id}`
                      : `/timesheets/reject/lead/${id}`;
                    await fetchAPI(ep, {
                      method: 'PUT',
                      body: JSON.stringify({ rejected_by: userId, rejection_reason: reason }),
                    });
                    alert('Timesheet rejected');
                    setViewingTimesheet(null);
                    setFullPageView(false);
                    loadApprovals();
                  } catch (err) {
                    alert(`Rejection failed: ${err.message}`);
                  }
                }}
              />
            </div>
          ) : viewingTimesheet ? (
            <TimesheetDetailModal
              timesheet={viewingTimesheet}
              ccLookup={ccLookup}
              onClose={() => setViewingTimesheet(null)}
            />
          ) : null}

          <div style={S.infoBox}>
            <p style={S.infoTitle}>Approval Guidelines</p>
            <ul style={S.infoList}>
              {[
                'You are the sole approver for your direct reports\' timesheets',
                'Review each timesheet for accuracy and completeness before approving',
                'Use the bulk approve checkbox to action multiple timesheets at once',
                'Rejected timesheets are returned to the employee for revision',
                'Aim to approve within 2 business days of submission',
              ].map((t, i) => <li key={i} style={S.infoItem}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────
function History({ user, onNavigate }) {
  const [searchQuery,      setSearchQuery]      = useState('');
  const [statusFilter,     setStatusFilter]     = useState('all');
  const [submissions,      setSubmissions]      = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [viewingTimesheet, setViewingTimesheet] = useState(null);

  const ccLookup = useCcLookup();
  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchAPI(`/timesheets/employee/${userId}`)
      .then((d) => setSubmissions(Array.isArray(d) ? d : []))
      .catch((err) => alert(`Failed to load history: ${err.message}`))
      .finally(() => setLoading(false));
  }, [userId]);

  const approved          = submissions.filter((s) => s.status === 'approved');
  const rejected          = submissions.filter((s) => s.status?.startsWith('rejected'));
  const totalApprovedHrs  = approved.reduce((s, x) => s + (x.total_hours || 0), 0);
  const rate              = submissions.length > 0
    ? Math.round((approved.length / submissions.length) * 100) : 0;

  const filtered = submissions.filter((s) => {
    const period = s.period_start
      ? `${format(new Date(s.period_start), 'MMM d')} – ${format(new Date(s.period_end), 'MMM d, yyyy')}`
      : '';
    const q = searchQuery.toLowerCase();
    const matchSearch = period.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'pending'  && ['pending_lead', 'pending_manager'].includes(s.status))
      || (statusFilter === 'approved' && s.status === 'approved')
      || (statusFilter === 'rejected' && s.status?.startsWith('rejected'));
    return matchSearch && matchStatus;
  });

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Timesheet History</h1>
            <p style={S.pageSub}>View and download your past timesheet submissions</p>
          </div>

          <div style={S.statsGrid}>
            {[
              { label: 'Total Submissions', value: submissions.length, sub: 'All time',                Icon: Calendar,    color: C.text  },
              { label: 'Approved',          value: approved.length,    sub: `${rate}% approval rate`,  Icon: CheckCircle2, color: C.green },
              { label: 'Rejected',          value: rejected.length,    sub: 'Needs resubmission',       Icon: XCircle,     color: C.red   },
              { label: 'Approved Hours',    value: `${totalApprovedHrs}h`, sub: 'Total logged',         Icon: Clock,       color: C.text  },
            ].map(({ label, value, sub, Icon, color }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}>
                  <span style={S.statLabel}>{label}</span>
                  <Icon size={18} style={{ color: C.purpleMid }} />
                </div>
                <div style={{ ...S.statValue, color }}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={14} style={S.searchIcon} />
                <input
                  placeholder="Search by period…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...S.input, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </SelectWrap>
            </div>

            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Period', 'Total Hours', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left', fontSize: '12px',
                        fontWeight: '600', color: C.textMid,
                        textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>Loading history…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No submissions found</td></tr>
                  ) : filtered.map((s, i) => {
                    const period     = s.period_start && s.period_end
                      ? `${format(new Date(s.period_start), 'MMM d')} – ${format(new Date(s.period_end), 'MMM d, yyyy')}`
                      : '—';
                    return (
                      <tr key={s._id || s.id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}><strong>{period}</strong></td>
                        <td style={S.td}><strong>{s.total_hours || 0}h</strong></td>
                        <td style={S.tdMid}>
                          {s.submitted_at ? format(new Date(s.submitted_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td style={S.td}>
                          <StatusBadge status={s.status} />
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={async () => {
                                try {
                                  const full = await fetchAPI(`/timesheets/${s._id || s.id}`);
                                  setViewingTimesheet(full);
                                } catch (_) {
                                  setViewingTimesheet(s);
                                }
                              }}
                              style={{ ...S.btnSecondary, padding: '4px 10px', fontSize: '13px' }}
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              onClick={() => {
                                const rows = (s.entries || []).map((e) => {
                                  const looked = ccLookup[e.charge_code_id] || ccLookup[e.charge_code] || {};
                                  const code  = e.charge_code      || looked.code || '';
                                  const cname = e.charge_code_name || looked.name || '';
                                  return buildCsvRow([
                                    s.employee_name  || user?.name  || '',
                                    s.employee_email || user?.email || '',
                                    s.period_start,
                                    s.period_end,
                                    e.date,
                                    e.entry_type,
                                    code,
                                    cname,
                                    e.hours || 0,
                                    e.description || '',
                                  ]);
                                });
                                const header = buildCsvRow(['Employee Name','Email','Period Start','Period End','Date','Type','Charge Code','Charge Code Name','Hours','Description']);
                                const csv    = [header, ...rows].join('\n');
                                const blob   = new Blob([csv], { type: 'text/csv' });
                                const url    = URL.createObjectURL(blob);
                                const a      = document.createElement('a');
                                a.href       = url;
                                a.download   = `timesheet_${s.period_start}_${s.period_end}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              style={{ ...S.btnIcon, border: `1px solid ${C.border}`, borderRadius: '5px' }}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {viewingTimesheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#f8f8f8', overflowY: 'auto' }}>
          <TimesheetFullPageView
            timesheet={viewingTimesheet}
            user={user}
            ccLookup={ccLookup}
            onClose={() => setViewingTimesheet(null)}
            onApprove={null}
            onReject={null}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
const PIE_COLORS = [C.purple, C.purpleMid, '#a89db5', '#c5bfd1', '#e0dae6'];

function Reports({ user }) {
  const userId = user?._id || user?.id;

  const [dateRange,  setDateRange]  = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    end:   format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [timesheets, setTimesheets] = useState([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchAPI(`/timesheets/employee/${userId}`)
      .then((d) => setTimesheets(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const inRange = timesheets.filter((ts) => {
    if (ts.status !== 'approved') return false;
    const ps = ts.period_start || '';
    const pe = ts.period_end   || '';
    return ps >= dateRange.start && pe <= dateRange.end;
  });

  const monthlyMap = {};
  inRange.forEach((ts) => {
    const monthKey = ts.period_start ? format(new Date(ts.period_start), 'MMM yy') : 'Unknown';
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, hours: 0, leave: 0 };
    if (Array.isArray(ts.entries)) {
      ts.entries.forEach((e) => {
        if (e.entry_type === 'holiday') return;
        monthlyMap[monthKey].hours += e.hours || 0;
      });
    } else {
      monthlyMap[monthKey].hours += ts.total_hours || 0;
    }
  });
  const monthlyData = Object.values(monthlyMap);

  const ccMap = {};
  inRange.forEach((ts) => {
    if (!Array.isArray(ts.entries)) return;
    ts.entries.forEach((e) => {
      if (e.entry_type !== 'work') return;
      const key = e.charge_code || e.charge_code_id || 'Unknown';
      if (!ccMap[key]) ccMap[key] = { code: key, name: key, hours: 0 };
      ccMap[key].hours += e.hours || 0;
    });
  });
  const ccData     = Object.values(ccMap).sort((a, b) => b.hours - a.hours);
  const totalHours = ccData.reduce((s, i) => s + i.hours, 0);
  const pieData    = ccData.map((c) => ({ project: c.code, hours: c.hours }));

  const totalApproved = inRange.reduce((s, ts) => s + (ts.total_hours || 0), 0);
  const weekCount     = monthlyData.length * 4 || 1;
  const avgPerWeek    = (totalApproved / weekCount).toFixed(1);
  const isEmpty       = !loading && inRange.length === 0;

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Reports & Analytics</h1>
            <p style={S.pageSub}>Your approved timesheet data for the selected date range</p>
          </div>

          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minWidth: 'max-content' }}>
              <div style={S.rowGap4}>
                <Calendar size={15} style={{ color: C.textMid }} />
                <span style={{ fontSize: '13px', color: C.textMid }}>Date Range:</span>
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={S.input} />
                <span style={{ color: C.textMid }}>to</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={S.input} />
              </div>
              <button onClick={() => alert('Export coming soon')} style={S.btnPrimary}>
                <Download size={14} /> Export Report
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMid }}>
              <div style={{ fontSize: '14px' }}>Loading report data…</div>
            </div>
          ) : isEmpty ? (
            <div style={{ ...S.card, ...S.cardPad, textAlign: 'center', padding: '60px 20px' }}>
              <BarChart3 size={40} style={{ color: C.purpleBorder, marginBottom: '12px' }} />
              <p style={{ fontSize: '16px', fontWeight: '500', color: C.text, margin: '0 0 8px 0' }}>
                No approved timesheets in this date range
              </p>
              <p style={{ fontSize: '14px', color: C.textMid, margin: 0 }}>
                Submit and get timesheets approved to see your analytics here.
              </p>
            </div>
          ) : (
            <>
              <div style={S.statsGrid}>
                {[
                  { label: 'Total Hours',       value: `${totalApproved}h`, sub: 'Approved hours',      Icon: Clock      },
                  { label: 'Avg / Week',         value: `${avgPerWeek}h`,    sub: 'Weekly average',      Icon: TrendingUp },
                  { label: 'Charge Codes Used',  value: ccData.length,       sub: 'Unique codes',        Icon: FileText   },
                  { label: 'Periods',            value: inRange.length,      sub: 'Approved timesheets', Icon: BarChart3  },
                ].map(({ label, value, sub, Icon }) => (
                  <div key={label} style={S.statCard}>
                    <div style={S.statRow}><span style={S.statLabel}>{label}</span><Icon size={18} style={{ color: C.purpleMid }} /></div>
                    <div style={S.statValue}>{value}</div>
                    <div style={S.statSub}>{sub}</div>
                  </div>
                ))}
              </div>

              {monthlyData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ ...S.card, padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text, margin: '0 0 16px 0' }}>Monthly Hours Trend</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                        <XAxis dataKey="month" stroke={C.textMid} tick={{ fontSize: 12 }} />
                        <YAxis stroke={C.textMid} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '4px', fontSize: '13px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="hours" fill={C.purple} name="Work Hours"  radius={[3, 3, 0, 0]} />
                        <Bar dataKey="leave" fill="#c5bfd1"  name="Leave Hours" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {pieData.length > 0 && (
                    <div style={{ ...S.card, padding: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text, margin: '0 0 16px 0' }}>Time by Charge Code</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="hours"
                            label={({ name, value }) => `${name}: ${value}h`} labelLine={false}>
                            {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '4px', fontSize: '13px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {ccData.length > 0 && (
                <div style={{ ...S.card, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text, margin: '0 0 4px 0' }}>Hours by Charge Code</h3>
                    <p style={{ fontSize: '13px', color: C.textMid, margin: 0 }}>Breakdown of your approved work hours</p>
                  </div>
                  <div style={S.tableScroll}>
                    <table style={{ ...S.table, minWidth: '500px' }}>
                      <thead style={S.thead}>
                        <tr>
                          {['Code', 'Total Hours', 'Percentage'].map((h, i) => (
                            <th key={h} style={i >= 1 ? S.thRight : S.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ccData.map((item, i) => (
                          <tr key={item.code} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                            <td style={{ ...S.td, fontWeight: '500', color: C.purple }}>{item.code}</td>
                            <td style={S.tdRight}><strong>{item.hours}h</strong></td>
                            <td style={S.tdRight}>
                              {totalHours > 0 ? ((item.hours / totalHours) * 100).toFixed(1) : '0'}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: C.totalBg, borderTop: `2px solid ${C.totalBorder}` }}>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: C.purple }}>Total</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: C.purple }}>{totalHours}h</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: C.purple }}>100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TeamTimesheets ───────────────────────────────────────────────────────────
function TeamTimesheets({ user }) {
  const [timesheets,       setTimesheets]       = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('all');
  const [viewingTimesheet, setViewingTimesheet] = useState(null);

  const ccLookup  = useCcLookup();
  const userEmail = user?.email;

  useEffect(() => {
    if (!userEmail) return;
    setLoading(true);
    fetchAPI(`/timesheets/team/${userEmail}`)
      .then((d) => setTimesheets(Array.isArray(d) ? d : []))
      .catch((err) => { console.error(err); setTimesheets([]); })
      .finally(() => setLoading(false));
  }, [userEmail]);

  const filtered = timesheets.filter((ts) => {
    const name  = (ts.employee_name  || '').toLowerCase();
    const email = (ts.employee_email || '').toLowerCase();
    const q     = searchTerm.toLowerCase();
    return (name.includes(q) || email.includes(q))
      && (statusFilter === 'all' || ts.status === statusFilter);
  });

  const stats = {
    total:    timesheets.length,
    pending:  timesheets.filter((t) => t.status?.startsWith('pending')).length,
    approved: timesheets.filter((t) => t.status === 'approved').length,
    rejected: timesheets.filter((t) => t.status?.startsWith('rejected')).length,
  };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Team Timesheets</h1>
            <p style={S.pageSub}>View timesheets from your direct reports</p>
          </div>

          <div style={S.statsGrid}>
            {[
              { label: 'Total',    value: stats.total,    sub: 'All time',          Icon: FileText    },
              { label: 'Pending',  value: stats.pending,  sub: 'Awaiting approval', Icon: Clock       },
              { label: 'Approved', value: stats.approved, sub: 'Completed',         Icon: CheckCircle },
              { label: 'Rejected', value: stats.rejected, sub: 'Needs revision',    Icon: XCircle     },
            ].map(({ label, value, sub, Icon }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}><span style={S.statLabel}>{label}</span><Icon size={18} style={{ color: C.purpleMid }} /></div>
                <div style={S.statValue}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={S.rowGap4}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={S.searchIcon} />
                <input
                  placeholder="Search by employee name or email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...S.input, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending_lead">Pending Approval</option>
                <option value="pending_manager">Pending Manager (Legacy)</option>
                <option value="approved">Approved</option>
                <option value="rejected_by_lead">Rejected</option>
                <option value="rejected_by_manager">Rejected by Manager (Legacy)</option>
              </SelectWrap>
            </div>
          </div>

          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '650px' }}>
                <thead style={S.thead}>
                  <tr>
                    {['Employee', 'Period', 'Total Hours', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={
                        h === 'Total Hours'                  ? S.thRight
                        : h === 'Status' || h === 'Actions' ? S.thCenter
                        : S.th
                      }>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No timesheets found</td></tr>
                  ) : filtered.map((ts, i) => {
                    const period = ts.period_start && ts.period_end
                      ? `${format(new Date(ts.period_start), 'MMM d')} – ${format(new Date(ts.period_end), 'MMM d, yyyy')}`
                      : '—';
                    return (
                      <tr key={ts._id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}>
                          <div style={{ fontWeight: '500' }}>{ts.employee_name}</div>
                          <div style={{ fontSize: '12px', color: C.textMid }}>{ts.employee_email}</div>
                        </td>
                        <td style={S.td}>{period}</td>
                        <td style={S.tdRight}><strong>{ts.total_hours || 0}h</strong></td>
                        <td style={S.tdMid}>
                          {ts.submitted_at ? format(new Date(ts.submitted_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td style={S.tdCenter}><StatusBadge status={ts.status} /></td>
                        <td style={S.tdCenter}>
                          <button
                            onClick={async () => {
                              try {
                                const full = await fetchAPI(`/timesheets/${ts._id}`);
                                setViewingTimesheet(full);
                              } catch (_) {
                                setViewingTimesheet(ts);
                              }
                            }}
                            style={S.btnIcon}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {viewingTimesheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: C.bg, overflowY: 'auto' }}>
          <TimesheetFullPageView
            timesheet={viewingTimesheet}
            user={user}
            ccLookup={ccLookup}
            onClose={() => setViewingTimesheet(null)}
            onApprove={null}
            onReject={null}
          />
        </div>
      )}
    </div>
  );
}

// ─── AdminTimesheets ──────────────────────────────────────────────────────────
function AdminTimesheets() {
  const [timesheets,       setTimesheets]       = useState([]);
  const [employees,        setEmployees]        = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [viewingTimesheet, setViewingTimesheet] = useState(null);
  const [fullPageView,     setFullPageView]     = useState(false);

  const ccLookup = useCcLookup();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAPI('/timesheets/all'),
      fetchAPI('/users/get_all_employees'),
    ])
      .then(([ts, emps]) => {
        setTimesheets(Array.isArray(ts)   ? ts   : []);
        setEmployees( Array.isArray(emps) ? emps : []);
      })
      .catch((err) => { console.error('AdminTimesheets error:', err); alert(`Failed: ${err.message}`); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = timesheets.filter((ts) => {
    const name  = (ts.employee_name  || '').toLowerCase();
    const email = (ts.employee_email || '').toLowerCase();
    const q     = searchTerm.toLowerCase();
    return (name.includes(q) || email.includes(q))
      && (statusFilter     === 'all' || ts.status      === statusFilter)
      && (selectedEmployee === 'all' || ts.employee_id === selectedEmployee);
  });

  const stats = {
    total:    timesheets.length,
    pending:  timesheets.filter((t) => t.status?.startsWith('pending')).length,
    approved: timesheets.filter((t) => t.status === 'approved').length,
    rejected: timesheets.filter((t) => t.status?.startsWith('rejected')).length,
    hours:    timesheets.reduce((s, t) => s + (t.total_hours || 0), 0),
  };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={{ ...S.maxW, maxWidth: '1800px' }}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>All Timesheets</h1>
            <p style={S.pageSub}>Complete organisation-wide timesheet overview</p>
          </div>

          <div style={S.statsGrid5}>
            {[
              { label: 'Total',       value: stats.total,       sub: 'All time',        Icon: FileText    },
              { label: 'Pending',     value: stats.pending,     sub: 'In queue',         Icon: Clock       },
              { label: 'Approved',    value: stats.approved,    sub: 'Completed',        Icon: CheckCircle },
              { label: 'Rejected',    value: stats.rejected,    sub: 'Needs revision',   Icon: XCircle     },
              { label: 'Total Hours', value: `${stats.hours}h`, sub: 'All employees',    Icon: TrendingUp  },
            ].map(({ label, value, sub, Icon }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}><span style={S.statLabel}>{label}</span><Icon size={18} style={{ color: C.purpleMid }} /></div>
                <div style={S.statValue}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={14} style={S.searchIcon} />
                <input
                  placeholder="Search by employee name or email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...S.input, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <SelectWrap value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ minWidth: '180px' }}>
                <option value="all">All Employees</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </SelectWrap>
              <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending_lead">Pending Approval</option>
                <option value="pending_manager">Pending Manager (Legacy)</option>
                <option value="approved">Approved</option>
                <option value="rejected_by_lead">Rejected</option>
                <option value="rejected_by_manager">Rejected by Manager (Legacy)</option>
              </SelectWrap>
              <button onClick={() => alert('Exporting…')} style={S.btnPrimary}>
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          <div style={{ ...S.card, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '900px' }}>
                <thead style={S.thead}>
                  <tr>
                    {['Employee', 'Department', 'Period', 'Total Hours', 'Submitted', 'Status', 'Approver', 'Actions'].map((h) => (
                      <th key={h} style={
                        h === 'Total Hours'                  ? S.thRight
                        : h === 'Status' || h === 'Actions' ? S.thCenter
                        : S.th
                      }>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No timesheets found</td></tr>
                  ) : filtered.map((ts, i) => {
                    const period = ts.period_start && ts.period_end
                      ? `${format(new Date(ts.period_start), 'MMM d')} – ${format(new Date(ts.period_end), 'MMM d, yyyy')}`
                      : '—';
                    return (
                      <tr key={ts._id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}>
                          <div style={{ fontWeight: '500' }}>{ts.employee_name}</div>
                          <div style={{ fontSize: '12px', color: C.textMid }}>{ts.employee_email}</div>
                        </td>
                        <td style={S.tdMid}>{ts.employee_department || '—'}</td>
                        <td style={S.td}>{period}</td>
                        <td style={S.tdRight}><strong>{ts.total_hours || 0}h</strong></td>
                        <td style={S.tdMid}>
                          {ts.submitted_at ? format(new Date(ts.submitted_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td style={S.tdCenter}><StatusBadge status={ts.status} /></td>
                        <td style={S.tdMid}>
                          {ts.status === 'pending_lead'     ? 'Reporting Lead'
                          : ts.status === 'pending_manager' ? 'Manager (Legacy)'
                          : ts.status === 'approved'        ? (ts.lead_approved_by || ts.manager_approved_by || 'Lead')
                          : '—'}
                        </td>
                        <td style={S.tdCenter}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={async () => {
                                try {
                                  const full = await fetchAPI(`/timesheets/${ts._id}`);
                                  setViewingTimesheet(full);
                                } catch (_) {
                                  setViewingTimesheet(ts);
                                }
                                setFullPageView(true);
                              }}
                              style={S.btnIcon}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => {
                                const rows = (ts.entries || []).map(e => {
                                  const looked = ccLookup[e.charge_code_id] || ccLookup[e.charge_code] || {};
                                  const code  = e.charge_code      || looked.code || '';
                                  const cname = e.charge_code_name || looked.name || '';
                                  return buildCsvRow([
                                    ts.employee_name  || '',
                                    ts.employee_email || '',
                                    ts.employee_department || '',
                                    ts.period_start,
                                    ts.period_end,
                                    e.date,
                                    e.entry_type,
                                    code,
                                    cname,
                                    e.hours || 0,
                                    e.description || '',
                                  ]);
                                });
                                const header = buildCsvRow(['Employee Name','Email','Department','Period Start','Period End','Date','Type','Charge Code','Charge Code Name','Hours','Description']);
                                const csv = [header, ...rows].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `timesheet_${ts.employee_name?.replace(/\s+/g, '_')}_${ts.period_start}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              style={S.btnIcon}
                            >
                              <Download size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {viewingTimesheet && fullPageView && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: C.bg, overflowY: 'auto' }}>
              <TimesheetFullPageView
                timesheet={viewingTimesheet}
                user={{ role: 'Admin' }}
                ccLookup={ccLookup}
                onClose={() => { setViewingTimesheet(null); setFullPageView(false); }}
                onApprove={null}
                onReject={null}
              />
            </div>
          )}

          <div style={S.infoBox}>
            <p style={S.infoTitle}>Admin View</p>
            <ul style={S.infoList}>
              {[
                'View all employee timesheets across the organisation',
                'Timesheets are approved by each employee\'s reporting lead (single-stage approval)',
                'Filter by employee, department, or status',
                'Export data for reporting and payroll processing',
              ].map((t, i) => <li key={i} style={S.infoItem}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ChargeCodeAdmin ──────────────────────────────────────────────────────────
function ChargeCodeAdmin({ user }) {
  const [codes,             setCodes]             = useState([]);
  const [employees,         setEmployees]         = useState([]);
  const [newCode,           setNewCode]           = useState({ charge_code: '', charge_code_name: '' });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedCode,      setSelectedCode]      = useState('');
  const [loading,           setLoading]           = useState(false);

  const userId = user?._id || user?.id;

  const loadCodes = () => {
    fetchAPI('/charge_codes/all')
      .then((d) => setCodes(Array.isArray(d) ? d : []))
      .catch(console.error);
  };

  useEffect(() => {
    loadCodes();
    fetchAPI('/users/get_all_employees')
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  const handleCreate = async () => {
    if (!newCode.charge_code || !newCode.charge_code_name) {
      alert('Please enter both a code and a name');
      return;
    }
    if (!userId) { alert('User not loaded properly'); return; }
    setLoading(true);
    try {
      await fetchAPI('/charge_codes/create', {
        method: 'POST',
        body: JSON.stringify({
          code:         newCode.charge_code.trim(),
          name:         newCode.charge_code_name.trim(),
          description:  '',
          project_name: '',
          is_active:    true,
          created_by:   userId,
        }),
      });
      alert('Charge code created successfully');
      setNewCode({ charge_code: '', charge_code_name: '' });
      loadCodes();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (selectedEmployees.length === 0 || !selectedCode) {
      alert('Please select at least one employee and a charge code');
      return;
    }
    if (!userId) { alert('User not loaded properly'); return; }
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedEmployees.map((empId) =>
          fetchAPI('/charge_codes/assign', {
            method: 'POST',
            body: JSON.stringify({
              employee_id:     empId,
              charge_code_ids: [selectedCode],
              assigned_by:     userId,
            }),
          })
        )
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed    = results.length - succeeded;
      alert(
        failed === 0
          ? `Charge code assigned to ${succeeded} employee${succeeded !== 1 ? 's' : ''} successfully`
          : `Assigned to ${succeeded}, failed for ${failed} employee${failed !== 1 ? 's' : ''}`
      );
      setSelectedEmployees([]);
      setSelectedCode('');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Charge Code Management</h1>
            <p style={S.pageSub}>Create and assign project charge codes to employees</p>
          </div>

          <div style={{ ...S.card, ...S.cardPad, marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: C.text, margin: '0 0 16px 0' }}>
              Create Charge Code
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: C.textMid, fontWeight: '500' }}>Code</label>
                <input
                  placeholder="e.g. PROJ-001"
                  value={newCode.charge_code}
                  onChange={(e) => setNewCode({ ...newCode, charge_code: e.target.value })}
                  style={{ ...S.input, width: '160px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '13px', color: C.textMid, fontWeight: '500' }}>Name</label>
                <input
                  placeholder="e.g. Website Redesign"
                  value={newCode.charge_code_name}
                  onChange={(e) => setNewCode({ ...newCode, charge_code_name: e.target.value })}
                  style={{ ...S.input, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={handleCreate} disabled={loading} style={loading ? S.btnDisabled : S.btnPrimary}>
                <Plus size={14} /> Create
              </button>
            </div>
          </div>

          <div style={{ ...S.card, ...S.cardPad, marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: C.text, margin: '0 0 16px 0' }}>
              Assign Charge Code to Employee
            </h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '13px', color: C.textMid, fontWeight: '500' }}>
                    Employees
                    {selectedEmployees.length > 0 && (
                      <span style={{ marginLeft: '6px', color: C.purple, fontWeight: '600' }}>
                        ({selectedEmployees.length} selected)
                      </span>
                    )}
                  </label>
                  <button
                    onClick={() =>
                      setSelectedEmployees(
                        selectedEmployees.length === employees.length
                          ? []
                          : employees.map((e) => e._id)
                      )
                    }
                    style={{
                      fontSize: '12px', color: C.purple, background: 'none',
                      border: 'none', cursor: 'pointer', fontWeight: '500',
                      padding: '0', marginLeft: '12px',
                    }}
                  >
                    {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div style={{
                  border: `1px solid ${C.border}`, borderRadius: '5px',
                  maxHeight: '160px', overflowY: 'auto', background: C.white,
                }}>
                  {employees.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: '13px', color: C.textMid }}>
                      No employees found
                    </div>
                  ) : employees.map((emp) => {
                    const isChecked = selectedEmployees.includes(emp._id);
                    return (
                      <label key={emp._id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                        background: isChecked ? C.purpleLight : 'transparent',
                        borderBottom: `1px solid ${C.borderLight}`,
                        color: C.text,
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setSelectedEmployees((prev) =>
                              isChecked
                                ? prev.filter((id) => id !== emp._id)
                                : [...prev, emp._id]
                            )
                          }
                          style={{ width: '14px', height: '14px', accentColor: C.purple, flexShrink: 0 }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: C.textMid, fontWeight: '500' }}>Charge Code</label>
                <div style={S.selectWrap}>
                  <select
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    style={{ ...S.select, minWidth: '220px' }}
                  >
                    <option value="">Select Charge Code</option>
                    {codes.map((c) => (
                      <option key={c._id} value={c._id}>{c.code} – {c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={S.chevron} />
                </div>
                <button
                  onClick={handleAssign}
                  disabled={loading}
                  style={loading ? S.btnDisabled : S.btnGreen}
                >
                  <UserCheck size={14} /> Assign
                </button>
              </div>
            </div>
          </div>

          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: C.text, margin: 0 }}>
                All Charge Codes ({codes.length})
              </h3>
            </div>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '500px' }}>
                <thead style={S.thead}>
                  <tr>
                    {['Code', 'Name', 'Status', 'Created'].map((h) => (
                      <th key={h} style={h === 'Status' ? S.thCenter : S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codes.length === 0 ? (
                    <tr><td colSpan={4} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No charge codes found</td></tr>
                  ) : codes.map((c, i) => (
                    <tr key={c._id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                      <td style={{ ...S.td, fontWeight: '600', color: C.purple }}>{c.code}</td>
                      <td style={S.td}>{c.name}</td>
                      <td style={S.tdCenter}>
                        <span style={{
                          ...S.badge,
                          background:  c.is_active ? C.greenLight : '#f3f4f6',
                          color:       c.is_active ? C.green      : '#6b7280',
                          borderColor: c.is_active ? C.greenBorder : '#d1d5db',
                        }}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={S.tdMid}>
                        {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Timesheets({ user }) {
  const defaultTab = user?.role === 'Admin' ? 'all_timesheets' : 'timesheet';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderTab = () => {
    switch (activeTab) {
      case 'timesheet':       return <TimesheetPage   user={user} />;
      case 'team_timesheets': return <TeamTimesheets  user={user} />;
      case 'all_timesheets':  return <AdminTimesheets user={user} />;
      case 'approvals':       return <Approvals       user={user} />;
      case 'history':         return <History         user={user} onNavigate={setActiveTab} />;
      case 'reports':         return <Reports         user={user} />;
      case 'charge_codes':    return <ChargeCodeAdmin user={user} />;
      default:                return <TimesheetPage   user={user} />;
    }
  };

  return (
    <div style={{
      background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      color: C.text,
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <TimesheetTabBar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      {renderTab()}
    </div>
  );
}