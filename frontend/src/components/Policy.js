import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const policies = [
  {
    id: "1001",
    title: "Leave Policy Guidelines",
    description:
      "Comprehensive policy document that outlines important guidelines for employee leave management including Earned Leave, Privileged Leave, Casual Leave, and Sick Leave.",
    category: "HR",
    status: "Active",
    updated: "01/01/2026",
    dateAdded: "29/12/2025",
    dateAmended: "01/01/2026",
    sections: [
      { id: "objective", title: "Earned Leave (EL) Objective" },
      { id: "cycle", title: "Leave Cycle" },
      { id: "carryforward", title: "Carry Forward" },
      { id: "application", title: "Leave Application Procedure" },
      { id: "planned", title: "Planned Leave" },
      { id: "unplanned", title: "Unplanned Leave" },
      { id: "supervisor", title: "Supervisor Authority" },
      { id: "notice", title: "Leave During Notice Period" },
      { id: "privileged", title: "Privileged Leave (PL)" },
      { id: "casual", title: "Casual Leave (CL) / Sick Leave (SL)" },
      { id: "lwp", title: "Leave Without Pay (LWP)" },
      { id: "summary", title: "Summary" },
    ],
    content: `
      <h2 id="objective">Earned Leave (EL) Objective</h2>
      <p>The objective of this leave policy is to ensure that all employees have adequate time away from work while managing the accrual of leave to prevent excessive buildup on the company's leave balance sheet.</p>

      <h2 id="cycle">Leave Cycle</h2>
      <ul>
        <li><strong>Cycle Duration:</strong> January 1st, 2026 to December 31st, 2026 of the following year.</li>
        <li><strong>Accrual:</strong> Employees are entitled to 1 day of paid leave for every month worked.</li>
      </ul>

      <h2 id="carryforward">Carry Forward</h2>
      <ul>
        <li>A maximum of 12 leaves may be carried forward into the next leave cycle.</li>
        <li>Any leaves exceeding 12 days will lapse.</li>
      </ul>

      <h2 id="application">Leave Application Procedure</h2>
      <ul>
        <li><strong>Scheduling:</strong> Leave must be scheduled in advance to balance individual needs with the company's requirement for adequate team coverage.</li>
        <li><strong>Approval:</strong> All leave requests must be approved via email by the employee's supervisor, with the HR team CC'd.</li>
      </ul>

      <h2 id="types">Types of Leave</h2>
      <h3 id="planned">1. Planned Leave</h3>
      <ul>
        <li>Leaves that are communicated and requested in advance via email will be classified as planned leave.</li>
        <li><strong>Example:</strong> For leave on Jan 12, 2024, notification should be given 1 week prior, and the email must be sent on or before Jan 5, 2024.</li>
      </ul>
      <h3 id="unplanned">2. Unplanned Leave</h3>
      <ul>
        <li>Leaves requested after the specified date will be considered unplanned.</li>
      </ul>

      <h2 id="supervisor">Supervisor Authority</h2>
      <ul>
        <li>Supervisors have the authority to approve leaves as paid or unpaid based on business requirements. Their decision will be communicated via email.</li>
      </ul>

      <h2 id="notice">Leave During Notice Period</h2>
      <ul>
        <li>No leave (Planned, Unplanned, PL, CL, or SL) will be approved during the employee's notice period.</li>
        <li>Any absence during the notice period will be treated as Leave Without Pay (LWP) unless otherwise approved by Management under exceptional circumstances.</li>
        <li>Employees serving notice are expected to ensure full knowledge transfer and business continuity.</li>
      </ul>

      <h3 id="privileged">Privileged Leave (PL)</h3>
      <ul>
        <li>Employees are entitled to 12 working days of Privileged Leave per year.</li>
        <li>A maximum of 7 working days can be taken at once; any additional leave will be treated as unpaid.</li>
        <li>Paid holidays and Sundays before, after, or during PL will not count as part of the leave.</li>
        <li>PL cannot be accumulated or encashed.</li>
      </ul>

      <h3 id="casual">Casual Leave (CL) / Sick Leave (SL)</h3>
      <ul>
        <li>Employees are entitled to 6 working days of CL/SL per year.</li>
        <li><strong>Sick Leave:</strong> A medical certificate is required for absences exceeding 2 working days.</li>
        <li>Any sick leave exceeding 2 days can be combined with PL, subject to prior approval.</li>
        <li><strong>Casual Leave:</strong> Any absence exceeding 2 working days will be classified as PL unless accompanied by a medical certificate.</li>
        <li>CL/SL cannot be accumulated or encashed and cannot be prefixed or suffixed to PL.</li>
      </ul>

      <h3 id="lwp">Leave Without Pay (LWP)</h3>
      <ul>
        <li>Leave Without Pay applies when paid balances are unavailable or leave falls outside the approved policy rules.</li>
        <li>LWP may also apply during notice period or for unapproved exceptions, subject to management decision.</li>
      </ul>

      <h2 id="summary">Summary</h2>
      <p>This policy aims to provide a structured approach to leave management, ensuring employees receive the necessary time off while maintaining operational efficiency.</p>
      <p>For any questions or clarifications, please contact the HR department.</p>
    `,
  },
];

