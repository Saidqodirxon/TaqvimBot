import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";
import "./Admins.css";

// using global API_URL from src/api.js

const ROLES = {
  superadmin: { name: "Superadmin", color: "#dc3545" },
  admin: { name: "Admin", color: "#007bff" },
  moderator: { name: "Moderator", color: "#28a745" },
};

const ALL_PERMISSIONS = [
  { key: "viewUsers", name: "Foydalanuvchilarni ko'rish" },
  { key: "editUsers", name: "Foydalanuvchilarni tahrirlash" },
  { key: "deleteUsers", name: "Foydalanuvchilarni o'chirish" },
  { key: "viewBroadcast", name: "Broadcast ko'rish" },
  { key: "sendBroadcast", name: "Broadcast yuborish" },
  { key: "viewPrayers", name: "Duolarni ko'rish" },
  { key: "editPrayers", name: "Duolarni tahrirlash" },
  { key: "deletePrayers", name: "Duolarni o'chirish" },
  { key: "viewChannels", name: "Kanallarni ko'rish" },
  { key: "editChannels", name: "Kanallarni tahrirlash" },
  { key: "viewSettings", name: "Sozlamalarni ko'rish" },
  { key: "editSettings", name: "Sozlamalarni tahrirlash" },
  { key: "viewAdmins", name: "Adminlarni ko'rish" },
  { key: "editAdmins", name: "Adminlarni tahrirlash" },
  { key: "deleteAdmins", name: "Adminlarni o'chirish" },
  { key: "viewLogs", name: "Loglarni ko'rish" },
];

