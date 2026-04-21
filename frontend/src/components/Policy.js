import React, { useState, useRef, useEffect } from "react";

const Policy = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const contentRefs = useRef({});

  // Sample policies data
  const policies = [
    {
      id: "1001",
      title: "Leave Policy Guidelines",
      description: "Comprehensive policy document that outlines important guidelines for employee leave management including Earned Leave, Privileged Leave, Casual Leave, and Sick Leave.",
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
        { id: "types", title: "Types of Leave" },
        { id: "supervisor", title: "Supervisor Authority" },
        { id: "notice", title: "Leave During Notice Period" },
        { id: "entitlements", title: "Leave Entitlements" },
        { id: "privileged", title: "Privileged Leave (PL)" },
        { id: "casual", title: "Casual Leave (CL) / Sick Leave (SL)" },
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
        <h3>1. Planned Leave:</h3>
        <ul>
          <li>Leaves that are communicated and requested in advance via email will be classified as planned leave.</li>
          <li><strong>Example:</strong> For leave on Jan 12, 2024, notification should be given 1 week prior, and the email must be sent on or before Jan 5, 2024.</li>
        </ul>
        <h3>2. Unplanned Leave:</h3>
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

        <h2 id="entitlements">Leave Entitlements</h2>

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

        <h2 id="summary">Summary</h2>
        <p>This policy aims to provide a structured approach to leave management, ensuring employees receive the necessary time off while maintaining operational efficiency.</p>
        <p>For any questions or clarifications, please contact the HR department.</p>
      `
    }
  ];

  const categories = ["All", "HR", "Finance", "Operations", "General", "Compliance", "Security"];
  const statuses = ["All", "Active", "Draft", "Review"];

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch = 
      policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || policy.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || policy.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return { bg: "#d1f4dd", text: "#0a5d2c" };
      case "Draft":
        return { bg: "#f3f4f6", text: "#6b7280" };
      case "Review":
        return { bg: "#fff4e6", text: "#d97706" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "HR": return "👥";
      case "Finance": return "💰";
      case "Operations": return "⚙️";
      case "General": return "📋";
      case "Compliance": return "✅";
      case "Security": return "🔒";
      default: return "📄";
    }
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = contentRefs.current[sectionId];
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.pageYOffset + 150;
      
      if (expandedPolicy) {
        const policy = policies.find(p => p.id === expandedPolicy);
        if (policy) {
          let foundSection = null;
          
          for (let i = 0; i < policy.sections.length; i++) {
            const section = policy.sections[i];
            const element = contentRefs.current[section.id];
            
            if (element) {
              const elementTop = element.offsetTop;
              const elementBottom = elementTop + element.offsetHeight;
              
              if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
                foundSection = section.id;
                break;
              }
            }
          }
          
          if (foundSection) {
            setActiveSection(foundSection);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [expandedPolicy]);

  if (expandedPolicy) {
    const policy = policies.find((p) => p.id === expandedPolicy);
    
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "#f8f9fa",
        fontFamily: "Inter, system-ui, sans-serif"
      }}>
        {/* Document Viewer Header */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => {
                setExpandedPolicy(null);
                setActiveSection(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 24,
                color: "#6b7280",
                padding: "8px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              ←
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                {policy.id} - {policy.title}
              </h2>
              <div style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280", display: "flex", gap: 16 }}>
                <span>Date Added: {policy.dateAdded}</span>
                <span>•</span>
                <span>Date Amended: {policy.dateAmended}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto" }}>
          {/* Left Sidebar - Document Index */}
          <div style={{
            width: 280,
            background: "white",
            borderRight: "1px solid #e5e7eb",
            padding: "24px 0",
            position: "sticky",
            top: 73,
            height: "calc(100vh - 73px)",
            overflowY: "auto"
          }}>
            <div style={{ padding: "0 24px", marginBottom: 16 }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 13, 
                fontWeight: 700, 
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Document Index
              </h3>
            </div>
            
            <nav>
              {policy.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 24px",
                    border: "none",
                    background: activeSection === section.id ? "#eff6ff" : "transparent",
                    color: activeSection === section.id ? "#2563eb" : "#374151",
                    fontSize: 14,
                    fontWeight: activeSection === section.id ? 600 : 400,
                    cursor: "pointer",
                    borderLeft: activeSection === section.id ? "3px solid #2563eb" : "3px solid transparent",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== section.id) {
                      e.currentTarget.style.background = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== section.id) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div style={{
            flex: 1,
            padding: "40px 80px",
            background: "white",
            minHeight: "calc(100vh - 73px)"
          }}>
            <div 
              style={{
                maxWidth: 800,
                margin: "0 auto",
                lineHeight: 1.7,
                color: "#374151"
              }}
              dangerouslySetInnerHTML={{
                __html: policy.content.replace(
                  /<h2 id="([^"]+)"/g,
                  (match, id) => `<h2 id="${id}" ref="${id}"`
                )
              }}
              ref={(el) => {
                if (el) {
                  policy.sections.forEach(section => {
                    const element = el.querySelector(`#${section.id}`);
                    if (element) {
                      contentRefs.current[section.id] = element;
                    }
                  });
                }
              }}
            />
          </div>
        </div>

        <style>{`
          h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin: 40px 0 16px 0;
            padding-top: 40px;
            scroll-margin-top: 100px;
          }
          h3 {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            margin: 24px 0 12px 0;
            scroll-margin-top: 100px;
          }
          p {
            margin: 12px 0;
            font-size: 15px;
          }
          ul {
            margin: 12px 0;
            padding-left: 24px;
          }
          li {
            margin: 8px 0;
            font-size: 15px;
          }
          strong {
            font-weight: 600;
            color: #111827;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "#0066cc",
      padding: "40px",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          marginBottom: 40,
          color: "white"
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: 36, 
            fontWeight: 700,
            marginBottom: 8
          }}>
            Policy Management
          </h1>
          <p style={{ 
            margin: 0, 
            fontSize: 16,
            opacity: 0.9
          }}>
            Browse and manage all organizational policies
          </p>
        </div>

        {/* Search and Filters */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          {/* Search Bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ position: "relative" }}>
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
                placeholder="Search policies by ID, name, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 48px",
                  fontSize: 15,
                  border: "2px solid #e5e7eb",
                  borderRadius: 12,
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#0066cc"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
          </div>

          {/* Filters */}
          <div style={{ 
            display: "flex", 
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <span style={{ 
              fontSize: 14, 
              fontWeight: 600,
              color: "#6b7280",
              marginRight: 8
            }}>
              Filters:
            </span>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: "8px 32px 8px 12px",
                fontSize: 14,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
                fontWeight: 500,
                color: "#374151"
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: "8px 32px 8px 12px",
                fontSize: 14,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
                fontWeight: 500,
                color: "#374151"
              }}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Status" : status}
                </option>
              ))}
            </select>

            <span style={{ 
              marginLeft: "auto",
              fontSize: 14,
              color: "#6b7280"
            }}>
              Showing {filteredPolicies.length} of {policies.length} policies
            </span>
          </div>
        </div>

        {/* Policy Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 24
        }}>
          {filteredPolicies.map((policy) => {
            const statusColors = getStatusColor(policy.status);
            
            return (
              <div
                key={policy.id}
                onClick={() => setExpandedPolicy(policy.id)}
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                }}
              >
                {/* Policy Number */}
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#0066cc",
                  marginBottom: 12,
                  letterSpacing: "-0.5px"
                }}>
                  {policy.id}
                </div>

                {/* Policy Title */}
                <h3 style={{
                  margin: "0 0 8px 0",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827"
                }}>
                  {policy.title}
                </h3>

                {/* Description */}
                <p style={{
                  margin: "0 0 16px 0",
                  fontSize: 14,
                  color: "#6b7280",
                  lineHeight: 1.5
                }}>
                  {policy.description}
                </p>

                {/* Category Badge */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: "#eff6ff",
                  borderRadius: 8,
                  marginBottom: 12
                }}>
                  <span style={{ fontSize: 16 }}>{getCategoryIcon(policy.category)}</span>
                  <span style={{ 
                    fontSize: 13, 
                    fontWeight: 600,
                    color: "#0066cc"
                  }}>
                    {policy.category}
                  </span>
                </div>

                {/* Status Badge */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 12px",
                  background: statusColors.bg,
                  borderRadius: 8,
                  marginLeft: 8,
                  marginBottom: 12
                }}>
                  <span style={{ 
                    fontSize: 13, 
                    fontWeight: 600,
                    color: statusColors.text
                  }}>
                    {policy.status}
                  </span>
                </div>

                {/* Updated Date */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid #f3f4f6",
                  fontSize: 13,
                  color: "#9ca3af"
                }}>
                  <span>🕐</span>
                  <span>Updated: {policy.updated}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredPolicies.length === 0 && (
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 60,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <h3 style={{ 
              margin: "0 0 8px 0",
              fontSize: 20,
              fontWeight: 600,
              color: "#111827"
            }}>
              No policies found
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
    </div>
  );
};

export default Policy;