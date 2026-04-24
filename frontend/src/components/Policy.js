import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BookOpenText, Filter, Plus, Search, ShieldCheck } from "lucide-react";
import DataTable from "./DataTable";

const Policy = ({ user }) => {
  const isAdmin = user?.role === "Admin";
  const [policies, setPolicies] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ categories: [], statuses: [] });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [message, setMessage] = useState("");
  const [editorState, setEditorState] = useState(null);
  const [versionsState, setVersionsState] = useState(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/policies/`, {
        params: {
          page,
          page_size: 10,
          search: search || undefined,
          category: category !== "All" ? category : undefined,
          status: status !== "All" ? status : undefined,
        },
      });
      setPolicies(response.data.items || []);
      setFilterOptions(response.data.filter_options || { categories: [], statuses: [] });
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      setPolicies([]);
      setMessage(error.response?.data?.error || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }, [category, page, search, status]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const activePolicies = useMemo(
    () => policies.filter((policy) => policy.status === "Active").length,
    [policies]
  );

  const savePolicy = async () => {
    try {
      if (!editorState) return;
      if (editorState._id) {
        await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/policies/${editorState._id}`, editorState);
      } else {
        await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/policies/`, editorState);
      }
      setEditorState(null);
      fetchPolicies();
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to save policy");
    }
  };

  const openVersions = async (policy) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/policies/${policy._id}/versions`);
      setVersionsState({ policy, items: response.data || [] });
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to load version history");
    }
  };

  const columns = [
    { key: "policyId", header: "Policy ID" },
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div className="fiori-primary-cell">
          <strong>{row.title}</strong>
          <span>{row.description || "No description provided"}</span>
        </div>
      ),
    },
    { key: "category", header: "Category" },
    { key: "status", header: "Status" },
    { key: "version", header: "Version" },
    {
      key: "updatedAt",
      header: "Updated",
      render: (row) => new Date(row.updatedAt).toLocaleDateString("en-IN"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="fiori-table-actions">
          {isAdmin ? (
            <button className="fiori-button secondary" onClick={() => setEditorState(row)}>
              Edit
            </button>
          ) : null}
          <button className="fiori-button secondary" onClick={() => openVersions(row)}>
            Versions
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="policy-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Policy Management</div>
          <h1>Policies</h1>
          <p>Browse policy records in a structured table, filter by category and status, and keep version history visible for change tracking.</p>
        </div>
        {isAdmin ? (
          <div className="employee-directory-hero-actions">
            <button
              className="fiori-button primary"
              onClick={() =>
                setEditorState({
                  policyId: "",
                  title: "",
                  description: "",
                  category: "HR",
                  status: "Draft",
                  content: "",
                })
              }
            >
              <Plus size={16} />
              <span>New policy</span>
            </button>
          </div>
        ) : null}
      </header>

      <div className="employee-directory-summary">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Policies</span>
            <BookOpenText size={18} />
          </div>
          <div className="fiori-stat-value">{total}</div>
          <div className="fiori-stat-note">Records matching the active filters</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Active</span>
            <ShieldCheck size={18} />
          </div>
          <div className="fiori-stat-value">{activePolicies}</div>
          <div className="fiori-stat-note">Policies active on the current page</div>
        </article>
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Categories</span>
            <Filter size={18} />
          </div>
          <div className="fiori-stat-value">{filterOptions.categories.length}</div>
          <div className="fiori-stat-note">Distinct categories available in the library</div>
        </article>
      </div>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Filters</h3>
            <p>Search by title or ID, and narrow by category or publishing status.</p>
          </div>
        </div>
        <div className="employee-directory-filters">
          <label className="employee-filter-field employee-filter-search">
            <span>Search</span>
            <div className="employee-filter-input-shell">
              <Search size={16} />
              <input className="input" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Policy title or ID" />
            </div>
          </label>
          <label className="employee-filter-field">
            <span>Category</span>
            <select className="input" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
              <option value="All">All</option>
              {filterOptions.categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="employee-filter-field">
            <span>Status</span>
            <select className="input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="All">All</option>
              {filterOptions.statuses.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
      </section>

      <DataTable
        columns={columns}
        rows={policies}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No policies match the current filters"
        emptyDescription="Broaden the filters or add a new policy record."
      />

      {editorState ? (
        <div className="admin-modal-overlay">
          <div className="admin-modal admin-modal-wide">
            <div className="admin-modal-header">
              <div>
                <h2>{editorState._id ? "Update policy" : "Create policy"}</h2>
                <p>Each admin save writes the previous record into version history before publishing the next one.</p>
              </div>
              <button className="fiori-button secondary" onClick={() => setEditorState(null)}>Close</button>
            </div>
            <div className="projects-modal-grid">
              <label className="fiori-form-field">
                <span>Policy ID</span>
                <input className="input" value={editorState.policyId || ""} disabled={Boolean(editorState._id)} onChange={(event) => setEditorState((current) => ({ ...current, policyId: event.target.value }))} />
              </label>
              <label className="fiori-form-field">
                <span>Title</span>
                <input className="input" value={editorState.title || ""} onChange={(event) => setEditorState((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="fiori-form-field">
                <span>Category</span>
                <input className="input" value={editorState.category || ""} onChange={(event) => setEditorState((current) => ({ ...current, category: event.target.value }))} />
              </label>
              <label className="fiori-form-field">
                <span>Status</span>
                <select className="input" value={editorState.status || "Draft"} onChange={(event) => setEditorState((current) => ({ ...current, status: event.target.value }))}>
                  <option value="Draft">Draft</option>
                  <option value="Review">Review</option>
                  <option value="Active">Active</option>
                </select>
              </label>
              <label className="fiori-form-field projects-modal-description">
                <span>Description</span>
                <textarea className="input" rows="3" value={editorState.description || ""} onChange={(event) => setEditorState((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="fiori-form-field projects-modal-description">
                <span>Content</span>
                <textarea className="input" rows="10" value={editorState.content || ""} onChange={(event) => setEditorState((current) => ({ ...current, content: event.target.value }))} />
              </label>
            </div>
            <div className="admin-modal-actions">
              <button className="fiori-button secondary" onClick={() => setEditorState(null)}>Cancel</button>
              <button className="fiori-button primary" onClick={savePolicy}>Save policy</button>
            </div>
          </div>
        </div>
      ) : null}

      {versionsState ? (
        <div className="admin-modal-overlay">
          <div className="admin-modal admin-modal-wide">
            <div className="admin-modal-header">
              <div>
                <h2>{versionsState.policy.title}</h2>
                <p>Version history for this policy record.</p>
              </div>
              <button className="fiori-button secondary" onClick={() => setVersionsState(null)}>Close</button>
            </div>
            <DataTable
              columns={[
                { key: "version", header: "Version" },
                { key: "status", header: "Status" },
                { key: "savedAt", header: "Saved", render: (row) => row.savedAt ? new Date(row.savedAt).toLocaleString("en-IN") : "—" },
                { key: "title", header: "Title" },
                { key: "description", header: "Description" },
              ]}
              rows={versionsState.items || []}
              emptyTitle="No previous versions recorded"
              emptyDescription="The first save will create a historical version entry."
            />
          </div>
        </div>
      ) : null}

      {message ? <div className="admin-toast is-error">{message}</div> : null}
    </section>
  );
};

export default Policy;
