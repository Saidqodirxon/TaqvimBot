import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";
import "./PrayerDefaults.css";

// using global API_URL from src/api.js

const PrayerDefaults = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState({
    calculationMethod: 1,
    school: 1,
    midnightMode: 0,
  });
  const [methods, setMethods] = useState({});
  const [schools, setSchools] = useState({});

  useEffect(() => {
    fetchDefaults();
  }, []);

  const fetchDefaults = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await axios.get(`${API_URL}/prayer-defaults`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDefaults(response.data.defaults);
      setMethods(response.data.availableMethods);
      setSchools(response.data.availableSchools);
    } catch (error) {
      console.error("Error fetching defaults:", error);
      alert("Xatolik yuz berdi!");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("adminToken");
      await axios.post(`${API_URL}/prayer-defaults`, defaults, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("✅ Sozlamalar saqlandi!");
    } catch (error) {
      console.error("Error saving defaults:", error);
      alert("❌ Xatolik yuz berdi!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="prayer-defaults loading">
        <div className="spinner"></div>
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="prayer-defaults">
      <div className="page-header">
        <h1>🕌 Default Namoz Sozlamalari</h1>
        <p className="subtitle">
          Yangi foydalanuvchilar uchun default hisoblash usuli va mazhab
        </p>
      </div>

      <div className="settings-grid">
        {/* Calculation Method */}
        <div className="setting-card">
          <label className="setting-label">
            <span className="icon">📐</span>
            Hisoblash usuli
          </label>
          <select
            value={defaults.calculationMethod}
            onChange={(e) =>
              setDefaults({
                ...defaults,
                calculationMethod: parseInt(e.target.value),
              })
            }
            className="setting-select"
          >
            {Object.entries(methods).map(([key, names]) => (
              <option key={key} value={key}>
                {names.uz}
              </option>
            ))}
          </select>
          <p className="setting-hint">
            Namoz vaqtlarini hisoblash uchun qaysi usuldan foydalaniladi
          </p>
        </div>

        {/* School (Madhab) */}
        <div className="setting-card">
          <label className="setting-label">
            <span className="icon">📖</span>
            Mazhab
          </label>
          <select
            value={defaults.school}
            onChange={(e) =>
              setDefaults({ ...defaults, school: parseInt(e.target.value) })
            }
            className="setting-select"
          >
            {Object.entries(schools).map(([key, names]) => (
              <option key={key} value={key}>
                {names.uz}
              </option>
            ))}
          </select>
          <p className="setting-hint">
            Asr namozi vaqti uchun mazhab (Hanafiy - kechroq, Shofeiy - ertaroq)
          </p>
        </div>

        {/* Midnight Mode */}
        <div className="setting-card">
          <label className="setting-label">
            <span className="icon">🌙</span>
            Yarim tun rejimi
          </label>
          <select
            value={defaults.midnightMode}
            onChange={(e) =>
              setDefaults({
                ...defaults,
                midnightMode: parseInt(e.target.value),
              })
            }
            className="setting-select"
          >
            <option value={0}>Standard</option>
            <option value={1}>Jafari</option>
          </select>
          <p className="setting-hint">
            Yarim tunni qanday hisoblash (aksariyat hollarda Standard)
          </p>
        </div>
      </div>

      <div className="actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? "Saqlanmoqda..." : "💾 Saqlash"}
        </button>
      </div>

      <div className="info-box">
        <h3>ℹ️ Ma'lumot</h3>
        <p>
          Bu sozlamalar faqat{" "}
          <strong>yangi ro'yxatdan o'tgan foydalanuvchilar</strong> uchun
          qo'llaniladi.
        </p>
        <p>
          Mavjud foydalanuvchilar o'zlarining shaxsiy sozlamalarini Bot →
          Sozlamalar → Namoz sozlamalari orqali o'zgartirishlari mumkin.
        </p>
      </div>
    </div>
  );
};

export default PrayerDefaults;
