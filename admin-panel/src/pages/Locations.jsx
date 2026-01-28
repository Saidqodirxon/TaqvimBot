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

  // Filter locations based on search and region
  const filteredLocations = locations.filter((location) => {
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
  });

  // Extract unique regions from location names
  const regions = [
    ...new Set(
      locations
        .map((l) => {
          // Extract region from name like "Toshkent, Olmaliq" -> "Toshkent"
          const parts = l.name.split(",");
          return parts[0].trim();
        })
        .filter((r) => r)
    ),
  ].sort();

  return (
    <div className="locations-page">
      <div className="page-header">
        <h1>📍 Joylashuvlar ({filteredLocations.length})</h1>
        <button className="btn-add" onClick={openAddModal}>
          + Yangi joylashuv
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section" style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="🔍 Qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 2,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "14px",
          }}
        />
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "14px",
          }}
        >
          <option value="">Barcha viloyatlar</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

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
            </div>
            <div className="location-body">
              <p>
                <strong>🇺🇿 O'zbekcha:</strong> {location.nameUz}
              </p>
              <p>
                <strong>🇺🇿 Кирилл:</strong> {location.nameCr}
              </p>
              <p>
                <strong>🇷🇺 Русский:</strong> {location.nameRu}
              </p>
              <p>
                <strong>📍 Koordinatalar:</strong> {location.latitude},{" "}
                {location.longitude}
              </p>
              <p>
                <strong>🕐 Vaqt mintaqasi:</strong> {location.timezone}
              </p>
              <p>
                <strong>🌍 Mamlakat:</strong> {location.country}
              </p>

              {location.manualPrayerTimes?.enabled && (
                <div className="manual-times">
                  <p>
                    <strong>🕌 Qo'lda kiritilgan namoz vaqtlari:</strong>
                  </p>
                  <div className="times-grid">
                    <span>Bomdod: {location.manualPrayerTimes.fajr}</span>
                    <span>Quyosh: {location.manualPrayerTimes.sunrise}</span>
                    <span>Peshin: {location.manualPrayerTimes.dhuhr}</span>
                    <span>Asr: {location.manualPrayerTimes.asr}</span>
                    <span>Shom: {location.manualPrayerTimes.maghrib}</span>
                    <span>Xufton: {location.manualPrayerTimes.isha}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="location-actions">
              <button
                className="btn-calendar"
                onClick={() =>
                  navigate(`/locations/${location._id}/monthly-times`)
                }
                title="Oylik namoz vaqtlari"
              >
                📅 Oylik vaqtlar
              </button>
              <button className="btn-edit" onClick={() => handleEdit(location)}>
                ✏️ Tahrirlash
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDelete(location._id)}
              >
                🗑️ O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>

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
