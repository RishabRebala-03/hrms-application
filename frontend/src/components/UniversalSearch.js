import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Briefcase,
  Building2,
  Mail,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import LeaveStatusDot from "./LeaveStatusDot";

const UniversalSearch = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [peopleLeadInfo, setPeopleLeadInfo] = useState(null);
  const [managerInfo, setManagerInfo] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
        setAllUsers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchAllUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return [];

    return allUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(normalizedSearch) ||
        user.email?.toLowerCase().includes(normalizedSearch) ||
        user.designation?.toLowerCase().includes(normalizedSearch) ||
        user.department?.toLowerCase().includes(normalizedSearch)
    );
  }, [allUsers, searchTerm]);

  useEffect(() => {
    setShowResults(searchTerm.trim().length > 0);
  }, [searchTerm]);

  const fetchAdditionalDetails = async (user) => {
    setLoadingDetails(true);
    setPeopleLeadInfo(null);
    setManagerInfo(null);

    try {
      if (!allUsers.length) {
        setLoadingDetails(false);
        return;
      }

      if (user.peopleLeadEmail) {
        const peopleLead = allUsers.find((item) => item.email === user.peopleLeadEmail);
        if (peopleLead) setPeopleLeadInfo(peopleLead);
      }

      if (user.reportsToEmail) {
        const manager = allUsers.find((item) => item.email === user.reportsToEmail);
        if (manager) setManagerInfo(manager);
      }
    } catch (error) {
      console.error("Error fetching additional details:", error);
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

  const PersonCard = ({ person, title, tone = "default" }) => (
    <div className={`org-search-person-card ${tone === "accent" ? "is-accent" : ""}`}>
      <div className="org-search-person-avatar-wrap">
        {person.photoUrl ? (
          <img src={person.photoUrl} alt="" className="org-search-person-avatar" />
        ) : (
          <div className="org-search-person-avatar org-search-person-avatar-fallback">
            {person.name?.charAt(0) || "U"}
          </div>
        )}
        <div className="org-search-person-status">
          <LeaveStatusDot userId={person._id} size={10} />
        </div>
      </div>

      <div className="org-search-person-copy">
        <span>{title}</span>
        <strong>{person.name}</strong>
        <p>{person.designation || "No designation"}</p>
        <small>{person.email}</small>
      </div>
    </div>
  );

  return (
    <>
      <div ref={searchRef} className="org-search-shell">
        <div className="org-search-input-shell">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search organization..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => searchTerm && setShowResults(true)}
            className="input"
          />
        </div>

        {showResults && searchResults.length > 0 ? (
          <div className="org-search-results">
            {searchResults.map((user) => (
              <button
                key={user._id}
                type="button"
                className="org-search-result-card"
                onClick={() => handleProfileView(user)}
              >
                <div className="org-search-result-avatar-wrap">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt="" className="org-search-result-avatar" />
                  ) : (
                    <div className="org-search-result-avatar org-search-result-avatar-fallback">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="org-search-result-status">
                    <LeaveStatusDot userId={user._id} size={10} />
                  </div>
                </div>

                <div className="org-search-result-copy">
                  <strong>
                    {user.name}
                    {String(user._id) === String(currentUser?._id || currentUser?.id) ? " (You)" : ""}
                  </strong>
                  <p>{user.designation || "No designation"} • {user.department || "No department"}</p>
                  {user.workLocation ? <small>{user.workLocation}</small> : null}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {showResults && searchTerm && searchResults.length === 0 ? (
          <div className="org-search-results org-search-empty">
            <Search size={24} />
            <div>
              <strong>No colleagues found</strong>
              <p>Try searching by name, email, designation, or department.</p>
            </div>
          </div>
        ) : null}
      </div>

      {selectedProfile ? (
        <div className="admin-modal-overlay" onClick={closeProfile}>
          <div className="admin-modal org-search-profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="org-search-profile-hero">
              <button className="org-search-profile-close" onClick={closeProfile}>
                ×
              </button>

              <div className="org-search-profile-top">
                <div className="org-search-profile-avatar-wrap">
                  {selectedProfile.photoUrl ? (
                    <img src={selectedProfile.photoUrl} alt="" className="org-search-profile-avatar" />
                  ) : (
                    <div className="org-search-profile-avatar org-search-profile-avatar-fallback">
                      {selectedProfile.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="org-search-profile-status">
                    <LeaveStatusDot userId={selectedProfile._id} size={12} />
                  </div>
                </div>

                <div>
                  <h2>{selectedProfile.name}</h2>
                  <p>{selectedProfile.designation || "No designation available"}</p>
                </div>
              </div>
            </div>

            <div className="org-search-profile-body">
              <section className="org-search-profile-summary">
                <article className="fiori-stat-card">
                  <div className="fiori-stat-topline">
                    <span className="fiori-stat-label">Department</span>
                    <Building2 size={18} />
                  </div>
                  <div className="fiori-stat-value org-search-stat-text">
                    {selectedProfile.department || "Not set"}
                  </div>
                  <div className="fiori-stat-note">Current team or department assignment</div>
                </article>

                <article className="fiori-stat-card">
                  <div className="fiori-stat-topline">
                    <span className="fiori-stat-label">Shift Timings</span>
                    <Briefcase size={18} />
                  </div>
                  <div className="fiori-stat-value org-search-stat-text">
                    {selectedProfile.shiftTimings || "Not set"}
                  </div>
                  <div className="fiori-stat-note">Published shift or work schedule</div>
                </article>

                <article className="fiori-stat-card">
                  <div className="fiori-stat-topline">
                    <span className="fiori-stat-label">Work Location</span>
                    <MapPin size={18} />
                  </div>
                  <div className="fiori-stat-value org-search-stat-text">
                    {selectedProfile.workLocation || "Not set"}
                  </div>
                  <div className="fiori-stat-note">Current office or work location</div>
                </article>
              </section>

              <section className="fiori-panel">
                <div className="fiori-panel-header">
                  <div>
                    <h3>Profile Details</h3>
                    <p>Quick contact details available from the organization directory</p>
                  </div>
                </div>

                <div className="org-search-detail-grid">
                  <div className="org-search-detail-card">
                    <span><Mail size={14} /> Email</span>
                    <strong>{selectedProfile.email}</strong>
                  </div>
                </div>
              </section>

              {(managerInfo || selectedProfile.reportsToEmail || peopleLeadInfo || selectedProfile.peopleLeadEmail) ? (
                <section className="fiori-panel">
                  <div className="fiori-panel-header">
                    <div>
                      <h3>Reporting Network</h3>
                      <p>Direct reporting and people-lead contacts visible from the organization directory</p>
                    </div>
                  </div>

                  <div className="org-search-network-grid">
                    {managerInfo ? (
                      <PersonCard person={managerInfo} title="People Lead" />
                    ) : selectedProfile.reportsToEmail ? (
                      <div className="org-search-detail-card">
                        <span><Users size={14} /> People Lead</span>
                        <strong>{selectedProfile.reportsToEmail}</strong>
                      </div>
                    ) : null}

                    {peopleLeadInfo ? (
                      <PersonCard person={peopleLeadInfo} title="Talent Lead" tone="accent" />
                    ) : selectedProfile.peopleLeadEmail ? (
                      <div className="org-search-detail-card">
                        <span><Users size={14} /> Talent Lead</span>
                        <strong>{selectedProfile.peopleLeadEmail}</strong>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {loadingDetails ? (
                <div className="org-search-inline-note is-loading">
                  Loading additional details...
                </div>
              ) : null}

              <div className="org-search-inline-note">
                Limited profile view only. Full employee details remain restricted.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default UniversalSearch;
