import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  GitBranch,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import OrganizationHierarchy from "./OrganizationHierarchy";
import LeaveStatusDot from "./LeaveStatusDot";
import BannerImage from "../assets/banner.jpg";

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "Not available";

  try {
    const value = typeof dateStr === "object" && dateStr.$date ? dateStr.$date : dateStr;
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Not available";
  }
};

const statusToneMap = {
  Approved: "is-approved",
  Rejected: "is-rejected",
  Cancelled: "is-neutral",
  Pending: "is-pending",
};

const EmployeeDashboard = ({ user, setSection }) => {
  const [stats, setStats] = useState({
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    totalTeamMembers: 0,
  });
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [managerInfo, setManagerInfo] = useState(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmployeeData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        balanceResult,
        historyResult,
        profileResult,
        usersResult,
        holidaysResult,
        teamResult,
      ] = await Promise.allSettled([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/balance/${user.id}`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/history/${user.id}`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/holidays/`),
        axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(user.email)}`
        ),
      ]);

      if (balanceResult.status === "fulfilled") {
        setLeaveBalance(balanceResult.value.data);
      } else {
        setLeaveBalance({
          sick: 0,
          sickTotal: 6,
          planned: 0,
          plannedTotal: 12,
          optional: 0,
          optionalTotal: 2,
          lwp: 0,
        });
      }

      const leaves =
        historyResult.status === "fulfilled" && Array.isArray(historyResult.value.data)
          ? historyResult.value.data
          : [];

      setRecentLeaves(leaves.slice(0, 5));
      setStats((previous) => ({
        ...previous,
        totalLeaves: leaves.length,
        pendingLeaves: leaves.filter((item) => item.status === "Pending").length,
        approvedLeaves: leaves.filter((item) => item.status === "Approved").length,
        rejectedLeaves: leaves.filter((item) => item.status === "Rejected").length,
      }));

      const userProfile = profileResult.status === "fulfilled" ? profileResult.value.data : null;
      const allUsers = usersResult.status === "fulfilled" ? usersResult.value.data : [];
      let resolvedManager = null;

      if (userProfile?.reportsToEmail) {
        resolvedManager = allUsers.find(
          (item) => item.email?.toLowerCase() === userProfile.reportsToEmail.toLowerCase()
        );
      }

      if (!resolvedManager && userProfile?.reportsTo) {
        try {
          const managerResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}/api/users/${userProfile.reportsTo}`
          );
          resolvedManager = managerResponse.data;
        } catch {
          resolvedManager = null;
        }
      }

      setManagerInfo(resolvedManager);

      const allHolidays =
        holidaysResult.status === "fulfilled" && Array.isArray(holidaysResult.value.data)
          ? holidaysResult.value.data
          : [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setUpcomingHolidays(
        allHolidays
          .filter((holiday) => new Date(holiday.date) >= today)
          .sort((first, second) => new Date(first.date) - new Date(second.date))
          .slice(0, 4)
      );

      const teamCount =
        teamResult.status === "fulfilled" && Array.isArray(teamResult.value.data)
          ? teamResult.value.data.length
          : 0;
      setStats((previous) => ({ ...previous, totalTeamMembers: teamCount }));
    } catch (fetchError) {
      console.error("Error loading employee dashboard:", fetchError);
      setError("We could not load your employee workspace right now.");
    } finally {
      setLoading(false);
    }
  }, [user.email, user.id]);

  useEffect(() => {
    if (user?.id && user?.email) {
      fetchEmployeeData();
    }
  }, [fetchEmployeeData, user?.email, user?.id]);

  const totalBalance = useMemo(() => {
    if (!leaveBalance) return 0;
    return (leaveBalance.sick || 0) + (leaveBalance.planned || 0) + (leaveBalance.optional || 0);
  }, [leaveBalance]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const leaveBalanceCards = useMemo(() => {
    if (!leaveBalance) return [];

    return [
      {
        label: "Sick balance",
        value: leaveBalance.sick || 0,
        note: `${leaveBalance.sickTotal || 6} allocated`,
      },
      {
        label: "Planned balance",
        value: leaveBalance.planned || 0,
        note: `${leaveBalance.plannedTotal || 12} allocated`,
      },
      {
        label: "Optional balance",
        value: leaveBalance.optional || 0,
        note: `${leaveBalance.optionalTotal || 2} allocated`,
      },
      {
        label: "LOP used",
        value: leaveBalance.lwp || 0,
        note: "Tracks unpaid leave days",
      },
    ];
  }, [leaveBalance]);

  if (loading) {
    return (
      <div className="admin-dashboard employee-workspace">
        <div className="fiori-loading-card">
          <Clock3 size={24} />
          <div>
            <strong>Loading employee workspace</strong>
            <p>Your dashboard metrics and leave activity are being prepared.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard employee-workspace">
        <div className="admin-empty-state">
          <ShieldCheck size={24} />
          <div>
            <strong>{error}</strong>
            <p>Please refresh the page and try again.</p>
          </div>
          <button className="fiori-button secondary" onClick={fetchEmployeeData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard employee-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Employee workspace</div>
          <h1>
            {getTimeBasedGreeting()}, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p>
            Keep tabs on your leave balance, recent requests, reporting line, and the next holidays
            from one place.
          </p>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-hero-meta-item">
            <span>Today</span>
            <strong>{todayLabel}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Total balance</span>
            <strong>{totalBalance} days available</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Team visibility</span>
            <strong>
              {stats.totalTeamMembers > 0
                ? `${stats.totalTeamMembers} direct reportees`
                : "Individual contributor"}
            </strong>
          </div>
        </div>
      </header>

      <section className="fiori-panel employee-banner-panel">
        <div className="employee-banner-shell">
          <img src={BannerImage} alt="Employee workspace banner" className="employee-banner-image" />
          <div className="employee-banner-overlay">
            <div className="admin-section-overline">Highlights</div>
            <h3>Stay ahead of time away, approvals, and key dates</h3>
            <p>
              Use the refreshed employee workspace to monitor leave usage, jump into requests, and
              keep your reporting context close.
            </p>
            <button className="fiori-button primary" onClick={() => setSection?.("leaves")}>
              Open Leave Management
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <div className="admin-dashboard-grid admin-dashboard-grid-compact">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Requests raised</span>
            <CalendarDays size={18} />
          </div>
          <div className="fiori-stat-value">{stats.totalLeaves}</div>
          <div className="fiori-stat-note">Total leave applications in your history</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Pending review</span>
            <Clock3 size={18} />
          </div>
          <div className="fiori-stat-value">{stats.pendingLeaves}</div>
          <div className="fiori-stat-note">Requests still awaiting a decision</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Approved</span>
            <ShieldCheck size={18} />
          </div>
          <div className="fiori-stat-value">{stats.approvedLeaves}</div>
          <div className="fiori-stat-note">Requests already cleared for time away</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Rejected</span>
            <Users size={18} />
          </div>
          <div className="fiori-stat-value">{stats.rejectedLeaves}</div>
          <div className="fiori-stat-note">Requests that need an updated resubmission</div>
        </article>
      </div>

      <div className="employee-dashboard-layout">
        <div className="employee-dashboard-primary">
          <section className="fiori-panel">
            <div className="fiori-panel-header">
              <div>
                <h3>Leave balance snapshot</h3>
                <p>Allocated, remaining, and unpaid leave usage in the same card system as admin.</p>
              </div>
              <button className="fiori-button secondary" onClick={() => setSection?.("leaves")}>
                Review leave workspace
              </button>
            </div>

            <div className="admin-dashboard-grid admin-dashboard-grid-compact">
              {leaveBalanceCards.map((card) => (
                <article key={card.label} className="fiori-stat-card">
                  <div className="fiori-stat-label">{card.label}</div>
                  <div className="fiori-stat-value">{card.value}</div>
                  <div className="fiori-stat-note">{card.note}</div>
                </article>
              ))}
            </div>
          </section>

          <section className="fiori-panel">
            <div className="fiori-panel-header">
              <div>
                <h3>Recent leave activity</h3>
                <p>Your last five leave requests with status and application notes.</p>
              </div>
              <span className="fiori-status-pill is-neutral">{recentLeaves.length} shown</span>
            </div>

            {recentLeaves.length === 0 ? (
              <div className="admin-empty-state">
                <CalendarDays size={24} />
                <div>
                  <strong>No leave applications yet</strong>
                  <p>Your requests will start appearing here once you submit them.</p>
                </div>
              </div>
            ) : (
              <div className="employee-recent-leave-list">
                {recentLeaves.map((leave) => (
                  <article key={leave._id} className="employee-recent-leave-card">
                    <div className="admin-approval-card-header">
                      <div>
                        <h4>{leave.leave_type || "Leave request"}</h4>
                        <p>
                          {formatDate(leave.start_date)} to {formatDate(leave.end_date)}
                        </p>
                      </div>
                      <span className={`fiori-status-pill ${statusToneMap[leave.status] || "is-neutral"}`}>
                        {leave.status || "Pending"}
                      </span>
                    </div>

                    <div className="admin-approval-metadata">
                      <span>{leave.days || 0} day(s)</span>
                      <span>Applied {formatDate(leave.applied_on)}</span>
                      {leave.is_half_day ? <span>Half day: {leave.half_day_period || "Selected"}</span> : null}
                    </div>

                    <div className="admin-approval-details">
                      <div className="is-wide">
                        <span>Reason</span>
                        <strong>{leave.reason || "No reason shared"}</strong>
                      </div>
                      {leave.rejection_reason ? (
                        <div className="is-wide">
                          <span>Rejection note</span>
                          <strong>{leave.rejection_reason}</strong>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="employee-dashboard-secondary">
          <section className="fiori-panel is-clickable" onClick={() => setShowHierarchy(true)}>
            <div className="fiori-panel-header">
              <div>
                <h3>Reporting line</h3>
                <p>Quick access to your current reporting structure and organization hierarchy.</p>
              </div>
              <GitBranch size={18} color="#0a6ed1" />
            </div>

            {managerInfo ? (
              <div className="employee-manager-card">
                <div className="employee-manager-avatar">
                  <span>{managerInfo.name?.charAt(0) || "M"}</span>
                  <div className="employee-manager-dot">
                    <LeaveStatusDot userId={managerInfo._id} size={14} />
                  </div>
                </div>
                <div className="employee-manager-copy">
                  <strong>{managerInfo.name || "Reporting manager"}</strong>
                  <span>{managerInfo.designation || "Designation not set"}</span>
                  <small>{managerInfo.email || "Email unavailable"}</small>
                </div>
              </div>
            ) : (
              <div className="admin-empty-state">
                <UserRound size={22} />
                <div>
                  <strong>No reporting manager assigned</strong>
                  <p>You can still open the organization hierarchy from here.</p>
                </div>
              </div>
            )}
          </section>

          <section className="fiori-panel">
            <div className="fiori-panel-header">
              <div>
                <h3>Upcoming holidays</h3>
                <p>Closest company and optional holidays relevant to your leave planning.</p>
              </div>
            </div>

            {upcomingHolidays.length === 0 ? (
              <div className="admin-empty-state">
                <CalendarDays size={22} />
                <div>
                  <strong>No upcoming holidays listed</strong>
                  <p>The holiday calendar has no future entries at the moment.</p>
                </div>
              </div>
            ) : (
              <div className="employee-holiday-list">
                {upcomingHolidays.map((holiday) => (
                  <article key={`${holiday.name}-${holiday.date}`} className="employee-holiday-card">
                    <div>
                      <strong>{holiday.name || "Holiday"}</strong>
                      <span>{formatDate(holiday.date)}</span>
                    </div>
                    <span className="fiori-status-pill is-neutral">{holiday.type || "Holiday"}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="fiori-panel">
            <div className="fiori-panel-header">
              <div>
                <h3>Quick actions</h3>
                <p>Common places employees usually need from the home workspace.</p>
              </div>
            </div>

            <div className="employee-quick-action-list">
              <button className="employee-quick-action" onClick={() => setSection?.("leaves")}>
                <div>
                  <strong>Submit or manage leave</strong>
                  <span>Open your leave form, filters, and history.</span>
                </div>
                <ArrowRight size={16} />
              </button>
              <button className="employee-quick-action" onClick={() => setSection?.("calendar")}>
                <div>
                  <strong>Check calendar</strong>
                  <span>Review holidays and company dates before planning time off.</span>
                </div>
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </aside>
      </div>

      {showHierarchy ? (
        <OrganizationHierarchy user={user} onClose={() => setShowHierarchy(false)} />
      ) : null}
    </div>
  );
};

export default EmployeeDashboard;
