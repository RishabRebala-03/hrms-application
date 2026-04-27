import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  Plus,
  Search,
  Target,
  Trash2,
} from "lucide-react";

const statusToneMap = {
  Active: "is-approved",
  Completed: "is-neutral",
  "On Hold": "is-pending",
  Planning: "is-neutral",
};

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [projectForm, setProjectForm] = useState({
    projectId: "",
    title: "",
    startDate: "",
    endDate: "",
    description: "",
    status: "Active",
  });

  const statuses = ["All", "Active", "Completed", "On Hold", "Planning"];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/projects/`);
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setMessage("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        project.title?.toLowerCase().includes(normalizedQuery) ||
        project.projectId?.toLowerCase().includes(normalizedQuery) ||
        project.description?.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        selectedStatus === "All" || project.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, selectedStatus]);

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const activeProjects = projects.filter((project) => project.status === "Active").length;

  const formatDate = (value) => {
    if (!value) return "Not set";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const showToast = (nextMessage) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const resetProjectForm = () => {
    setProjectForm({
      projectId: "",
      title: "",
      startDate: "",
      endDate: "",
      description: "",
      status: "Active",
    });
  };

  const handleCreateProject = async () => {
    if (!projectForm.projectId || !projectForm.title || !projectForm.startDate) {
      showToast("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/projects/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to create project");
        return;
      }

      await fetchProjects();
      setShowNewProjectModal(false);
      resetProjectForm();
      showToast("Project created successfully");
    } catch (error) {
      console.error("Error creating project:", error);
      showToast("Network error while creating project");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Delete this project and remove it from assigned employees?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        showToast("Failed to delete project");
        return;
      }

      await fetchProjects();
      setSelectedProjectId(null);
      showToast("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);
      showToast("Failed to delete project");
    }
  };

  if (selectedProject) {
    return (
      <section className="projects-workspace">
        <header className="admin-hero">
          <div>
            <button
              className="fiori-button secondary project-back-button"
              onClick={() => setSelectedProjectId(null)}
            >
              <ArrowLeft size={16} />
              <span>Back to projects</span>
            </button>
            <div className="admin-section-overline">Project Portfolio</div>
            <h1>{selectedProject.title}</h1>
            <p>
              Review the schedule, delivery notes, and current status for this project in one
              place.
            </p>
          </div>

          <div className="admin-hero-meta">
            <div className="admin-hero-meta-item">
              <span>Project ID</span>
              <strong>{selectedProject.projectId}</strong>
            </div>
            <div className="admin-hero-meta-item">
              <span>Status</span>
              <strong>{selectedProject.status}</strong>
            </div>
            <div className="admin-hero-meta-item">
              <span>Timeline</span>
              <strong>{formatDate(selectedProject.startDate)}</strong>
            </div>
          </div>
        </header>

        <section className="projects-detail-grid">
          <div className="projects-detail-main">
            <section className="fiori-panel">
              <div className="fiori-panel-header">
                <div>
                  <h3>Project Overview</h3>
                  <p>Delivery context and core scope for the selected project</p>
                </div>
                <span
                  className={`fiori-status-pill ${
                    statusToneMap[selectedProject.status] || "is-neutral"
                  }`}
                >
                  {selectedProject.status}
                </span>
              </div>

              <div className="projects-overview-copy">
                {selectedProject.description || "No project description has been added yet."}
              </div>
            </section>
          </div>

          <aside className="projects-detail-side">
            <article className="fiori-stat-card">
              <div className="fiori-stat-topline">
                <span className="fiori-stat-label">Start Date</span>
                <CalendarDays size={18} />
              </div>
              <div className="fiori-stat-value project-detail-value">
                {formatDate(selectedProject.startDate)}
              </div>
              <div className="fiori-stat-note">Planned project kickoff</div>
            </article>

            <article className="fiori-stat-card">
              <div className="fiori-stat-topline">
                <span className="fiori-stat-label">End Date</span>
                <Target size={18} />
              </div>
              <div className="fiori-stat-value project-detail-value">
                {formatDate(selectedProject.endDate)}
              </div>
              <div className="fiori-stat-note">Target completion milestone</div>
            </article>

            <button
              className="fiori-button secondary danger full-width"
              onClick={() => handleDeleteProject(selectedProject._id)}
            >
              <Trash2 size={16} />
              <span>Delete project</span>
            </button>
          </aside>
        </section>
      </section>
    );
  }

  return (
    <section className="projects-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Project Portfolio</div>
          <h1>Projects</h1>
          <p>
            Track the delivery portfolio, filter active work quickly, and create new project
            records from the same workspace.
          </p>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-hero-meta-item">
            <span>Total projects</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Active projects</span>
            <strong>{activeProjects}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Filtered view</span>
            <strong>{filteredProjects.length}</strong>
          </div>
        </div>
      </header>

      <section className="projects-summary-grid">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Portfolio Size</span>
            <FolderKanban size={18} />
          </div>
          <div className="fiori-stat-value">{projects.length}</div>
          <div className="fiori-stat-note">Projects available in the current workspace</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Active Delivery</span>
            <Target size={18} />
          </div>
          <div className="fiori-stat-value">{activeProjects}</div>
          <div className="fiori-stat-note">Projects marked as actively in motion</div>
        </article>

        <article className="fiori-stat-card is-actionable" onClick={() => setShowNewProjectModal(true)}>
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Create New</span>
            <Plus size={18} />
          </div>
          <div className="fiori-stat-value">New</div>
          <div className="fiori-inline-link">Open the project creation form</div>
        </article>
      </section>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Filters</h3>
            <p>Search across the project portfolio by title, ID, description, or status</p>
          </div>
        </div>

        <div className="projects-filter-grid">
          <label className="employee-filter-field employee-filter-search">
            <span>Search</span>
            <div className="employee-filter-input-shell">
              <Search size={16} />
              <input
                className="input"
                type="text"
                placeholder="Search by title, project ID, or description"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </label>

          <label className="employee-filter-field">
            <span>Status</span>
            <select
              className="input"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="fiori-loading-card">
          <FolderKanban size={28} />
          <div>
            <strong>Loading project portfolio</strong>
            <p>Preparing current project records and delivery status.</p>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="admin-empty-state">
          <ClipboardList size={28} />
          <div>
            <strong>No projects match the current filters</strong>
            <p>Adjust the search or status filter to expand the portfolio view.</p>
          </div>
        </div>
      ) : (
        <section className="fiori-panel">
          <div className="fiori-panel-header">
            <div>
              <h3>Project Table</h3>
              <p>Portfolio records displayed in a dense operational table.</p>
            </div>
          </div>

          <div className="fiori-table-shell">
            <table className="fiori-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Description</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project._id}>
                    <td>
                      <div className="fiori-primary-cell">
                        <strong>{project.title || "Untitled project"}</strong>
                        <span>{project.projectId || "No project ID"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`fiori-status-pill ${statusToneMap[project.status] || "is-neutral"}`}>
                        {project.status || "Unknown"}
                      </span>
                    </td>
                    <td>{formatDate(project.startDate)}</td>
                    <td>{formatDate(project.endDate)}</td>
                    <td>{project.description || "No project description available."}</td>
                    <td>
                      <button className="fiori-button secondary" onClick={() => setSelectedProjectId(project._id)}>
                        Open details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showNewProjectModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewProjectModal(false)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Create Project</h2>
                <p>Add a new project record to the delivery portfolio</p>
              </div>
            </div>

            <div className="projects-modal-grid">
              <label className="fiori-form-field">
                <label>Project ID</label>
                <input
                  className="input"
                  value={projectForm.projectId}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, projectId: event.target.value })
                  }
                  placeholder="PROJ-001"
                />
              </label>

              <label className="fiori-form-field">
                <label>Project Title</label>
                <input
                  className="input"
                  value={projectForm.title}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, title: event.target.value })
                  }
                  placeholder="People operations platform"
                />
              </label>

              <label className="fiori-form-field">
                <label>Start Date</label>
                <input
                  className="input"
                  type="date"
                  value={projectForm.startDate}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, startDate: event.target.value })
                  }
                />
              </label>

              <label className="fiori-form-field">
                <label>End Date</label>
                <input
                  className="input"
                  type="date"
                  value={projectForm.endDate}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, endDate: event.target.value })
                  }
                />
              </label>

              <label className="fiori-form-field">
                <label>Status</label>
                <select
                  className="input"
                  value={projectForm.status}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, status: event.target.value })
                  }
                >
                  {statuses
                    .filter((status) => status !== "All")
                    .map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                </select>
              </label>

              <label className="fiori-form-field projects-modal-description">
                <label>Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, description: event.target.value })
                  }
                  placeholder="Describe the scope, goals, or current delivery notes"
                />
              </label>
            </div>

            <div className="admin-modal-actions">
              <button
                className="fiori-button secondary"
                onClick={() => {
                  setShowNewProjectModal(false);
                  resetProjectForm();
                }}
              >
                Cancel
              </button>
              <button className="fiori-button primary" onClick={handleCreateProject} disabled={saving}>
                {saving ? "Creating..." : "Create project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`admin-toast ${
            message.toLowerCase().includes("failed") || message.toLowerCase().includes("please")
              ? "is-error"
              : "is-success"
          }`}
        >
          {message}
        </div>
      )}
    </section>
  );
};

export default Projects;
