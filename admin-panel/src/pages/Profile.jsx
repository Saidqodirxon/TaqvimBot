import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../api";
import { Save, User, Mail, Shield } from "lucide-react";
import "./Profile.css";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(response.data);
      setFormData({
        username: response.data.username || "",
        firstName: response.data.firstName || "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      alert("Profil ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem("token");
      return await axios.put(`${API_URL}/auth/profile`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      alert("Profil yangilandi!");
      setFormData({ ...formData, password: "", confirmPassword: "" });
      fetchProfile();
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Xatolik yuz berdi");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("Parollar mos kelmadi!");
      return;
    }

    const updateData = {
      username: formData.username,
      firstName: formData.firstName,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    updateMutation.mutate(updateData);
  };

  if (loading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>
          <User size={32} />
          Mening Profilim
        </h1>
        <p>Shaxsiy ma'lumotlarni tahrirlash</p>
      </div>

      <div className="card profile-card">
        <div className="profile-info">
          <div className="info-item">
            <Shield size={20} />
            <div>
              <strong>Rol:</strong>
              <span className={`role-badge ${profile?.role}`}>
                {profile?.role === "superadmin"
                  ? "Superadmin"
                  : profile?.role === "admin"
                    ? "Admin"
                    : "Moderator"}
              </span>
            </div>
          </div>
          <div className="info-item">
            <Mail size={20} />
            <div>
              <strong>User ID:</strong>
              <span>{profile?.userId}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              placeholder="admin"
            />
          </div>

          <div className="form-group">
            <label>Ism</label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              placeholder="Admin Ismi"
            />
          </div>

          <div className="form-group">
            <label>Yangi Parol (ixtiyoriy)</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="••••••••"
            />
            <small>Bo'sh qoldiring agar parolni o'zgartirmasangiz</small>
          </div>

          <div className="form-group">
            <label>Parolni Tasdiqlash</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="••••••••"
              disabled={!formData.password}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={updateMutation.isLoading}
          >
            <Save size={18} />
            {updateMutation.isLoading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
