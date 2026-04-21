import React, { useState } from "react";

const UserForm = ({ onSaved }) => {
  const [form, setForm] = useState({
    employeeId: "",
    name:"", email:"", password:"", designation:"", role:"Employee",
    department:"", shiftTimings:"", projects:"", reportsToEmail:"", 
    dateOfJoining:"", dateOfBirth:"", workLocation:"", peopleLeadEmail:"" // NEW FIELD
  });
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      employeeId: form.employeeId,
      name: form.name,
      email: form.email,
      password: form.password,
      designation: form.designation,
      role: form.role,
      department: form.department,
      shiftTimings: form.shiftTimings,
      projects: form.projects ? form.projects.split(",").map(s => s.trim()) : [],
      reportsToEmail: form.reportsToEmail || null,
      dateOfJoining: form.dateOfJoining ? new Date(form.dateOfJoining).toISOString() : new Date().toISOString(),
      dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null, // NEW FIELD
      workLocation: form.workLocation || "",  // ← ADD THIS
      peopleLeadEmail: form.peopleLeadEmail || null  // ← ADD THIS
    };
    
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/add_user`, {
        method:"POST", 
        headers:{"Content-Type":"application/json"}, 
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert("User added ✓");
        setForm({
          employeeId: "",
          name:"", email:"", password:"", designation:"", role:"Employee", 
          department:"", shiftTimings:"", projects:"", reportsToEmail:"", 
          dateOfJoining:"", dateOfBirth:"" // RESET THIS TOO
        });
        if (onSaved) onSaved();
      } else {
        alert("Error: " + (data.error || "Failed to add"));
      }
    } catch(err){
      console.error(err);
      alert("Network error");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="panel">
      <h3>Add / Create Employee</h3>
      <p className="muted">Fill the details to add an employee. Reports-to accepts manager email.</p>

      <form onSubmit={submit} style={{marginTop:12}}>
        <div className="form-grid">
          {/* Employee ID */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Employee ID *
            </label>
            <input 
              className="input" 
              name="employeeId" 
              placeholder="e.g., EMP001, TCS12345" 
              value={form.employeeId} 
              onChange={change} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Full Name *
            </label>
            <input 
              className="input" 
              name="name" 
              placeholder="Full name" 
              value={form.name} 
              onChange={change} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Email *
            </label>
            <input 
              className="input" 
              name="email" 
              type="email"
              placeholder="Email" 
              value={form.email} 
              onChange={change} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Password *
            </label>
            <input 
              className="input" 
              name="password" 
              type="password"
              placeholder="Password" 
              value={form.password} 
              onChange={change} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Designation *
            </label>
            <input 
              className="input" 
              name="designation" 
              placeholder="Designation" 
              value={form.designation} 
              onChange={change} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Role *
            </label>
            <select 
              className="input" 
              name="role" 
              value={form.role} 
              onChange={change}
            >
              <option>Employee</option>
              <option>Manager</option>
              <option>Admin</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Department
            </label>
            <input 
              className="input" 
              name="department" 
              placeholder="Department" 
              value={form.department} 
              onChange={change} 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Shift Timings
            </label>
            <input 
              className="input" 
              name="shiftTimings" 
              placeholder="e.g., 9:00 AM - 6:00 PM" 
              value={form.shiftTimings} 
              onChange={change} 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Date of Joining
            </label>
            <input 
              className="input" 
              name="dateOfJoining" 
              type="date"
              value={form.dateOfJoining} 
              onChange={change} 
            />
          </div>

          {/* NEW FIELD - Date of Birth */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Date of Birth
            </label>
            <input 
              className="input" 
              name="dateOfBirth" 
              type="date"
              value={form.dateOfBirth} 
              onChange={change}
              max={new Date().toISOString().split('T')[0]} // Can't be in future
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Projects (comma-separated)
            </label>
            <input 
              className="input" 
              name="projects" 
              placeholder="Project A, Project B" 
              value={form.projects} 
              onChange={change} 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Tech Lead (Manager Email)
            </label>
            <input 
              className="input" 
              name="reportsToEmail" 
              placeholder="manager@company.com" 
              value={form.reportsToEmail} 
              onChange={change} 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              People Lead / HR Manager Email
            </label>
            <input 
              className="input" 
              name="peopleLeadEmail" 
              placeholder="hr@company.com" 
              value={form.peopleLeadEmail} 
              onChange={change} 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Work Location
            </label>
            <input 
              className="input" 
              name="workLocation" 
              placeholder="e.g., Hyderabad Office, Remote, Mumbai HQ" 
              value={form.workLocation} 
              onChange={change} 
            />
          </div>
        </div>

        <div style={{marginTop:14, display:"flex", gap:10}}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Employee"}
          </button>
          <button 
            type="button" 
            className="btn ghost" 
            onClick={()=>setForm({
              employeeId: "",
              name:"", email:"", password:"", designation:"", role:"Employee", 
              department:"", shiftTimings:"", projects:"", reportsToEmail:"", 
              dateOfJoining:"", dateOfBirth:"", workLocation:"", peopleLeadEmail:""  // ← ADDED
            })}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;