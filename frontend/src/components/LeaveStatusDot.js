import React, { useState, useEffect } from 'react';

const LeaveStatusDot = ({ userId, size = 12 }) => {
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkLeaveStatus = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/history/${userId}`);
        const leaves = await res.json();
        
        const today = new Date().toISOString().split('T')[0];
        const onLeaveToday = leaves.some(leave => 
          leave.status === "Approved" &&
          leave.start_date <= today &&
          leave.end_date >= today
        );
        
        setIsOnLeave(onLeaveToday);
      } catch (err) {
        console.error("Error checking leave status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkLeaveStatus();
  }, [userId]);

  if (loading) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#e5e7eb', display: 'inline-block' }} />;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: isOnLeave ? '#ef4444' : '#10b981',
        display: 'inline-block',
        boxShadow: `0 0 0 2px ${isOnLeave ? '#fee2e2' : '#d1fae5'}`,
      }}
      title={isOnLeave ? "Currently on leave" : "Available"}
    />
  );
};

export default LeaveStatusDot;