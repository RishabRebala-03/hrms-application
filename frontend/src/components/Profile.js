// frontend/src/components/Profile.js
import React, { useState, useEffect } from "react";

// 🔥 UNIVERSAL DATE SANITIZER — use this everywhere
const cleanDate = (value) => {
  if (!value) return null;

  return String(value)
    .replace(/\.\d+/, "")   // remove Python microseconds
    .replace("Z", "")
    .replace("+00:00", "")
    .trim();
};

const Profile = ({ user, role, viewEmployeeId = null, onUserUpdate }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    _id: null,
    projectId: "",
    name: "",
    startDate: "",
    endDate: ""
  });

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Helper function to format date properly
  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    try {
      const d = new Date(cleanDate(dateValue));
      if (isNaN(d)) return "N/A";

      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Helper to convert date to YYYY-MM-DD format for input
  const dateToInputFormat = (value) => {
    if (!value) return "";

    const d = new Date(cleanDate(value));
    if (isNaN(d)) return "";

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
  };

  // Helper to format project dates
  const formatProjectDate = (date) => {
    if (!date) return "Present";

    const d = new Date(date);
    if (isNaN(d)) return "Present";

    return d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  // Calculate tenure from a start date until today
  const calculateTenure = (startDate) => {
    if (!startDate) return "N/A";

    const d = new Date(cleanDate(startDate));
    if (isNaN(d)) {
      console.error("❌ Invalid start date received by tenure calculator:", startDate);
      return "N/A";
    }

    const today = new Date();
    if (d > today) return "0 years 0 months 0 days";

    let years = today.getFullYear() - d.getFullYear();
    let months = today.getMonth() - d.getMonth();
    let days = today.getDate() - d.getDate();

    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return `${years} years ${months} months ${days} days`;
  };

  const fetchAvailableProjects = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/projects/`);
      const data = await res.json();
      setAvailableProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchProfile = async (userId) => {
    if (!userId) {
      setMessage("No user ID provided");
      return;
    }

    if (typeof userId !== "string") {
      console.error("❌ fetchProfile received non-string userId:", userId);
      setMessage("Invalid user ID format");
      return;
    }

    if (userId === "[object Object]") {
      console.error("❌ fetchProfile received stringified object");
      setMessage("Invalid user ID");
      return;
    }

    if (!/^[a-f0-9]{24}$/i.test(userId)) {
      console.error("❌ Invalid MongoDB ObjectId format:", userId);
      setMessage("Invalid user ID format");
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 Fetching profile for validated ID:", userId);
      
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}`);

      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error || "Employee not found");
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("✅ Profile loaded successfully for:", data.name);
      
      setProfile(data);
      setEditForm({
        name: data.name || "",
        email: data.email || "",
        designation: data.designation || "",
        department: data.department || "",
        shiftTimings: data.shiftTimings || "",
        dateOfJoining: dateToInputFormat(data.dateOfJoining),
        dateOfBirth: dateToInputFormat(data.dateOfBirth),
        projects: Array.isArray(data.projects)
          ? data.projects.map(p => (p.name ? p.name : p)).join(", ")
          : "",
        reportsToEmail: data.reportsToEmail || "",
        workLocation: data.workLocation || "",
        peopleLeadEmail: data.peopleLeadEmail || "",
      });
      setMessage("");
    } catch (err) {
      console.error("❌ Error fetching profile:", err);
      setMessage("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let targetId = null;

    console.log("📋 Profile useEffect triggered");
    console.log("   viewEmployeeId:", viewEmployeeId, "Type:", typeof viewEmployeeId);
    console.log("   user.id:", user?.id, "Type:", typeof user?.id);

    if (viewEmployeeId) {
      if (typeof viewEmployeeId === "object" && viewEmployeeId !== null) {
        console.warn("⚠️ viewEmployeeId is an object!");
        console.log("   Object keys:", Object.keys(viewEmployeeId));
        console.log("   Stringified:", JSON.stringify(viewEmployeeId, null, 2));
        
        targetId = viewEmployeeId._id || 
                  viewEmployeeId.id || 
                  viewEmployeeId.employeeId ||
                  null;
        
        if (targetId && typeof targetId === "object") {
          console.error("❌ Extracted ID is still an object:", targetId);
          targetId = String(targetId);
        }
        
        if (targetId) {
          console.log("✅ Extracted ID from object:", targetId);
        } else {
          console.error("❌ Could not extract valid ID from object");
          setMessage("Invalid employee ID: Cannot extract ID from object");
          setLoading(false);
          return;
        }
      } else if (typeof viewEmployeeId === "string") {
        targetId = viewEmployeeId;
        console.log("✅ Using string ID from viewEmployeeId:", targetId);
      } else {
        console.error("❌ viewEmployeeId has unexpected type:", typeof viewEmployeeId);
        setMessage("Invalid employee ID type: " + typeof viewEmployeeId);
        setLoading(false);
        return;
      }
    } else if (user?.id) {
      targetId = user.id;
      console.log("✅ Using logged-in user ID:", targetId);
    } else {
      console.error("❌ No user ID available");
      setMessage("No user ID available");
      setLoading(false);
      return;
    }

    if (!targetId || typeof targetId !== "string") {
      console.error("❌ Invalid targetId after extraction:", targetId, "Type:", typeof targetId);
      setMessage("Invalid employee ID format");
      setLoading(false);
      return;
    }

    if (targetId === "[object Object]" || targetId.includes("[object")) {
      console.error("❌ targetId contains object reference:", targetId);
      setMessage("Invalid employee ID: Stringified object detected");
      setLoading(false);
      return;
    }

    if (!/^[a-f0-9]{24}$/i.test(targetId)) {
      console.error("❌ targetId is not a valid MongoDB ObjectId:", targetId);
      setMessage(`Invalid employee ID format: Expected 24 hex characters, got "${targetId}"`);
      setLoading(false);
      return;
    }

    console.log("✅ All validations passed, fetching profile for:", targetId);
    setEmployeeId(targetId);
    fetchProfile(targetId);

    if (role === "Admin") {
      fetchAvailableProjects();
    }
  }, [viewEmployeeId, user, role]);

  const handleManualFetch = () => {
    if (!employeeId.trim()) {
      setMessage("Please enter Employee ID");
      return;
    }
    fetchProfile(employeeId);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage("");
  };

  const handleEditProject = (proj) => {
    setProjectForm({
      _id: proj._id,
      projectId: proj.projectId,
      name: proj.projectName || proj.name,
      startDate: dateToInputFormat(proj.startDate),
      endDate: proj.endDate ? dateToInputFormat(proj.endDate) : ""
    });
    setSelectedProjectId(proj.projectId ? String(proj.projectId) : "");
    setShowProjectModal(true);
  };

  const deleteProject = async (projectId) => {
    console.log("🗑️ deleteProject CALLED with:", projectId);

    if (!projectId || projectId === "undefined") {
      console.error("❌ ERROR: deleteProject called with INVALID projectId:", projectId);
      alert("Cannot delete project: Invalid project ID");
      return;
    }

    if (!window.confirm("Remove this project assignment?")) return;

    await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/delete_project/${employeeId}/${projectId}`, {
      method: "DELETE"
    });

    fetchProfile(employeeId);
  };

  const saveProject = async () => {
    if (!selectedProjectId && !projectForm._id) {
      setMessage("Please select a project");
      return;
    }
    
    if (!projectForm.startDate) {
      setMessage("Please select a start date");
      return;
    }

    const url = projectForm._id
      ? `${process.env.REACT_APP_BACKEND_URL}/api/users/update_project/${employeeId}/${projectForm._id}`
      : `${process.env.REACT_APP_BACKEND_URL}/api/users/assign_project/${employeeId}`;

    const payload = projectForm._id 
      ? {
          startDate: projectForm.startDate,
          endDate: projectForm.endDate || null
        }
      : {
          projectId: selectedProjectId,
          startDate: projectForm.startDate,
          endDate: projectForm.endDate || null
        };

    try {
      const res = await fetch(url, {
        method: projectForm._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Project assignment updated ✓");
        setShowProjectModal(false);
        setSelectedProjectId("");
        fetchProfile(employeeId);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(data.error || "Failed to save project");
      }
    } catch (err) {
      setMessage("Network error");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      name: profile.name || "",
      email: profile.email || "",
      designation: profile.designation || "",
      department: profile.department || "",
      shiftTimings: profile.shiftTimings || "",
      dateOfJoining: dateToInputFormat(profile.dateOfJoining),
      dateOfBirth: dateToInputFormat(profile.dateOfBirth),
      projects: Array.isArray(profile.projects)
        ? profile.projects.map(p => p.name || "").join(", ")
        : "",
      reportsToEmail: profile.reportsToEmail || "",
      workLocation: profile.workLocation || "",
      peopleLeadEmail: profile.peopleLeadEmail || "",
    });
    setMessage("");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        name: editForm.name,
        email: editForm.email,
        designation: editForm.designation,
        department: editForm.department,
        shiftTimings: editForm.shiftTimings,
        reportsToEmail: editForm.reportsToEmail || "", 
        workLocation: editForm.workLocation || "",
        peopleLeadEmail: editForm.peopleLeadEmail || "", 
      };

      if (editForm.dateOfBirth && editForm.dateOfBirth.trim() !== "") {
          const dobValue = editForm.dateOfBirth.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dobValue)) {
              updateData.dateOfBirth = dobValue;
              console.log("✅ Valid dateOfBirth:", updateData.dateOfBirth);
          } else {
              console.error("❌ Invalid dateOfBirth format:", dobValue);
              setMessage("Invalid date of birth format");
              setLoading(false);
              return;
          }
      } else {
          updateData.dateOfBirth = null;
          console.log("⚠️ dateOfBirth set to null");
      }

      if (editForm.dateOfJoining && editForm.dateOfJoining.trim() !== "") {
          const dojValue = editForm.dateOfJoining.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dojValue)) {
              updateData.dateOfJoining = dojValue;
              console.log("✅ Valid dateOfJoining:", updateData.dateOfJoining);
          } else {
              console.error("❌ Invalid dateOfJoining format:", dojValue);
              setMessage("Invalid date of joining format");
              setLoading(false);
              return;
          }
      } else {
          updateData.dateOfJoining = null;
          console.log("⚠️ dateOfJoining set to null");
      }

      console.log("\n📤 FINAL updateData being sent to backend:");
      console.log(JSON.stringify(updateData, null, 2));

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/update_user/${employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      const data = await res.json();
      console.log("📥 Response from backend:", data);

      if (res.ok) {
        setMessage("Profile updated ✓");
        setIsEditing(false);
        await fetchProfile(employeeId);
        
        if (user?.id === employeeId && onUserUpdate) {
          const updatedUserRes = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/users/${employeeId}`
          );
          const updatedUser = await updatedUserRes.json();
          console.log("📥 Updated user data:", updatedUser);
          console.log("   dateOfBirth:", updatedUser.dateOfBirth);
          console.log("   dateOfJoining:", updatedUser.dateOfJoining);
          
          onUserUpdate({
            ...user,
            photoUrl: updatedUser.photoUrl
          });
        }
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (err) {
      console.error("❌ Error in handleSave:", err);
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || "");
    setMessage(`${label} copied to clipboard`);
    setTimeout(() => setMessage(""), 2000);
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    
    if (role === "Admin" && !isOwnProfile) {
      if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
        setPasswordError("New password and confirmation are required");
        return;
      }
    } else {
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setPasswordError("All fields are required");
        return;
      }
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (isOwnProfile && passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        password: passwordForm.newPassword
      };

      if (isOwnProfile) {
        requestBody.currentPassword = passwordForm.currentPassword;
      }

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/update_user/${employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage(
          role === "Admin" && !isOwnProfile 
            ? `Password changed successfully for ${profile?.name} ✓`
            : "Password changed successfully ✓"
        );
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setMessage(""), 3000);
      } else {
        setPasswordError(data.error || "Failed to change password");
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const isOwnProfile = user?.id === employeeId;

  const canEditProfile = role === "Admin";                 // profile fields
  const canChangePassword = role === "Admin" || isOwnProfile;
  const canChangePhoto = role === "Admin" || isOwnProfile;
  const showSearch = role === "Admin" && !viewEmployeeId;

  return (
    <div className="panel">
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>
          {viewEmployeeId
            ? "Employee Profile"
            : isOwnProfile
            ? "My Profile"
            : "Employee Profile"}
        </h3>
        <p className="muted">
          {viewEmployeeId
            ? "Viewing team member profile"
            : isOwnProfile
            ? "View and manage your personal information"
            : "View and manage employee information"}
        </p>
      </div>

      {profile && !isEditing && (
        <div style={{ marginTop: 20 }}>
          <div
            className="card"
            style={{
              padding: 24,
              marginBottom: 20,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ position: "relative" }}>
                  <img
                      src={
                        profile.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}`
                      }
                    alt="Profile"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid rgba(255, 255, 255, 0.3)"
                    }}
                  />
                </div>
                <div>
                  <h2 style={{ margin: 0, marginBottom: 8, fontSize: 28 }}>
                    {profile.name}
                  </h2>
                  <div style={{ fontSize: 16, opacity: 0.95, marginBottom: 4 }}>
                    {profile.designation}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.85 }}>
                    {profile.department || "No Department"}
                  </div>
                  {profile.workLocation && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{ 
                          fontSize: 12, 
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "rgba(255, 255, 255, 0.7)"
                        }}
                      >
                        Work Location
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>
                        {profile.workLocation}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {profile.role}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 20,
            }}
          >
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>
                Contact Information
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 4 }}
                  >
                    Email
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ flex: 1, wordBreak: "break-all" }}>
                      {profile.email}
                    </span>
                    <button
                      className="btn ghost"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => copyToClipboard(profile.email, "Email")}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Employee ID
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ 
                      fontFamily: "monospace", 
                      fontSize: 13, 
                      wordBreak: "break-all",
                      fontWeight: 600,
                      color: "#667eea"
                    }}>
                      {profile.employeeId || profile._id}
                    </span>
                    <button
                      className="btn ghost"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => copyToClipboard(profile.employeeId || profile._id, "Employee ID")}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>
                Personal Information
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Date of Birth
                  </div>
                  <div>{formatDate(profile.dateOfBirth)}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>
                Work Information
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 4 }}
                  >
                    Shift Timings
                  </div>
                  <div>{profile.shiftTimings || "Not Set"}</div>
                </div>

                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 4 }}
                  >
                    Date of Joining
                  </div>
                  <div>{formatDate(profile.dateOfJoining)}</div>
                    
                  <div style={{ marginTop: 4, fontSize: 13, color: "#10b981" }}>
                    Tenure: {calculateTenure(profile.dateOfJoining)}
                  </div>
                </div>

                {profile.reportsToEmail && (
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      Reports To
                    </div>
                    <div>{profile.reportsToEmail}</div>
                  </div>
                )}

                {profile.peopleLeadEmail && (
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      Talent Lead
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{profile.peopleLeadEmail}</span>
                      <button
                        className="btn ghost"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => copyToClipboard(profile.peopleLeadEmail, "People Lead Email")}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>Projects</h4>

              {role === "Admin" && (
                <button
                  className="btn"
                  onClick={() => {
                    setProjectForm({ 
                      _id: null, 
                      projectId: "",
                      name: "", 
                      startDate: dateToInputFormat(new Date()),
                      endDate: "" 
                    });
                    setSelectedProjectId("");
                    setShowProjectModal(true);
                  }}
                  style={{ marginBottom: 12 }}
                >
                  ➕ Assign Project
                </button>
              )}

              {Array.isArray(profile.projects) && profile.projects.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {profile.projects.map((proj) => {
                    if (!proj || !proj._id) {
                      console.error("❌ Invalid project object:", proj);
                      return null;
                    }
                    const startDate = new Date(proj.startDate);
                    const endDate = proj.endDate ? new Date(proj.endDate) : new Date();

                    let duration = "N/A";

                    if (!isNaN(startDate) && !isNaN(endDate)) {
                      const ms = endDate - startDate;
                      const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
                      const months = Math.floor(totalDays / 30);
                      const days = totalDays % 30;

                      duration = proj.endDate
                        ? `${months} months ${days} days`
                        : `Ongoing • ${months} months ${days} days`;
                    }
                    return (
                      <div 
                        key={proj._id}
                        style={{
                          padding: 14,
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          background: proj.endDate ? "#f3f4f6" : "#ecfdf5"
                        }}
                      >
                        <strong style={{ fontSize: 16 }}>{proj.projectName || proj.name}</strong>

                        <div style={{ fontSize: 13, marginTop: 4, color: "#6b7280" }}>
                          {formatProjectDate(proj.startDate)} → {formatProjectDate(proj.endDate)}
                        </div>

                        <div style={{ fontSize: 13, marginTop: 4, color: "#10b981" }}>
                          {duration}
                        </div>

                        {role === "Admin" && (
                          <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                            <button
                              className="btn ghost"
                              onClick={() => handleEditProject(proj)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn ghost"
                              style={{ color: "red", borderColor: "red" }}
                              onClick={() => deleteProject(proj._id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="muted">No projects assigned</div>
              )}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>Leave Balance</h4>
              {profile.leaveBalance ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>Sick</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>
                      {profile.leaveBalance.sick || 0}
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>Planned</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
                      {profile.leaveBalance.planned || 0}
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>Optional</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                      {profile.leaveBalance.optional || 0}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="muted">No leave balance data</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            {canEditProfile && (
              <button className="btn" onClick={handleEdit}>
                ✏️ Edit Profile
              </button>
            )}

            {canChangePassword && (
              <button 
                className="btn ghost" 
                onClick={() => setShowPasswordModal(true)}
                style={{ 
                  border: "2px solid #667eea",
                  color: "#667eea"
                }}
              >
                🔒 Change Password
              </button>
            )}
          </div>

          <br></br>
          {canChangePhoto && (
          <>
            <button
              className="btn ghost"
              onClick={() => document.getElementById("uploadPhotoInput").click()}
              style={{
                border: "2px solid #667eea",
                color: "#667eea"
              }}
            >
              📸 Change Photo
            </button>

            <input
              type="file"
              id="uploadPhotoInput"
              style={{ display: "none" }}
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                if (!e.target.files.length) return;

                const file = e.target.files[0];

                if (file.size > 2 * 1024 * 1024) {
                  setMessage("Error: File size must be under 2 MB");
                  return;
                }

                const formData = new FormData();
                formData.append("photo", file);

                const res = await fetch(
                  `${process.env.REACT_APP_BACKEND_URL}/api/users/upload_photo/${employeeId}`,
                  {
                    method: "POST",
                    body: formData
                  }
                );

                const data = await res.json();

                if (res.ok) {
                  setMessage("Profile photo updated ✓");
                  fetchProfile(employeeId);
                } else {
                  setMessage("Error: " + data.error);
                }
              }}
            />
          </>
        )}
        </div>
      )}

      {profile && isEditing && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 16 }}>Edit Profile Information</h4>

          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Full Name *
              </label>
              <input
                className="input"
                value={editForm.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Full Name"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Email *
              </label>
              <input
                className="input"
                type="email"
                value={editForm.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Email"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Designation *
              </label>
              <input
                className="input"
                value={editForm.designation}
                onChange={(e) =>
                  handleInputChange("designation", e.target.value)
                }
                placeholder="Designation"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Department
              </label>
              <input
                className="input"
                value={editForm.department}
                onChange={(e) =>
                  handleInputChange("department", e.target.value)
                }
                placeholder="Department"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Shift Timings
              </label>
              <input
                className="input"
                value={editForm.shiftTimings}
                onChange={(e) =>
                  handleInputChange("shiftTimings", e.target.value)
                }
                placeholder="e.g., 9:00 AM - 6:00 PM"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Date of Joining
              </label>
              <input
                className="input"
                type="date"
                value={editForm.dateOfJoining}
                onChange={(e) =>
                  handleInputChange("dateOfJoining", e.target.value)
                }
              />
            </div>

            <div>
            <label
              style={{
                fontSize: 12,
                color: "#6b7280",
                display: "block",
                marginBottom: 4,
              }}
            >
              Date of Birth
            </label>
            <input
              className="input"
              type="date"
              value={editForm.dateOfBirth}
              onChange={(e) =>
                handleInputChange("dateOfBirth", e.target.value)
              }
              max={new Date().toISOString().split('T')[0]}
            />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Work Location
              </label>
              <input
                className="input"
                value={editForm.workLocation}
                onChange={(e) => handleInputChange("workLocation", e.target.value)}
                placeholder="e.g., Hyderabad Office, Remote"
              />
            </div>

            {role === "Admin" && (
              <>
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    People Lead / HR Manager Email
                  </label>
                  <input
                    className="input"
                    type="email"
                    value={editForm.peopleLeadEmail || ""}
                    onChange={(e) => handleInputChange("peopleLeadEmail", e.target.value)}
                    placeholder="hr@example.com"
                  />
                </div>
              </>
            )}
          </div>

          {role === "Admin" && (
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Manager's Email (Reports To)
              </label>
              <input
                className="input"
                type="email"
                value={editForm.reportsToEmail || ""}
                onChange={(e) => handleInputChange("reportsToEmail", e.target.value)}
                placeholder="manager@example.com"
              />
            </div>
          )}

          <br></br>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn"
              onClick={handleSave}
              disabled={
                loading ||
                !editForm.name ||
                !editForm.email ||
                !editForm.designation
              }
            >
              {loading ? "Saving..." : "💾 Save Changes"}
            </button>
            <button
              className="btn ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showPasswordModal && (
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
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordError("");
          }}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 16,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 22 }}>
              🔒 Change Password
            </h3>
            <p style={{ marginBottom: 24, fontSize: 14, color: "#6b7280" }}>
              {role === "Admin" && !isOwnProfile
                ? `Set a new password for ${profile?.name}`
                : "Enter your current password and choose a new one"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {isOwnProfile && (
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    Current Password *
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  New Password *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  autoFocus={!isOwnProfile}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  Confirm New Password *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>

              {passwordError && (
                <div
                  style={{
                    padding: 12,
                    background: "#fef2f2",
                    borderRadius: 8,
                    color: "#ef4444",
                    fontSize: 14,
                    border: "1px solid #fecaca",
                  }}
                >
                  {passwordError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <button
                className="btn ghost"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordError("");
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handlePasswordChange}
                disabled={
                  loading || 
                  !passwordForm.newPassword || 
                  !passwordForm.confirmPassword ||
                  (isOwnProfile && !passwordForm.currentPassword)
                }
                style={{
                  background: loading ? "#cbd5e1" : "#667eea",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectModal && (
        <div className="overlay">
          <div className="modal">
            <h3>{projectForm._id ? "Edit Project Assignment" : "Assign Project"}</h3>

            {!projectForm._id ? (
              <>
                <label>Select Project *</label>
                <select
                  className="input"
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    const selected = availableProjects.find(p => p._id === e.target.value);
                    if (selected) {
                      setProjectForm({ 
                        ...projectForm, 
                        name: selected.title,
                        projectId: selected._id 
                      });
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    marginBottom: 16
                  }}
                >
                  <option value="">-- Select a Project --</option>
                  {availableProjects.map((proj) => (
                    <option key={proj._id} value={proj._id}>
                      {proj.projectId} - {proj.title}
                    </option>
                  ))}
                </select>

                {selectedProjectId && (
                  <div style={{
                    padding: 12,
                    background: "#f9fafb",
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 14,
                    color: "#6b7280"
                  }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Project:</strong> {projectForm.name}
                    </div>
                    {availableProjects.find(p => p._id === selectedProjectId)?.description && (
                      <div>
                        <strong>Description:</strong>{" "}
                        {availableProjects.find(p => p._id === selectedProjectId).description}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <label>Project Name</label>
                <input
                  className="input"
                  value={projectForm.name}
                  disabled
                  style={{
                    background: "#f3f4f6",
                    cursor: "not-allowed",
                    marginBottom: 16
                  }}
                />
              </>
            )}
          
            <label>Employee's Start Date *</label>
            <input
              className="input"
              type="date"
              value={projectForm.startDate}
              onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
              style={{ marginBottom: 16 }}
            />

            <label>Employee's End Date (Leave empty if ongoing)</label>
            <input
              className="input"
              type="date"
              value={projectForm.endDate}
              onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
              min={projectForm.startDate}
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
              <button 
                className="btn" 
                onClick={saveProject}
                disabled={!selectedProjectId && !projectForm._id}
              >
                {projectForm._id ? "Update" : "Assign"}
              </button>
              <button 
                className="btn ghost" 
                onClick={() => {
                  setShowProjectModal(false);
                  setSelectedProjectId("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background:
              message.includes("Error") || message.includes("Failed")
                ? "#fef2f2"
                : "#e6f0ff",
            borderRadius: 8,
            color:
              message.includes("Error") || message.includes("Failed")
                ? "#ef4444"
                : "#1f6feb",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {loading && !profile && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#9ca3af",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16 }}>Loading profile...</div>
        </div>
      )}
    </div>
  );
};

export default Profile;