import React, { useState, useEffect } from "react";

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [projectForm, setProjectForm] = useState({
    projectId: "",
    title: "",
    startDate: "",
    endDate: "",
    description: "",
    status: "Active"
  });

  const statuses = ["All", "Active", "Completed", "On Hold", "Planning"];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/projects/`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setMessage("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || project.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async () => {
    if (!projectForm.projectId || !projectForm.title || !projectForm.startDate) {
      setMessage("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/projects/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Project created successfully ✓");
        setShowNewProjectModal(false);
        setProjectForm({
          projectId: "",
          title: "",
          startDate: "",
          endDate: "",
          description: "",
          status: "Active"
        });
        fetchProjects();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(data.error || "Failed to create project");
      }
    } catch (err) {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure? This will remove the project from all assigned employees.")) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setMessage("Project deleted successfully ✓");
        fetchProjects();
        setSelectedProject(null);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("Failed to delete project");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return { bg: "#d1f4dd", text: "#0a5d2c", border: "#10b981" };
      case "Completed":
        return { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" };
      case "On Hold":
        return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" };
      case "Planning":
        return { bg: "#f3e8ff", text: "#6b21a8", border: "#a855f7" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" };
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  if (selectedProject) {
    const project = projects.find(p => p._id === selectedProject);
    
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "#f8f9fa",
        fontFamily: "Inter, system-ui, sans-serif"
      }}>
        <div style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "24px 40px"
        }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <button
              onClick={() => setSelectedProject(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                color: "#0066cc",
                fontWeight: 600,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              ← Back to Projects
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
                  {project.projectId}
                </div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "#111827" }}>
                  {project.title}
                </h1>
              </div>
              <div style={{
                padding: "10px 20px",
                background: getStatusColor(project.status).bg,
                color: getStatusColor(project.status).text,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600
              }}>
                {project.status}
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1400, margin: "40px auto", padding: "0 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
            <div>
              <div style={{
                background: "white",
                borderRadius: 16,
                padding: 32,
                marginBottom: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 700 }}>
                  Project Overview
                </h2>
                <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6, fontSize: 15 }}>
                  {project.description || "No description provided"}
                </p>
              </div>
            </div>

            <div>
              <div style={{
                background: "white",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  📅 Start Date
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                  {formatDate(project.startDate)}
                </div>
              </div>

              <div style={{
                background: "white",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  📅 End Date
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                  {formatDate(project.endDate)}
                </div>
              </div>

              <button 
                onClick={() => handleDeleteProject(project._id)}
                style={{
                  width: "100%",
                  padding: 16,
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 20
                }}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "#f8f9fa",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      {message && (
        <div style={{
          position: "fixed",
          top: 20,
          right: 20,
          background: message.includes("✓") ? "#10b981" : "#ef4444",
          color: "white",
          padding: "12px 24px",
          borderRadius: 8,
          zIndex: 10000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          {message}
        </div>
      )}

      <div style={{
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        padding: "32px 40px"
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 36, 
                fontWeight: 700,
                color: "#111827",
                marginBottom: 8
              }}>
                Projects
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: 16,
                color: "#6b7280"
              }}>
                Manage and track all projects
              </p>
            </div>
            <button
              onClick={() => setShowNewProjectModal(true)}
              style={{
                padding: "14px 24px",
                background: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(0, 102, 204, 0.3)"
              }}
            >
              + New Project
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "32px auto", padding: "0 40px" }}>
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 32,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18,
                color: "#9ca3af"
              }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 48px",
                  fontSize: 15,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  outline: "none"
                }}
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: "12px 40px 12px 16px",
                fontSize: 14,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Status" : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 24
        }}>
          {filteredProjects.map((project) => {
            const statusColors = getStatusColor(project.status);
            
            return (
              <div
                key={project._id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 0,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  cursor: "pointer"
                }}
                onClick={() => setSelectedProject(project._id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{
                  padding: "24px 24px 20px 24px",
                  background: "#f9fafb"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 600,
                      color: "#6b7280",
                      letterSpacing: "0.5px"
                    }}>
                      {project.projectId}
                    </div>
                    <div style={{
                      padding: "6px 12px",
                      background: statusColors.bg,
                      color: statusColors.text,
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      {project.status}
                    </div>
                  </div>
                  <h3 style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#111827",
                    lineHeight: 1.3
                  }}>
                    {project.title}
                  </h3>
                </div>

                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8
                    }}>
                      <span style={{ fontSize: 16 }}>📅</span>
                      <div>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 2 }}>
                          Start Date
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {formatDate(project.startDate)}
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      gap: 8
                    }}>
                      <span style={{ fontSize: 16 }}>📅</span>
                      <div>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 2 }}>
                          End Date
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {formatDate(project.endDate)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: 8
                  }}>
                    <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <span style={{ fontSize: 16, marginTop: 2 }}>📄</span>
                      <p style={{
                        margin: 0,
                        fontSize: 14,
                        color: "#6b7280",
                        lineHeight: 1.5
                      }}>
                        {project.description || "No description"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 60,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <h3 style={{ 
              margin: "0 0 8px 0",
              fontSize: 20,
              fontWeight: 600,
              color: "#111827"
            }}>
              No projects found
            </h3>
            <p style={{ 
              margin: 0,
              fontSize: 14,
              color: "#6b7280"
            }}>
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {showNewProjectModal && (
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
            zIndex: 9999
          }}
          onClick={() => setShowNewProjectModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 16,
              maxWidth: 600,
              width: "90%",
              boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 24px 0", fontSize: 24, fontWeight: 700 }}>
              Create New Project
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Project ID *
                </label>
                <input
                  type="text"
                  value={projectForm.projectId}
                  onChange={(e) => setProjectForm({ ...projectForm, projectId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14
                  }}
                  placeholder="PROJ-001"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Project Title *
                </label>
                <input
                  type="text"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14
                  }}
                  placeholder="HR Management System"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                End Date (Optional - Leave empty if ongoing)
                </label>
                <input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    minHeight: 100,
                    resize: "vertical"
                  }}
                  placeholder="Project description..."
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Status
                </label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Planning">Planning</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setProjectForm({
                    projectId: "",
                    title: "",
                    startDate: "",
                    endDate: "",
                    description: "",
                    status: "Active"
                  });
                }}
                style={{
                  padding: "12px 24px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={loading}
                style={{
                  padding: "12px 24px",
                  background: loading ? "#9ca3af" : "#0066cc",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;