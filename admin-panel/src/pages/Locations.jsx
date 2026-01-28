import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import "./Locations.css";

// using global API_URL from src/api.js

const Locations = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [viewMode, setViewMode] = useState("table"); // table or grid
  const [sortBy, setSortBy] = useState("userCount");
  const [sortOrder, setSortOrder] = useState("desc");
  const [formData, setFormData] = useState({
    name: "",
    nameUz: "",
    nameCr: "",
    nameRu: "",
    latitude: "",
    longitude: "",
    timezone: "Asia/Tashkent",
    country: "Uzbekistan",
    isDefault: false,
    manualPrayerTimes: {
      enabled: false,
      fajr: "",
      sunrise: "",
      dhuhr: "",
      asr: "",
      maghrib: "",
      isha: "",
    },
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLocations(response.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      alert("Joylashuvlarni yuklashda xatolik!");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("manualPrayerTimes.")) {
      const field = name.split(".")[1];
      setFormData({
        ...formData,
        manualPrayerTimes: {
          ...formData.manualPrayerTimes,
          [field]: type === "checkbox" ? checked : value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.name ||
      !formData.nameUz ||
      !formData.nameCr ||
      !formData.nameRu ||
      !formData.latitude ||
      !formData.longitude
    ) {
      alert("Barcha majburiy maydonlarni to'ldiring!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      if (editingLocation) {
        await axios.put(
          `${API_URL}/locations/${editingLocation._id}`,
          formData,
          config
        );
        alert("Joylashuv yangilandi!");
      } else {
        await axios.post(`${API_URL}/locations`, formData, config);
        alert("Joylashuv qo'shildi!");
      }

      setShowModal(false);
      setEditingLocation(null);
      resetForm();
      fetchLocations();
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Xatolik: " + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      nameUz: location.nameUz,
      nameCr: location.nameCr,
      nameRu: location.nameRu,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone || "Asia/Tashkent",
      country: location.country || "Uzbekistan",
      isDefault: location.isDefault || false,
      manualPrayerTimes: location.manualPrayerTimes || {
        enabled: false,
        fajr: "",
        sunrise: "",
        dhuhr: "",
        asr: "",
        maghrib: "",
        isha: "",
      },
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Rostdan ham bu joylashuvni o'chirmoqchimisiz?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/locations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Joylashuv o'chirildi!");
      fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      alert("O'chirishda xatolik!");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      nameUz: "",
      nameCr: "",
      nameRu: "",
      latitude: "",
      longitude: "",
      timezone: "Asia/Tashkent",
      country: "Uzbekistan",
      isDefault: false,
      manualPrayerTimes: {
        enabled: false,
        fajr: "",
        sunrise: "",
        dhuhr: "",
        asr: "",
        maghrib: "",
        isha: "",
      },
    });
  };

  const openAddModal = () => {
    setEditingLocation(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  // Filter and sort locations
  const filteredLocations = locations
    .filter((location) => {
      const matchesSearch =
        !searchQuery ||
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.nameUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.nameCr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.nameRu.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion =
        !regionFilter ||
        location.name.toLowerCase().includes(regionFilter.toLowerCase());

      return matchesSearch && matchesRegion;
    })
    .sort((a, b) => {
      let valA, valB;
      if (sortBy === "userCount") {
        valA = a.userCount || 0;
        valB = b.userCount || 0;
      } else if (sortBy === "growth") {
        valA = a.growth || 0;
        valB = b.growth || 0;
      } else {
        valA = a.name?.toLowerCase() || "";
        valB = b.name?.toLowerCase() || "";
      }
      if (sortOrder === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

  // Calculate totals
  const totalUsers = locations.reduce((sum, l) => sum + (l.userCount || 0), 0);
  const thisMonthTotal = locations.reduce(
    (sum, l) => sum + (l.monthlyStats?.thisMonth || 0),
    0
  );
  const lastMonthTotal = locations.reduce(
    (sum, l) => sum + (l.monthlyStats?.lastMonth || 0),
    0
  );

  // Extract unique regions from location names
  const regions = [
    ...new Set(
      locations
        .map((l) => {
          const parts = l.name.split(",");
          return parts[0].trim();
        })
        .filter((r) => r)
    ),
  ].sort();

  return (
    <div className="locations-page">
      <div className="page-header">
        <div>
          <h1>📍 Joylashuvlar ({filteredLocations.length})</h1>
          <p className="subtitle">
            Jami: {totalUsers.toLocaleString()} foydalanuvchi | Bu oy:{" "}
            {thisMonthTotal.toLocaleString()} | O'tgan oy:{" "}
            {lastMonthTotal.toLocaleString()}
          </p>
        </div>
        <div className="header-actions">
          <button
            className={`btn-view ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            📊 Jadval
          </button>
          <button
            className={`btn-view ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            🔲 Grid
          </button>
          <button className="btn-add" onClick={openAddModal}>
            + Yangi joylashuv
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="🔍 Qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="filter-input"
        />
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">Barcha viloyatlar</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="filter-select"
        >
          <option value="userCount">Foydalanuvchilar</option>
          <option value="growth">O'sish %</option>
          <option value="name">Nomi</option>
        </select>
        <button
          className="btn-sort"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? "⬆️" : "⬇️"}
        </button>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="table-container">
          <table className="locations-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nomi</th>
                <th>Koordinatalar</th>
                <th>Foydalanuvchilar</th>
                <th>Bu oy</th>
                <th>O'tgan oy</th>
                <th>2 oy oldin</th>
                <th>O'sish</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.map((location, index) => (
                <tr key={location._id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="location-name">
                      <strong>{location.name}</strong>
                      {location.isDefault && (
                        <span className="default-badge">Default</span>
                      )}
                      {location.manualPrayerTimes?.enabled && (
                        <span className="manual-badge">Manual</span>
                      )}
                    </div>
                    <small className="location-names">
                      {location.nameUz} | {location.nameCr}
                    </small>
                  </td>
                  <td className="coords">
                    <code>
                      {location.latitude?.toFixed(4)},{" "}
                      {location.longitude?.toFixed(4)}
                    </code>
                  </td>
                  <td className="user-count">
                    <strong>
                      {(location.userCount || 0).toLocaleString()}
                    </strong>
                  </td>
                  <td className="stat">
                    {(location.monthlyStats?.thisMonth || 0).toLocaleString()}
                  </td>
                  <td className="stat">
                    {(location.monthlyStats?.lastMonth || 0).toLocaleString()}
                  </td>
                  <td className="stat">
                    {(
                      location.monthlyStats?.twoMonthsAgo || 0
                    ).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`growth-badge ${
                        (location.growth || 0) > 0
                          ? "positive"
                          : (location.growth || 0) < 0
                            ? "negative"
                            : ""
                      }`}
                    >
                      {(location.growth || 0) > 0 ? "+" : ""}
                      {location.growth || 0}%
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-icon"
                      onClick={() =>
                        navigate(`/locations/${location._id}/monthly-times`)
                      }
                      title="Oylik namoz vaqtlari"
                    >
                      📅
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleEdit(location)}
                      title="Tahrirlash"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDelete(location._id)}
                      title="O'chirish"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="locations-grid">
          {filteredLocations.map((location) => (
            <div key={location._id} className="location-card">
              <div className="location-header">
                <h3>
                  {location.name}
                  {location.isDefault && (
                    <span className="default-badge">Default</span>
                  )}
                </h3>
                <div className="user-count-badge">
                  👥 {(location.userCount || 0).toLocaleString()}
                </div>
              </div>
              <div className="location-body">
                <div className="monthly-stats">
                  <div className="stat-item">
                    <span className="stat-label">Bu oy</span>
                    <span className="stat-value">
                      {(location.monthlyStats?.thisMonth || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">O'tgan oy</span>
                    <span className="stat-value">
                      {(location.monthlyStats?.lastMonth || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">O'sish</span>
                    <span
                      className={`stat-value ${
                        (location.growth || 0) > 0
                          ? "positive"
                          : (location.growth || 0) < 0
                            ? "negative"
                            : ""
                      }`}
                    >
                      {(location.growth || 0) > 0 ? "+" : ""}
                      {location.growth || 0}%
                    </span>
                  </div>
                </div>
                <p>
                  <strong>📍</strong> {location.latitude?.toFixed(4)},{" "}
                  {location.longitude?.toFixed(4)}
                </p>
                {location.manualPrayerTimes?.enabled && (
                  <div className="manual-times">
                    <small>🕌 Qo'lda kiritilgan vaqtlar</small>
                  </div>
                )}
              </div>
              <div className="location-actions">
                <button
                  className="btn-calendar"
                  onClick={() =>
                    navigate(`/locations/${location._id}/monthly-times`)
                  }
                >
                  📅 Oylik
                </button>
                <button
                  className="btn-edit"
                  onClick={() => handleEdit(location)}
                >
                  ✏️
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(location._id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>
              {editingLocation ? "Joylashuvni tahrirlash" : "Yangi joylashuv"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nomi (English) *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nomi (O'zbekcha) *</label>
                <input
                  type="text"
                  name="nameUz"
                  value={formData.nameUz}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nomi (Кирилл) *</label>
                <input
                  type="text"
                  name="nameCr"
                  value={formData.nameCr}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nomi (Русский) *</label>
                <input
                  type="text"
                  name="nameRu"
                  value={formData.nameRu}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude (kenglik) *</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Longitude (uzunlik) *</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vaqt mintaqasi</label>
                  <input
                    type="text"
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Mamlakat</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  Asosiy joylashuv qilish
                </label>
              </div>

              <hr />

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="manualPrayerTimes.enabled"
                    checked={formData.manualPrayerTimes.enabled}
                    onChange={handleInputChange}
                  />
                  <strong>Namoz vaqtlarini qo'lda kiritish</strong>
                </label>
              </div>

              {formData.manualPrayerTimes.enabled && (
                <div className="manual-times-form">
                  <p className="info-text">ℹ️ Format: HH:MM (masalan: 05:30)</p>

                  <div className="form-row">
                    <div className="form-group">
                      <label>🌅 Bomdod</label>
                      <input
                        type="time"
                        name="manualPrayerTimes.fajr"
                        value={formData.manualPrayerTimes.fajr}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>☀️ Quyosh</label>
                      <input
                        type="time"
                        name="manualPrayerTimes.sunrise"
                        value={formData.manualPrayerTimes.sunrise}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>🌞 Peshin</label>
                      <input
                        type="time"
                        name="manualPrayerTimes.dhuhr"
                        value={formData.manualPrayerTimes.dhuhr}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>🌤 Asr</label>
                      <input
                        type="time"
                        name="manualPrayerTimes.asr"
                        value={formData.manualPrayerTimes.asr}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>🌇 Shom</label>
                      <input
                        type="time"
                        name="manualPrayerTimes.maghrib"
                        value={formData.manualPrayerTimes.maghrib}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>🌙 Xufton</label>
                      <input
                        type="time"
                        name="manualPrayerTimes.isha"
                        value={formData.manualPrayerTimes.isha}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-save">
                  💾 Saqlash
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLocation(null);
                    resetForm();
                  }}
                >
                  ❌ Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locations;