function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [newAdmin, setNewAdmin] = useState({
    userId: "",
    username: "",
    firstName: "",
    role: "moderator",
    permissions: {},
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(response.data);
    } catch (error) {
      console.error("Error fetching admins:", error);
      alert("Adminlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.userId || !newAdmin.username || !newAdmin.firstName) {
      alert("Barcha maydonlarni to'ldiring");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/admins`, newAdmin, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Admin muvaffaqiyatli qo'shildi");
      setNewAdmin({
        userId: "",
        username: "",
        firstName: "",
        role: "moderator",
        permissions: {},
      });
      setShowAddForm(false);
      fetchAdmins();
    } catch (error) {
      console.error("Error adding admin:", error);
      alert(error.response?.data?.error || "Admin qo'shishda xatolik");
    }
  };

  const handleUpdateAdmin = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/admins/${editingAdmin.userId}`,
        editingAdmin,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Admin tahrirlandi");
      setEditingAdmin(null);
      fetchAdmins();
    } catch (error) {
      console.error("Error updating admin:", error);
      alert("Tahrirlashda xatolik");
    }
  };

  const handleDeleteAdmin = async (userId, role) => {
    if (role === "superadmin") {
      alert("Superadminni o'chirib bo'lmaydi!");
      return;
    }

    if (!confirm("Adminni o'chirishni xohlaysizmi?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/admins/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Admin o'chirildi");
      fetchAdmins();
    } catch (error) {
      console.error("Error deleting admin:", error);
      alert("O'chirishda xatolik");
    }
  };

  const togglePermission = (admin, permissionKey) => {
    const updated = {
      ...admin,
      permissions: {
        ...admin.permissions,
        [permissionKey]: !admin.permissions[permissionKey],
      },
    };
    setEditingAdmin(updated);
  };

  const setRoleWithDefaults = (role) => {
    const defaultPermissions = {
      moderator: {
        viewUsers: true,
        viewBroadcast: true,
        viewPrayers: true,
        viewChannels: true,
        viewSettings: true,
        viewLogs: true,
      },
      admin: {
        viewUsers: true,
        editUsers: true,
        viewBroadcast: true,
        sendBroadcast: true,
        viewPrayers: true,
        editPrayers: true,
        viewChannels: true,
        editChannels: true,
        viewSettings: true,
        editSettings: true,
        viewAdmins: true,
        viewLogs: true,
      },
      superadmin: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p.key, true])),
    };

    if (editingAdmin) {
      setEditingAdmin({
        ...editingAdmin,
        role,
        permissions: defaultPermissions[role] || {},
      });
    } else {
      setNewAdmin({
        ...newAdmin,
        role,
        permissions: defaultPermissions[role] || {},
      });
    }
  };

  if (loading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="admins-page">
      <div className="page-header">
        <h1>Adminlar</h1>
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "❌ Bekor qilish" : "➕ Admin qo'shish"}
        </button>
      </div>

      {showAddForm && (
        <div className="add-admin-form">
          <h3>Yangi admin qo'shish</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>User ID</label>
              <input
                type="text"
                placeholder="1234567890"
                value={newAdmin.userId}
                onChange={(e) =>
                  setNewAdmin({ ...newAdmin, userId: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="username"
                value={newAdmin.username}
                onChange={(e) =>
                  setNewAdmin({ ...newAdmin, username: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Ism</label>
              <input
                type="text"
                placeholder="Admin ismi"
                value={newAdmin.firstName}
                onChange={(e) =>
                  setNewAdmin({ ...newAdmin, firstName: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Rol</label>
              <select
                value={newAdmin.role}
                onChange={(e) => setRoleWithDefaults(e.target.value)}
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>

          <div className="permissions-section">
            <h4>Ruxsatlar:</h4>
            <div className="permissions-grid">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm.key} className="permission-item">
                  <input
                    type="checkbox"
                    checked={newAdmin.permissions[perm.key] || false}
                    onChange={() =>
                      setNewAdmin({
                        ...newAdmin,
                        permissions: {
                          ...newAdmin.permissions,
                          [perm.key]: !newAdmin.permissions[perm.key],
                        },
                      })
                    }
                  />
                  <span>{perm.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn-success" onClick={handleAddAdmin}>
            ✅ Qo'shish
          </button>
        </div>
      )}

      <div className="admins-list">
        {admins.length === 0 ? (
          <div className="no-data">
            <p>Hozircha adminlar yo'q</p>
          </div>
        ) : (
          admins.map((admin) => (
            <div key={admin.userId} className="admin-card">
              <div className="admin-info">
                <div className="admin-header">
                  <h3>
                    {admin.firstName}{" "}
                    <span className="username">@{admin.username}</span>
                  </h3>
                  <span
                    className="role-badge"
                    style={{
                      background: ROLES[admin.role]?.color || "#6c757d",
                    }}
                  >
                    {ROLES[admin.role]?.name || admin.role}
                  </span>
                </div>
                <p className="admin-id">ID: {admin.userId}</p>
                <p className="admin-date">
                  Qo'shilgan:{" "}
                  {new Date(admin.createdAt).toLocaleDateString("uz-UZ")}
                </p>
              </div>

              <div className="admin-actions">
                <button
                  className="btn-edit"
                  onClick={() => setEditingAdmin(admin)}
                >
                  ✏️ Tahrirlash
                </button>
                {admin.role !== "superadmin" && (
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteAdmin(admin.userId, admin.role)}
                  >
                    🗑️ O'chirish
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editingAdmin && (
        <div className="modal-overlay" onClick={() => setEditingAdmin(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Admin tahrirlash</h3>
            <p>
              <strong>
                {editingAdmin.firstName} (@{editingAdmin.username})
              </strong>
            </p>

            <div className="form-group">
              <label>Rol</label>
              <select
                value={editingAdmin.role}
                onChange={(e) => setRoleWithDefaults(e.target.value)}
                disabled={editingAdmin.role === "superadmin"}
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            <div className="permissions-section">
              <h4>Ruxsatlar:</h4>
              <div className="permissions-grid">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm.key} className="permission-item">
                    <input
                      type="checkbox"
                      checked={editingAdmin.permissions[perm.key] || false}
                      onChange={() => togglePermission(editingAdmin, perm.key)}
                      disabled={editingAdmin.role === "superadmin"}
                    />
                    <span>{perm.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-success" onClick={handleUpdateAdmin}>
                💾 Saqlash
              </button>
              <button
                className="btn-secondary"
                onClick={() => setEditingAdmin(null)}
              >
                ❌ Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admins;
