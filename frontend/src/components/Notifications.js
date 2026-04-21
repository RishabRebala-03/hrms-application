// src/components/Notifications.js - MOBILE VIEWPORT FIX V4
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const Notifications = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const containerRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;

  const fetchNotifications = async () => {
    try {
      const userId = currentUser?.id || currentUser?._id;
      if (!userId) return;

      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/${userId}`
      );
      
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    if (currentUser?.id || currentUser?._id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      
      const handleRefresh = () => {
        console.log("🔔 Notification refresh triggered");
        fetchNotifications();
      };
      window.addEventListener('refreshNotifications', handleRefresh);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', handleRefresh);
      };
    }
  }, [currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    // Prevent body scroll when dropdown is open on mobile
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (isMobile) {
        document.body.style.overflow = '';
      }
    };
  }, [showDropdown, isMobile]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark_read/${notificationId}`
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const userId = currentUser?.id || currentUser?._id;
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark_all_read/${userId}`
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      setLoading(true);
      const userId = currentUser?.id || currentUser?._id;
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/clear_all/${userId}`
      );
      setNotifications([]);
      setUnreadCount(0);
      setShowClearConfirm(false);
      fetchNotifications();
    } catch (err) {
      console.error("Error clearing all notifications:", err);
      alert("Failed to clear notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/${notificationId}`
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "leave_approved":
        return "✅";
      case "leave_rejected":
        return "❌";
      case "leave_request":
        return "📋";
      case "leave_cancelled":
        return "🚫";
      case "leave_escalated":
        return "⚠️";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "leave_approved":
        return { bg: "#d1f4dd", border: "#7de3a6" };
      case "leave_rejected":
        return { bg: "#ffe0e0", border: "#ffb3b3" };
      case "leave_request":
        return { bg: "#e0f2fe", border: "#7dd3fc" };
      case "leave_cancelled":
        return { bg: "#fef3c7", border: "#fbbf24" };
      case "leave_escalated":
        return { bg: "#fee2e2", border: "#fca5a5" };
      default:
        return { bg: "#f3f4f6", border: "#d1d5db" };
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    
    try {
      let date;
      
      if (typeof timestamp === 'object' && timestamp.$date) {
        date = new Date(timestamp.$date);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        console.warn("Unknown timestamp format:", timestamp);
        return "";
      }

      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", timestamp);
        return "";
      }

      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch (err) {
      console.error("Error formatting timestamp:", err, timestamp);
      return "";
    }
  };

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDropdown(!showDropdown);
  };

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDropdown(false);
  };

  // CRITICAL FIX: Calculate proper positioning for mobile
  const getDropdownStyle = () => {
    if (!isMobile) {
      // Desktop - normal absolute positioning
      return {
        position: "absolute",
        top: "calc(100% + 12px)",
        right: 0,
        width: 420,
        maxHeight: 600,
      };
    }
    
    // Mobile - use fixed positioning relative to button position
    if (containerRef.current && showDropdown) {
      const rect = containerRef.current.getBoundingClientRect();
      const topPosition = rect.bottom + 8; // 8px gap below button
      const viewportHeight = window.innerHeight;
      const maxHeight = viewportHeight - topPosition - 20; // 20px bottom padding
      
      return {
        position: "fixed",
        top: topPosition,
        right: 12,
        left: 12,
        width: "auto",
        maxHeight: Math.min(maxHeight, viewportHeight * 0.7), // Max 70% of viewport
      };
    }
    
    // Fallback for mobile
    return {
      position: "fixed",
      top: 72,
      right: 12,
      left: 12,
      width: "auto",
      maxHeight: "calc(100vh - 90px)",
    };
  };

  return (
    <div 
      ref={containerRef}
      className="notifications-dropdown-container"
      style={{ position: "relative" }}
    >
      {/* Bell Icon Button */}
      <button
        onClick={handleToggleDropdown}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleToggleDropdown(e);
        }}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "50%",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f9fafb";
          e.currentTarget.style.borderColor = "#d1d5db";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.borderColor = "#e5e7eb";
        }}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#ef4444",
              color: "white",
              borderRadius: "50%",
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              border: "2px solid white",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleBackdropClick}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleBackdropClick(e);
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 9998,
            }}
          />

          {/* Notifications Panel */}
          <div
            className="notifications-dropdown-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              ...getDropdownStyle(),
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              zIndex: 9999,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                background: "#f9fafb",
                flexShrink: 0,
              }}
            >
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: 8
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {unreadCount} unread
                    </p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#667eea",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    {loading ? "..." : "Mark all read"}
                  </button>
                )}
              </div>

              {/* Clear All Button */}
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    color: "#dc2626",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fef2f2";
                    e.currentTarget.style.borderColor = "#fca5a5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  🗑️ Clear All Notifications
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔕</div>
                  <div style={{ fontSize: 14 }}>No notifications yet</div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const colors = getNotificationColor(notif.type);
                  return (
                    <div
                      key={notif._id}
                      style={{
                        padding: isMobile ? 16 : 14,
                        borderBottom: "1px solid #f3f4f6",
                        background: notif.read ? "white" : "#fefce8",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        position: "relative",
                        minHeight: isMobile ? 60 : "auto",
                      }}
                      onMouseEnter={(e) => {
                        if (notif.read) e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        if (notif.read) e.currentTarget.style.background = "white";
                      }}
                      onClick={() => {
                        if (!notif.read) {
                          markAsRead(notif._id);
                        }
                      }}
                    >
                      <div style={{ display: "flex", gap: 12 }}>
                        {/* Icon */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: colors.bg,
                            border: `2px solid ${colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            flexShrink: 0,
                          }}
                        >
                          {getNotificationIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: notif.read ? 400 : 600,
                              color: "#111827",
                              marginBottom: 4,
                              lineHeight: 1.4,
                            }}
                          >
                            {notif.message}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>{formatTimestamp(notif.createdAt)}</span>
                            {!notif.read && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#ef4444",
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif._id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#9ca3af",
                            cursor: "pointer",
                            fontSize: 16,
                            padding: 4,
                            lineHeight: 1,
                            flexShrink: 0,
                            minWidth: 28,
                            minHeight: 28,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: "white",
              padding: 28,
              borderRadius: 12,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>
              🗑️
            </div>
            <h3 style={{ 
              margin: 0, 
              marginBottom: 12, 
              fontSize: 20, 
              fontWeight: 600,
              textAlign: "center" 
            }}>
              Clear All Notifications?
            </h3>
            <p style={{ 
              margin: 0, 
              marginBottom: 24, 
              color: "#6b7280", 
              fontSize: 14,
              textAlign: "center",
              lineHeight: 1.5
            }}>
              This will permanently delete all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}. 
              This action cannot be undone.
            </p>
            
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={clearAllNotifications}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Clearing..." : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;