// src/components/UniversalSearch.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import LeaveStatusDot from './LeaveStatusDot';

const UniversalSearch = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [peopleLeadInfo, setPeopleLeadInfo] = useState(null);
  const [managerInfo, setManagerInfo] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    // Fetch all users on component mount
    const fetchAllUsers = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
        setAllUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchAllUsers();
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const filtered = allUsers.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm, allUsers]);

  // Fetch additional details when profile is selected
  const fetchAdditionalDetails = async (user) => {
    setLoadingDetails(true);
    setPeopleLeadInfo(null);
    setManagerInfo(null);

    try {
      // Fetch People Lead details
      if (user.peopleLeadEmail) {
        const plRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
        const peopleLead = plRes.data.find(u => u.email === user.peopleLeadEmail);
        if (peopleLead) {
          setPeopleLeadInfo(peopleLead);
        }
      }

      // Fetch Manager details
      if (user.reportsToEmail) {
        const mgrRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
        const manager = mgrRes.data.find(u => u.email === user.reportsToEmail);
        if (manager) {
          setManagerInfo(manager);
        }
      }
    } catch (err) {
      console.error("Error fetching additional details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleProfileView = (user) => {
    setSelectedProfile(user);
    setShowResults(false);
    setSearchTerm("");
    fetchAdditionalDetails(user);
  };

  const closeProfile = () => {
    setSelectedProfile(null);
    setPeopleLeadInfo(null);
    setManagerInfo(null);
  };

  return (
    <>
      {/* Search Input */}
      <div ref={searchRef} style={{ position: "relative", width: "100%", maxWidth: 400 }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="🔍 Search organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm && setShowResults(true)}
            style={{
              width: "100%",
              padding: "10px 16px",
              fontSize: 14,
              border: "2px solid #e5e7eb",
              borderRadius: 10,
              outline: "none",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "#667eea";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "#e5e7eb";
            }}
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "white",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
              border: "1px solid #e5e7eb",
              maxHeight: 400,
              overflowY: "auto",
              zIndex: 1000,
            }}
          >
            {searchResults.map((user) => (
              <div
                key={user._id}
                onClick={() => handleProfileView(user)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f3f4f6",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt=""
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #e5e7eb",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {user.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {user.designation} • {user.department}
                    </div>
                    {/* Work Location */}
                    {user.workLocation && (
                      <div style={{ 
                        fontSize: 12, 
                        marginTop: 4,
                        color: "#4b5563",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}>
                        <span>📍</span>
                        <span>{user.workLocation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {showResults && searchTerm && searchResults.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "white",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
              border: "1px solid #e5e7eb",
              padding: 20,
              textAlign: "center",
              color: "#9ca3af",
              zIndex: 1000,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14 }}>No colleagues found</div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedProfile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={closeProfile}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              maxWidth: 600,
              width: "90%",
              maxHeight: "80vh",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: 24,
                position: "relative",
              }}
            >
              <button
                onClick={closeProfile}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "white",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  {selectedProfile.photoUrl ? (
                    <img
                      src={selectedProfile.photoUrl}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid rgba(255, 255, 255, 0.3)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        fontWeight: 700,
                        border: "3px solid rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      {selectedProfile.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'white', borderRadius: '50%', padding: 3 }}>
                    <LeaveStatusDot userId={selectedProfile._id} size={12} />
                  </div>
                </div>
                <div>
                  <h3 style={{ margin: 0, marginBottom: 4, fontSize: 22 }}>
                    {selectedProfile.name}
                  </h3>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>
                    {selectedProfile.designation}
                  </div>
                </div>
              </div>
            </div>

            {/* Body - Scrollable Content */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Email */}
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                    📧 Email
                  </div>
                  <div style={{ fontSize: 14, color: "#111827", wordBreak: "break-all" }}>
                    {selectedProfile.email}
                  </div>
                </div>

                {/* Department */}
                {selectedProfile.department && (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      🏢 Department
                    </div>
                    <div style={{ fontSize: 14, color: "#111827" }}>
                      {selectedProfile.department}
                    </div>
                  </div>
                )}

                {/* Shift Timings */}
                {selectedProfile.shiftTimings && (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      🕒 Shift Timings
                    </div>
                    <div style={{ fontSize: 14, color: "#111827" }}>
                      {selectedProfile.shiftTimings}
                    </div>
                  </div>
                )}

                {/* Work Location */}
                {selectedProfile.workLocation && (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      📍 Work Location
                    </div>
                    <div style={{ fontSize: 14, color: "#111827" }}>
                      {selectedProfile.workLocation}
                    </div>
                  </div>
                )}  

                {/* Reports To - Enhanced */}
                {managerInfo ? (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>
                      People Lead
                    </div>
                    <div
                      style={{
                        padding: 12,
                        background: "#f9fafb",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                          {managerInfo.photoUrl ? (
                            <img
                              src={managerInfo.photoUrl}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "2px solid #e5e7eb",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 700,
                                fontSize: 16,
                              }}
                            >
                              {managerInfo.name?.charAt(0) || "M"}
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: 2 }}>
                            <LeaveStatusDot userId={managerInfo._id} size={10} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                            {managerInfo.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {managerInfo.designation}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            {managerInfo.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedProfile.reportsToEmail ? (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      People Lead
                    </div>
                    <div style={{ fontSize: 14, color: "#111827" }}>
                      {selectedProfile.reportsToEmail}
                    </div>
                  </div>
                ) : null}

                {/* People Lead - Enhanced */}
                {peopleLeadInfo ? (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>
                      Talent Lead
                    </div>
                    <div
                      style={{
                        padding: 12,
                        background: "#eff6ff",
                        borderRadius: 10,
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                          {peopleLeadInfo.photoUrl ? (
                            <img
                              src={peopleLeadInfo.photoUrl}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "2px solid #93c5fd",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 700,
                                fontSize: 16,
                              }}
                            >
                              {peopleLeadInfo.name?.charAt(0) || "P"}
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: 2 }}>
                            <LeaveStatusDot userId={peopleLeadInfo._id} size={10} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e40af" }}>
                            {peopleLeadInfo.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#3b82f6" }}>
                            {peopleLeadInfo.designation}
                          </div>
                          <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 2 }}>
                            {peopleLeadInfo.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedProfile.peopleLeadEmail ? (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      Talent Lead
                    </div>
                    <div style={{ fontSize: 14, color: "#111827" }}>
                      {selectedProfile.peopleLeadEmail}
                    </div>
                  </div>
                ) : null}

                {/* Loading Indicator */}
                {loadingDetails && (
                  <div
                    style={{
                      padding: 12,
                      background: "#fffbeb",
                      borderRadius: 8,
                      border: "1px solid #fcd34d",
                      fontSize: 13,
                      color: "#92400e",
                      textAlign: "center",
                    }}
                  >
                    ⏳ Loading additional details...
                  </div>
                )}
              </div>

              {/* Footer Note */}
              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: "#f3f4f6",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#6b7280",
                  textAlign: "center",
                }}
              >
                Limited profile view • Full details restricted
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UniversalSearch;