import React, { useState } from "react";

const ManagerInfo = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [manager, setManager] = useState(null);
  const [managerEmail, setManagerEmail] = useState("");
  const [reports, setReports] = useState([]);

  const fetchManager = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/get_manager/${employeeId}`);
      const data = await res.json();
      setManager(data.manager || data);
    } catch (err) { console.error(err); alert("Failed"); }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/get_employees_by_manager/${encodeURIComponent(managerEmail)}`);
      const data = await res.json();
      setReports(data);
    } catch (err) { console.error(err); alert("Failed to fetch reports"); }
  };

  return (
    <div className="panel">
      <h3>Manager Lookup</h3>
      <div style={{display:"grid", gridTemplateColumns:"1fr 140px", gap:12}}>
        <input className="input" placeholder="Employee ID" value={employeeId} onChange={e=>setEmployeeId(e.target.value)} />
        <button className="btn" onClick={fetchManager}>Find Manager</button>
      </div>

      {manager && <div style={{marginTop:12}} className="card small">
        <div className="card-title">Manager</div>
        <div className="card-value">{manager.name} <span className="muted">({manager.email})</span></div>
      </div>}

      <hr style={{margin:"18px 0"}} />

      <h4>Employees under Manager</h4>
      <div style={{display:"grid", gridTemplateColumns:"1fr 140px", gap:12}}>
        <input className="input" placeholder="Manager Email" value={managerEmail} onChange={e=>setManagerEmail(e.target.value)} />
        <button className="btn ghost" onClick={fetchReports}>Get Employees</button>
      </div>

      {reports.length > 0 && (
        <ul style={{marginTop:12}}>
          {reports.map(r => <li key={r._id}><strong>{r.name}</strong> — <span className="muted">{r.designation}</span></li>)}
        </ul>
      )}
    </div>
  );
};

export default ManagerInfo;