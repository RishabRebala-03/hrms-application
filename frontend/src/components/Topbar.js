// src/components/Topbar.js - MOBILE VIEWPORT FIX V4
import React, { useState, useEffect, useRef } from "react";
import UniversalSearch from "./UniversalSearch";
import Notifications from "./Notifications";

const Topbar = ({ user, onLogout, onNavigateToProfile, onToggleSidebar }) => {
  console.log("🔍 Topbar user data:", user);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

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

  const handleProfileClick = (e) => {
    e.stopPropagation();
    setShowDropdown(false);
    const userId = user._id || user.id;
    console.log("🔍 Topbar navigating with ID:", userId);
    onNavigateToProfile(userId);
  };

  const handleLogoutClick = (e) => {
    e.stopPropagation();
    setShowDropdown(false);
    onLogout();
  };

  // CRITICAL FIX: Calculate proper positioning for mobile
  const getDropdownStyle = () => ({
    position: "fixed",
    top: 72,
    right: 12,
    left: "auto",
    minWidth: 220,
    maxWidth: "calc(100vw - 24px)",
  });

  return (
    <header className="topbar">
      {/* LEFT SIDE - Title + Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>

        {/* Mobile Hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
        >
          ☰
        </button>

        <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>
          {user?.role === "Admin" ? "Admin Portal" : user?.role === "Manager" ? "Manager Portal" : "Employee Portal"}
        </h2>
        
        {/* Universal Search */}
        <div className="desktop-only">
          <UniversalSearch currentUser={user} />
        </div>
      </div>

      {/* RIGHT SIDE - Notifications + User Dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* ⭐ Notifications Component */}
        <Notifications currentUser={user} />

        {/* User Dropdown */}
        <div 
          ref={containerRef}
          className="profile-dropdown-container"
          style={{ position: "relative" }}
        >
          <button
            onClick={handleToggleDropdown}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleToggleDropdown(e);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "8px 16px",
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
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="profile"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #e5e7eb",
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {user?.name?.charAt(0) || "U"}
              </div>
            )}
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {user?.role}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {showDropdown ? "▲" : "▼"}
            </div>
          </button>

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
              
              {/* Dropdown Menu */}
              <div
                className="profile-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
                style={{
                  ...getDropdownStyle(),
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {user?.email}
                  </div>
                </div>

                <button
                  onClick={handleProfileClick}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleProfileClick(e);
                  }}
                  style={{
                    width: "100%",
                    padding: isMobile ? "16px 18px" : "12px 16px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "background 0.2s ease",
                    minHeight: isMobile ? 52 : 44,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  onTouchStart={(e) => e.currentTarget.style.background = "#f3f4f6"}
                >
                  <span style={{ fontSize: 16 }}>👤</span>
                  <span>My Profile</span>
                </button>

                <div style={{ height: 1, background: "#e5e7eb" }} />

                <button
                  onClick={handleLogoutClick}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleLogoutClick(e);
                  }}
                  style={{
                    width: "100%",
                    padding: isMobile ? "16px 18px" : "12px 16px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "background 0.2s ease",
                    minHeight: isMobile ? 52 : 44,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  onTouchStart={(e) => e.currentTarget.style.background = "#fef2f2"}
                >
                  <span style={{ fontSize: 16 }}>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;