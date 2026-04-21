import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminHolidays = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", date: "", type: "company", region: "", is_optional: false, description: ""
  });

  const load = async () => {
    const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/holidays/`);
    setItems(res.data);
  };
  useEffect(() => { load(); }, []);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const reset = () => { setForm({ name:"", date:"", type:"company", region:"", is_optional:false, description:"" }); setEditing(null); };

  const save = async () => {
    if (!form.name || !form.date) { alert("Name and Date are required"); return; }
    if (editing) {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/holidays/update/${editing}`, form);
    } else {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/holidays/add`, form);
    }
    reset(); load();
  };

  const editRow = (row) => {
    setEditing(row._id);
    setForm({
      name: row.name || "",
      date: row.date || "",
      type: row.type || "company",
      region: row.region || "",
      is_optional: !!row.is_optional,
      description: row.description || "",
    });
  };

  const del = async (id) => {
    if (!window.confirm("Delete this holiday?")) return;
    await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/holidays/delete/${id}`);
    load();
  };

  return (
    <div className="panel">
      <h3>Holidays</h3>
      <p className="muted">Create and edit organization holidays. These appear in Calendar for all users.</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
        <input className="input" name="name" placeholder="Holiday name" value={form.name} onChange={change} />
        <input className="input" name="date" type="date" value={form.date} onChange={change} />

        <select className="input" name="type" value={form.type} onChange={change}>
          <option value="public">Public</option>
          <option value="optional">Optional</option>
          <option value="company">Company</option>
        </select>
        <input className="input" name="region" placeholder="Region (optional)" value={form.region} onChange={change} />

        <input className="input" name="description" placeholder="Description (optional)" value={form.description} onChange={change} />
      </div>

      <div style={{ marginTop:12, display:"flex", gap:8 }}>
        <button className="btn" onClick={save}>{editing ? "Update" : "Add"} Holiday</button>
        {editing && <button className="btn ghost" onClick={reset}>Cancel</button>}
      </div>

      <hr style={{ margin:"18px 0" }} />

      <table className="table" style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>
            <th style={{ padding:8 }}>Date</th>
            <th style={{ padding:8 }}>Name</th>
            <th style={{ padding:8 }}>Type</th>
            <th style={{ padding:8 }}>Region</th>
            <th style={{ padding:8 }}>Optional</th>
            <th style={{ padding:8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(h => (
            <tr key={h._id} style={{ borderTop:"1px solid #eee" }}>
              <td style={{ padding:8 }}>{h.date}</td>
              <td style={{ padding:8 }}>{h.name}</td>
              <td style={{ padding:8, textTransform:"capitalize" }}>{h.type}</td>
              <td style={{ padding:8 }}>{h.region || "-"}</td>
              <td style={{ padding:8 }}>{h.is_optional ? "Yes" : "No"}</td>
              <td style={{ padding:8 }}>
                <button className="btn small" onClick={() => editRow(h)}>Edit</button>
                <button className="btn small ghost" style={{ marginLeft:8 }} onClick={() => del(h._id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} style={{ padding:12, color:"#9aa4b2" }}>No holidays yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminHolidays;