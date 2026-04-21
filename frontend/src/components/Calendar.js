import React, { useState, useEffect } from "react";
import axios from "axios";

const Calendar = ({ user }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBirthdays, setShowBirthdays] = useState(true);
  const [hasDirectReports, setHasDirectReports] = useState(false);
  
  const isAdmin = user?.role === "Admin";
  const isManager = user?.role === "Manager";
  const isEmployee = user?.role === "Employee";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const holidaysRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/holidays/?start=${startDate}&end=${endDate}`
      );
      setHolidays(holidaysRes.data);

      if (isAdmin) {
        console.log("🔍 Admin: Fetching all birthdays");
        const usersRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
        const users = usersRes.data;
        const birthdayList = processBirthdays(users);
        setBirthdays(birthdayList);
      } else if (isManager) {
        console.log("🔍 Manager: Fetching team birthdays");
        const teamRes = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(user.email)}`
        );
        const teamMembers = teamRes.data;
        
        const currentUserRes = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`
        );
        const currentUserData = currentUserRes.data;
        
        const allPeople = [...teamMembers, currentUserData];
        const birthdayList = processBirthdays(allPeople);
        setBirthdays(birthdayList);
        
        if (teamMembers.length > 0) {
          setHasDirectReports(true);
        }
      } else {
        console.log("🔍 Employee: Checking for direct reports");
        try {
          const teamRes = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(user.email)}`
          );
          const teamMembers = Array.isArray(teamRes.data) ? teamRes.data : [];
          
          const currentUserRes = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`
          );
          const currentUserData = currentUserRes.data;
          
          if (teamMembers.length > 0) {
            console.log(`✅ Employee has ${teamMembers.length} direct reports`);
            setHasDirectReports(true);
            const allPeople = [...teamMembers, currentUserData];
            const birthdayList = processBirthdays(allPeople);
            setBirthdays(birthdayList);
          } else {
            console.log("✅ Regular employee: showing only own birthday");
            setHasDirectReports(false);
            const birthdayList = processBirthdays([currentUserData]);
            setBirthdays(birthdayList);
          }
        } catch (err) {
          console.log("⚠️ Error checking direct reports, showing only own birthday");
          try {
            const currentUserRes = await axios.get(
              `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`
            );
            const birthdayList = processBirthdays([currentUserRes.data]);
            setBirthdays(birthdayList);
          } catch (userErr) {
            console.error("Error fetching user data:", userErr);
            setBirthdays([]);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const processBirthdays = (users) => {
    return users
      .filter(user => user && user.dateOfBirth)
      .map(user => {
        let dobValue = user.dateOfBirth;
        if (typeof dobValue === "object" && dobValue.$date) {
          dobValue = dobValue.$date;
        }

        const dob = new Date(dobValue);
        if (isNaN(dob.getTime())) return null;

        const month = String(dob.getMonth() + 1).padStart(2, '0');
        const day = String(dob.getDate()).padStart(2, '0');

        return {
          date: `${selectedYear}-${month}-${day}`,
          name: user.name,
          employeeId: user.employeeId || user._id,
          isCurrentUser: String(user._id) === String(user.id) || String(user._id) === String(user?.id),
        };
      })
      .filter(Boolean);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const isHoliday = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => h.date === dateStr);
  };

  const isBirthday = (year, month, day) => {
    if (!showBirthdays) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return birthdays.filter(b => b.date === dateStr);
  };

  const isToday = (year, month, day) => {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day;
  };

  const renderMonth = (monthIndex) => {
    const daysInMonth = getDaysInMonth(selectedYear, monthIndex);
    const firstDay = getFirstDayOfMonth(selectedYear, monthIndex);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const holiday = isHoliday(selectedYear, monthIndex, day);
      const birthdayList = isBirthday(selectedYear, monthIndex, day);
      const today = isToday(selectedYear, monthIndex, day);
      
      let bgColor = "white";
      let borderColor = "#e5e7eb";
      let textColor = "#374151";
      
      if (today) {
        bgColor = "#dbeafe";
        borderColor = "#3b82f6";
        textColor = "#1e40af";
      } else if (holiday) {
        if (holiday.type === "Public") {
          bgColor = "#fee2e2";
          textColor = "#991b1b";
          borderColor = "#fecaca";
        } else if (holiday.type === "optional") {
          bgColor = "#fef3c7";
          textColor = "#92400e";
          borderColor = "#fde68a";
        } else {
          bgColor = "#e0f2fe";
          textColor = "#075985";
          borderColor = "#bae6fd";
        }
      } else if (birthdayList && birthdayList.length > 0) {
        bgColor = "#fce7f3";
        textColor = "#831843";
        borderColor = "#fbcfe8";
      }
      
      let titleText = "";
      if (holiday) titleText += `Holiday: ${holiday.name}`;
      if (birthdayList && birthdayList.length > 0) {
        if (titleText) titleText += "\n";
        titleText += "Birthday: " + birthdayList.map(b => 
          b.isCurrentUser ? `${b.name} (You)` : b.name
        ).join(", ");
      }
      
      days.push(
        <div 
          key={day} 
          className="calendar-day"
          style={{
            background: bgColor,
            border: today ? "2px solid #3b82f6" : `1px solid ${borderColor}`,
            fontWeight: today || holiday || (birthdayList && birthdayList.length > 0) ? 600 : 400,
            color: textColor,
            position: "relative"
          }}
          title={titleText}
        >
          {day}
          {holiday && (
            <div style={{
              position: "absolute",
              bottom: 2,
              left: "50%",
              transform: "translateX(-50%)",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: holiday.type === "public" ? "#dc2626" : 
                         holiday.type === "optional" ? "#d97706" : "#0284c7"
            }}></div>
          )}
          {birthdayList && birthdayList.length > 0 && (
            <div style={{
              position: "absolute",
              top: 2,
              right: 2,
              fontSize: 10,
            }}>🎂</div>
          )}
        </div>
      );
    }

    return (
      <div className="calendar-month-container" key={monthIndex}>
        <div className="calendar-month-header">
          {monthNames[monthIndex]} {selectedYear}
        </div>
        <div className="calendar-month">
          <div className="calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {days}
          </div>
        </div>
      </div>
    );
  };

  const publicHolidays = holidays.filter(h => h.type === "public");
  const optionalHolidays = holidays.filter(h => h.type === "optional");

  const getBirthdayVisibilityMessage = () => {
    if (isAdmin) {
      return "All employee birthdays";
    } else if (isManager) {
      return "Your birthday + team birthdays";
    } else if (hasDirectReports) {
      return "Your birthday + direct reports' birthdays";
    } else {
      return "Your birthday only";
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 18, color: "#6b7280" }}>Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* ✅ FIXED: Mobile-responsive header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: window.innerWidth <= 480 ? 16 : 18 }}>Company Calendar {selectedYear}</h3>
            <p className="muted" style={{ margin: "4px 0 0 0", fontSize: window.innerWidth <= 480 ? 12 : 14 }}>
              Organization Holidays & Birthdays
            </p>
          </div>
          
          {/* ✅ FIXED: Responsive year selector */}
          <div style={{ 
            display: "flex", 
            gap: 6, 
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: window.innerWidth <= 480 ? "flex-start" : "flex-end",
            width: window.innerWidth <= 480 ? "100%" : "auto"
          }}>
            <button 
              className="btn ghost" 
              onClick={() => setSelectedYear(selectedYear - 1)}
              style={{ padding: "6px 10px", fontSize: 12, flex: window.innerWidth <= 480 ? "0 0 auto" : "initial" }}
            >
              ← {selectedYear - 1}
            </button>
            <select 
              className="input" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ width: window.innerWidth <= 480 ? 100 : 120, padding: "6px 10px", fontSize: 12 }}
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
            <button 
              className="btn ghost" 
              onClick={() => setSelectedYear(selectedYear + 1)}
              style={{ padding: "6px 10px", fontSize: 12, flex: window.innerWidth <= 480 ? "0 0 auto" : "initial" }}
            >
              {selectedYear + 1} →
            </button>
            <button
              className="btn"
              onClick={fetchData}
              style={{ 
                padding: "6px 10px", 
                fontSize: 12,
                marginLeft: window.innerWidth <= 480 ? 0 : 8,
                width: window.innerWidth <= 480 ? "100%" : "auto",
                marginTop: window.innerWidth <= 480 ? 8 : 0
              }}
              title="Refresh calendar"
            >
              🔄 {window.innerWidth <= 480 ? "Refresh" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#dc2626",
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 14
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Legend with Birthday Toggle */}
      <div style={{ 
        display: "flex", 
        gap: window.innerWidth <= 480 ? 8 : 20,
        marginBottom: 24, 
        padding: 16, 
        background: "#f9fafb", 
        borderRadius: 8,
        flexWrap: "wrap",
        alignItems: "center",
        fontSize: window.innerWidth <= 480 ? 11 : 13
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 16, height: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 4, flexShrink: 0 }}></div>
          <span>Public Holiday ({publicHolidays.length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 16, height: 16, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 4, flexShrink: 0 }}></div>
          <span>Optional Holiday ({optionalHolidays.length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 16, height: 16, background: "#dbeafe", border: "2px solid #3b82f6", borderRadius: 4, flexShrink: 0 }}></div>
          <span>Today</span>
        </div>
        
        <div style={{ 
          marginLeft: window.innerWidth <= 480 ? 0 : "auto",
          width: window.innerWidth <= 480 ? "100%" : "auto",
          display: "flex", 
          alignItems: "center", 
          gap: 8,
          padding: "6px 12px",
          background: showBirthdays ? "#fce7f3" : "white",
          border: showBirthdays ? "2px solid #fbcfe8" : "2px solid #e5e7eb",
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        onClick={() => setShowBirthdays(!showBirthdays)}
        >
          <input 
            type="checkbox" 
            checked={showBirthdays} 
            onChange={(e) => setShowBirthdays(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <span style={{ fontWeight: 600 }}>
            🎂 Show Birthdays ({birthdays.length})
          </span>
        </div>
      </div>

      {showBirthdays && birthdays.length > 0 && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
          fontSize: window.innerWidth <= 480 ? 12 : 13,
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span>ℹ️</span>
          <span>
            <strong>Birthday visibility:</strong> {getBirthdayVisibilityMessage()}
          </span>
        </div>
      )}

      {/* Calendar Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: window.innerWidth <= 480 ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 20,
        marginBottom: 30
      }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(month => renderMonth(month))}
      </div>

      {/* Holiday List */}
      <div className="card" style={{ padding: window.innerWidth <= 480 ? 14 : 20, marginBottom: 20 }}>
        <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: window.innerWidth <= 480 ? 15 : 16 }}>
          Holiday List {selectedYear} ({holidays.length} holidays)
        </h4>
        
        {holidays.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {holidays
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((holiday, idx) => {
                const [year, month, day] = holiday.date.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                
                let bgColor, borderColor, badgeColor;
                if (holiday.type === "public") {
                  bgColor = "#fef2f2";
                  borderColor = "#fecaca";
                  badgeColor = "#dc2626";
                } else if (holiday.type === "optional") {
                  bgColor = "#fffbeb";
                  borderColor = "#fde68a";
                  badgeColor = "#d97706";
                } else {
                  bgColor = "#f0f9ff";
                  borderColor = "#bae6fd";
                  badgeColor = "#0284c7";
                }
                
                return (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: window.innerWidth <= 480 ? "wrap" : "nowrap",
                      padding: "10px 12px",
                      background: bgColor,
                      borderRadius: 6,
                      border: `1px solid ${borderColor}`,
                      gap: 8
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 auto", minWidth: 0 }}>
                      <div style={{ 
                        width: 48, 
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 13,
                        flexShrink: 0
                      }}>
                        <div style={{ color: "#6b7280" }}>{dayName}</div>
                        <div>{dateStr}</div>
                      </div>
                      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                        <div style={{ fontWeight: 600, fontSize: window.innerWidth <= 480 ? 13 : 14, wordWrap: "break-word" }}>{holiday.name}</div>
                        {holiday.description && (
                          <div style={{ fontSize: window.innerWidth <= 480 ? 11 : 12, color: "#6b7280", marginTop: 2 }}>
                            {holiday.description}
                          </div>
                        )}
                        {holiday.region && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            📍 {holiday.region}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {holiday.is_optional && (
                        <span style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          background: "#f3f4f6",
                          borderRadius: 4,
                          color: "#6b7280",
                          fontWeight: 500
                        }}>
                          Optional
                        </span>
                      )}
                      <span 
                        className="badge"
                        style={{
                          background: badgeColor,
                          color: "white",
                          fontSize: 11,
                          padding: "4px 10px",
                          textTransform: "capitalize"
                        }}
                      >
                        {holiday.type}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="muted" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <div>No holidays added for {selectedYear}</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Admin can add holidays from the Holidays section
            </div>
          </div>
        )}
      </div>

      {/* Birthday List */}
      {showBirthdays && birthdays.length > 0 && (
        <div className="card" style={{ padding: window.innerWidth <= 480 ? 14 : 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: window.innerWidth <= 480 ? 15 : 16 }}>
            🎂 Birthdays {selectedYear} ({birthdays.length} birthday{birthdays.length !== 1 ? 's' : ''})
          </h4>
          <div style={{
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 16,
            padding: 8,
            background: "#f9fafb",
            borderRadius: 6
          }}>
            {getBirthdayVisibilityMessage()}
          </div>
          
          <div style={{ display: "grid", gap: 8 }}>
            {birthdays
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((birthday, idx) => {
                const [year, month, day] = birthday.date.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                
                return (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: window.innerWidth <= 480 ? "wrap" : "nowrap",
                      padding: "10px 12px",
                      background: birthday.isCurrentUser ? "#fef3c7" : "#fef5f7",
                      borderRadius: 6,
                      border: birthday.isCurrentUser ? "2px solid #fbbf24" : "1px solid #fbcfe8",
                      gap: 8
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 auto", minWidth: 0 }}>
                      <div style={{ fontSize: 24, flexShrink: 0 }}>🎂</div>
                      <div style={{ 
                        width: 48, 
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 13,
                        flexShrink: 0
                      }}>
                        <div style={{ color: "#6b7280" }}>{dayName}</div>
                        <div>{dateStr}</div>
                      </div>
                      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: window.innerWidth <= 480 ? 13 : 14, 
                          color: birthday.isCurrentUser ? "#92400e" : "#831843",
                          wordWrap: "break-word"
                        }}>
                          {birthday.name} {birthday.isCurrentUser && "(You)"}
                        </div>
                        <div style={{ fontSize: window.innerWidth <= 480 ? 11 : 12, color: "#9ca3af", marginTop: 2 }}>
                          ID: {birthday.employeeId}
                        </div>
                      </div>
                    </div>
                    <span 
                      className="badge"
                      style={{
                        background: birthday.isCurrentUser ? "#f59e0b" : "#ec4899",
                        color: "white",
                        fontSize: 11,
                        padding: "4px 10px",
                        flexShrink: 0
                      }}
                    >
                      {birthday.isCurrentUser ? "Your Birthday" : "Birthday"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-month-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .calendar-month-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px;
          font-weight: 600;
          text-align: center;
          font-size: 14px;
        }

        .calendar-month {
          padding: 16px;
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .calendar-weekday {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          padding: 4px 0;
        }

        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          justify-items: center;
          align-items: center;
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-align: center;
        }

        .calendar-day:not(.empty):hover {
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .calendar-day.empty {
          border: none;
        }
      `}</style>

    </div>
  );
};

export default Calendar;