import React, { useEffect, useState } from "react";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [managerMap, setManagerMap] = useState({});

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
      const data = await res.json();
      setUsers(data);

      // create map of id -> email for managers
      const map = {};
      data.forEach((u) => {
        map[u._id] = u.email;
      });
      setManagerMap(map);
    } catch (err) {
      console.error(err);
      alert("Failed to load users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete user?")) return;
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/delete_user/${id}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchUsers();
      else alert("Delete failed");
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 10 }}>All Employees</h3>
      <table
        className="table"
        style={{
          width: "100%",
          marginTop: 12,
          borderCollapse: "collapse",
          background: "#f8f9fa",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <thead style={{ background: "#e9ecef", textAlign: "left" }}>
          <tr>
            <th style={{ padding: "10px" }}>Employee ID</th>
            <th style={{ padding: "10px" }}>Database ID</th>
            <th style={{ padding: "10px" }}>Name</th>
            <th style={{ padding: "10px" }}>Email</th>
            <th style={{ padding: "10px" }}>Role</th>
            <th style={{ padding: "10px" }}>Department</th>
            <th style={{ padding: "10px" }}>Reports To (Email)</th>
            <th style={{ padding: "10px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u._id}
              style={{
                borderBottom: "1px solid #dee2e6",
                background: "#fff",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f3f5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <td style={{ padding: "10px" }}>
                <strong style={{ color: "#667eea" }}>{u.employeeId || "N/A"}</strong>
              </td>
              <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "11px", color: "#6c757d" }}>
                {u._id}
              </td>
              <td style={{ padding: "10px" }}>
                <strong>{u.name}</strong>
              </td>
              <td style={{ padding: "10px", color: "#495057" }}>{u.email}</td>
              <td style={{ padding: "10px" }}>{u.role}</td>
              <td style={{ padding: "10px" }}>{u.department || "-"}</td>
              <td style={{ padding: "10px", color: "#6c757d" }}>
                {u.reportsTo ? managerMap[u.reportsTo] || "—" : "—"}
              </td>
              <td style={{ padding: "10px" }}>
                <button
                  className="btn ghost"
                  style={{
                    border: "1px solid #adb5bd",
                    borderRadius: 6,
                    padding: "5px 10px",
                    marginRight: 8,
                    cursor: "pointer",
                  }}
                  onClick={() => navigator.clipboard.writeText(u._id)}
                >
                  Copy DB ID
                </button>
                <button
                  className="btn"
                  style={{
                    background: "#e03131",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 10px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleDelete(u._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;