const categories = ["All", "HR", "Finance", "Operations", "General", "Compliance", "Security"];
const statuses = ["All", "Active", "Draft", "Review"];

const statusToneMap = {
  Active: "is-approved",
  Draft: "is-neutral",
  Review: "is-pending",
};

const categoryDescriptions = {
  HR: "People practices, leave, and workplace guidelines",
  Finance: "Expense, payroll, and reimbursement rules",
  Operations: "Day-to-day process and delivery standards",
  General: "Company-wide expectations and reference material",
  Compliance: "Regulatory, audit, and legal obligations",
  Security: "Access, data handling, and protection measures",
};

const Policy = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const contentRootRef = useRef(null);
  const contentRefs = useRef({});

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const normalizedQuery = searchQuery.toLowerCase();
      const matchesSearch =
        policy.title.toLowerCase().includes(normalizedQuery) ||
        policy.id.toLowerCase().includes(normalizedQuery) ||
        policy.description.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        selectedCategory === "All" || policy.category === selectedCategory;
      const matchesStatus = selectedStatus === "All" || policy.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, selectedCategory, selectedStatus]);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === expandedPolicy) || null,
    [expandedPolicy]
  );

  const activePoliciesCount = policies.filter((policy) => policy.status === "Active").length;
  const categoriesCount = new Set(policies.map((policy) => policy.category)).size;

  useEffect(() => {
    if (!selectedPolicy || !contentRootRef.current) {
      contentRefs.current = {};
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const nextRefs = {};

      selectedPolicy.sections.forEach((section) => {
        const element = contentRootRef.current?.querySelector(`#${section.id}`);
        if (element) {
          nextRefs[section.id] = element;
        }
      });

      contentRefs.current = nextRefs;
      setActiveSection(selectedPolicy.sections[0]?.id || null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedPolicy]);

  useEffect(() => {
    if (!selectedPolicy) {
      return undefined;
    }

    const handleScroll = () => {
      const scrollPosition = 170;
      let currentSection = selectedPolicy.sections[0]?.id || null;

      selectedPolicy.sections.forEach((section) => {
        const element = contentRefs.current[section.id];
        const elementTop = element?.getBoundingClientRect().top;

        if (element && typeof elementTop === "number" && elementTop <= scrollPosition) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [selectedPolicy]);

  const openPolicy = (policyId) => {
    setExpandedPolicy(policyId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closePolicy = () => {
    setExpandedPolicy(null);
    setActiveSection(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);

    const element =
      contentRefs.current[sectionId] ||
      contentRootRef.current?.querySelector(`#${sectionId}`);

    if (!element) {
      return;
    }

    contentRefs.current[sectionId] = element;

    window.history.replaceState(null, "", `#${sectionId}`);
    element.setAttribute("tabindex", "-1");
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (selectedPolicy) {
    return (
      <section className="policy-workspace">
        <header className="admin-hero policy-detail-hero">
          <div>
            <button className="fiori-button secondary policy-back-button" onClick={closePolicy}>
              <ArrowLeft size={16} />
              <span>Back to policies</span>
            </button>
            <div className="admin-section-overline">Policy Library</div>
            <h1>{selectedPolicy.title}</h1>
            <p>{selectedPolicy.description}</p>
          </div>

          <div className="admin-hero-meta">
            <div className="admin-hero-meta-item">
              <span>Policy ID</span>
              <strong>{selectedPolicy.id}</strong>
            </div>
            <div className="admin-hero-meta-item">
              <span>Status</span>
              <strong>{selectedPolicy.status}</strong>
            </div>
            <div className="admin-hero-meta-item">
              <span>Updated</span>
              <strong>{selectedPolicy.updated}</strong>
            </div>
          </div>
        </header>

        <div className="policy-detail-layout">
          <aside className="fiori-panel policy-outline-panel">
            <div className="fiori-panel-header">
              <div>
                <h3>Document Outline</h3>
                <p>Jump between sections in the active policy</p>
              </div>
            </div>

            <div className="policy-outline-list">
              {selectedPolicy.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`policy-outline-item ${
                    activeSection === section.id ? "is-active" : ""
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(section.id);
                  }}
                  aria-current={activeSection === section.id ? "location" : undefined}
                >
                  {section.title}
                </a>
              ))}
            </div>
          </aside>

          <div className="policy-detail-main">
            <section className="policy-detail-meta-grid">
              <article className="fiori-stat-card">
                <div className="fiori-stat-topline">
                  <span className="fiori-stat-label">Category</span>
                  <ShieldCheck size={18} />
                </div>
                <div className="fiori-stat-value policy-detail-stat-value">
                  {selectedPolicy.category}
                </div>
                <div className="fiori-stat-note">
                  {categoryDescriptions[selectedPolicy.category] || "Reference documentation"}
                </div>
              </article>

              <article className="fiori-stat-card">
                <div className="fiori-stat-topline">
                  <span className="fiori-stat-label">Published</span>
                  <CalendarDays size={18} />
                </div>
                <div className="fiori-stat-value policy-detail-stat-value">
                  {selectedPolicy.dateAdded}
                </div>
                <div className="fiori-stat-note">Initial publication date</div>
              </article>

              <article className="fiori-stat-card">
                <div className="fiori-stat-topline">
                  <span className="fiori-stat-label">Amended</span>
                  <Sparkles size={18} />
                </div>
                <div className="fiori-stat-value policy-detail-stat-value">
                  {selectedPolicy.dateAmended}
                </div>
                <div className="fiori-stat-note">Most recent revision date</div>
              </article>
            </section>

            <section className="fiori-panel">
              <div className="fiori-panel-header">
                <div>
                  <h3>Policy Document</h3>
                  <p>Review the latest published guidance in one place</p>
                </div>
                <span className={`fiori-status-pill ${statusToneMap[selectedPolicy.status] || "is-neutral"}`}>
                  {selectedPolicy.status}
                </span>
              </div>

              <div
                ref={contentRootRef}
                className="policy-document-content"
                dangerouslySetInnerHTML={{ __html: selectedPolicy.content }}
              />
            </section>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="policy-workspace">
      <header className="admin-hero">
        <div>
          <div className="admin-section-overline">Knowledge Hub</div>
          <h1>Policies</h1>
          <p>
            Browse published company policies, narrow the library quickly, and open the latest
            guidance without leaving the HRMS workspace.
          </p>
        </div>

        <div className="admin-hero-meta">
          <div className="admin-hero-meta-item">
            <span>Published policies</span>
            <strong>{policies.length}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Categories</span>
            <strong>{categoriesCount}</strong>
          </div>
          <div className="admin-hero-meta-item">
            <span>Active now</span>
            <strong>{activePoliciesCount}</strong>
          </div>
        </div>
      </header>

      <section className="policy-summary-grid">
        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Library Size</span>
            <BookOpenText size={18} />
          </div>
          <div className="fiori-stat-value">{policies.length}</div>
          <div className="fiori-stat-note">Policies currently available in the workspace</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Active Policies</span>
            <ShieldCheck size={18} />
          </div>
          <div className="fiori-stat-value">{activePoliciesCount}</div>
          <div className="fiori-stat-note">Published documents employees can rely on today</div>
        </article>

        <article className="fiori-stat-card">
          <div className="fiori-stat-topline">
            <span className="fiori-stat-label">Filtered View</span>
            <Filter size={18} />
          </div>
          <div className="fiori-stat-value">{filteredPolicies.length}</div>
          <div className="fiori-stat-note">Policies matching the current search and filters</div>
        </article>
      </section>

      <section className="fiori-panel">
        <div className="fiori-panel-header">
          <div>
            <h3>Search and Filter</h3>
            <p>Find a policy by title, reference number, category, or status</p>
          </div>
        </div>

        <div className="policy-filter-grid">
          <label className="employee-filter-field employee-filter-search">
            <span>Search</span>
            <div className="employee-filter-input-shell">
              <Search size={16} />
              <input
                className="input"
                type="text"
                placeholder="Search by ID, title, or description"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </label>

          <label className="employee-filter-field">
            <span>Category</span>
            <select
              className="input"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All categories" : category}
                </option>
              ))}
            </select>
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

      {filteredPolicies.length === 0 ? (
        <div className="admin-empty-state">
          <FileText size={28} />
          <div>
            <strong>No policies match the current filters</strong>
            <p>Try changing the search terms or reset a filter to broaden the library view.</p>
          </div>
        </div>
      ) : (
        <div className="policy-card-grid">
          {filteredPolicies.map((policy) => (
            <article
              key={policy.id}
              className="policy-library-card"
              onClick={() => openPolicy(policy.id)}
            >
              <div className="policy-library-card-top">
                <div>
                  <div className="policy-library-id">{policy.id}</div>
                  <h3>{policy.title}</h3>
                </div>
                <span className={`fiori-status-pill ${statusToneMap[policy.status] || "is-neutral"}`}>
                  {policy.status}
                </span>
              </div>

              <p>{policy.description}</p>

              <div className="policy-library-meta">
                <span>{policy.category}</span>
                <span>{policy.sections.length} sections</span>
                <span>Updated {policy.updated}</span>
              </div>

              <div className="fiori-card-link">Open policy document</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Policy;
