import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import "./MonthlyPrayerTimes.css";

// using global API_URL from src/api.js

const MonthlyPrayerTimes = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLocationEdit, setShowLocationEdit] = useState(false);
  const [locationFormData, setLocationFormData] = useState({
    nameUz: "",
    nameCr: "",
    nameRu: "",
    latitude: "",
    longitude: "",
    timezone: "Asia/Tashkent",
  });
  const [formData, setFormData] = useState({
    date: "",
    hijriDate: {
      day: 1,
      month: "Muharram",
      year: 1446,
    },
    timings: {
      fajr: "",
      sunrise: "",
      dhuhr: "",
      asr: "",
      maghrib: "",
      isha: "",
    },
  });

  const hijriMonths = [
    "Muharram",
    "Safar",
    "Rabi al-Awwal",
    "Rabi al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Shaban",
    "Ramadan",
    "Shawwal",
    "Dhul-Qadah",
    "Dhul-Hijjah",
  ];

  useEffect(() => {
    fetchLocation();
    fetchPrayerTimes();
  }, [locationId, selectedMonth, selectedYear]);

  const fetchLocation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/locations/${locationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLocation(response.data);
      setLocationFormData({
        nameUz: response.data.nameUz || response.data.name,
        nameCr: response.data.nameCr || response.data.name,
        nameRu: response.data.nameRu || response.data.name,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timezone: response.data.timezone || "Asia/Tashkent",
      });
    } catch (error) {
      console.error("Error fetching location:", error);
      alert("Joylashuvni yuklashda xatolik!");
    }
  };

  const fetchPrayerTimes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/monthly-prayer-times/${locationId}?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPrayerTimes(response.data);
    } catch (error) {
      console.error("Error fetching prayer times:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/monthly-prayer-times/${locationId}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Namoz vaqtlari saqlandi!");
      setShowAddForm(false);
      resetForm();
      fetchPrayerTimes();
    } catch (error) {
      console.error("Error saving prayer times:", error);
      alert("Xatolik: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (date) => {
    if (!confirm("Ushbu namoz vaqtini o'chirmoqchimisiz?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_URL}/monthly-prayer-times/${locationId}/${date}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("O'chirildi!");
      fetchPrayerTimes();
    } catch (error) {
      console.error("Error deleting prayer time:", error);
      alert("Xatolik: " + (error.response?.data?.error || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      date: "",
      hijriDate: {
        day: 1,
        month: "Muharram",
        year: 1446,
      },
      timings: {
        fajr: "",
        sunrise: "",
        dhuhr: "",
        asr: "",
        maghrib: "",
        isha: "",
      },
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleLocationUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/locations/${locationId}`, locationFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Joylashuv yangilandi!");
      setShowLocationEdit(false);
      fetchLocation();
    } catch (error) {
      console.error("Error updating location:", error);
      alert("Xatolik: " + (error.response?.data?.error || error.message));
    }
  };

  if (loading && !location) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="monthly-prayer-times-page">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate("/locations")}>
            ← Orqaga
          </button>
          <h1>📅 Oylik Namoz Vaqtlari</h1>
          <p>
            {location?.nameUz || location?.name} - {selectedMonth}/
            {selectedYear}
          </p>
        </div>
        <button
          className="btn-add"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          ➕ Sana qo'shish
        </button>
      </div>

      {/* Location Info Card */}
      <div className="location-info-card card">
        <div className="location-header">
          <h3>📍 Joylashuv Ma'lumotlari</h3>
          <button
            className="btn-edit"
            onClick={() => setShowLocationEdit(!showLocationEdit)}
          >
            {showLocationEdit ? "❌ Bekor qilish" : "✏️ Tahrirlash"}
          </button>
        </div>

        {!showLocationEdit ? (
          <div className="location-details">
            <div className="detail-row">
              <span className="label">O'zbekcha (Lotin):</span>
              <span className="value">
                {location?.nameUz || location?.name}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Ўзбекча (Кирилл):</span>
              <span className="value">
                {location?.nameCr || location?.name}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Русский:</span>
              <span className="value">
                {location?.nameRu || location?.name}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Latitude:</span>
              <span className="value">{location?.latitude}</span>
            </div>
            <div className="detail-row">
              <span className="label">Longitude:</span>
              <span className="value">{location?.longitude}</span>
            </div>
            <div className="detail-row">
              <span className="label">Timezone:</span>
              <span className="value">
                {location?.timezone || "Asia/Tashkent"}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLocationUpdate} className="location-edit-form">
            <div className="form-group">
              <label>O'zbekcha (Lotin) *</label>
              <input
                type="text"
                required
                value={locationFormData.nameUz}
                onChange={(e) =>
                  setLocationFormData({
                    ...locationFormData,
                    nameUz: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Ўзбекча (Кирилл) *</label>
              <input
                type="text"
                required
                value={locationFormData.nameCr}
                onChange={(e) =>
                  setLocationFormData({
                    ...locationFormData,
                    nameCr: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Русский *</label>
              <input
                type="text"
                required
                value={locationFormData.nameRu}
                onChange={(e) =>
                  setLocationFormData({
                    ...locationFormData,
                    nameRu: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={locationFormData.latitude}
                  onChange={(e) =>
                    setLocationFormData({
                      ...locationFormData,
                      latitude: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={locationFormData.longitude}
                  onChange={(e) =>
                    setLocationFormData({
                      ...locationFormData,
                      longitude: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label>Timezone *</label>
              <input
                type="text"
                required
                value={locationFormData.timezone}
                onChange={(e) =>
                  setLocationFormData({
                    ...locationFormData,
                    timezone: e.target.value,
                  })
                }
              />
            </div>
            <button type="submit" className="btn-save">
              💾 Saqlash
            </button>
          </form>
        )}
      </div>

      {/* Month/Year Selector */}
      <div className="date-selector">
        <label>
          Oy:
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleDateString("uz-UZ", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </label>

        <label>
          Yil:
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="add-form card">
          <h3>Yangi sana qo'shish</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Sana *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-section">
              <h4>Hijriy Sana</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Kun</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.hijriDate.day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hijriDate: {
                          ...formData.hijriDate,
                          day: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Oy</label>
                  <select
                    value={formData.hijriDate.month}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hijriDate: {
                          ...formData.hijriDate,
                          month: e.target.value,
                        },
                      })
                    }
                  >
                    {hijriMonths.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Yil</label>
                  <input
                    type="number"
                    min="1400"
                    max="1500"
                    value={formData.hijriDate.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hijriDate: {
                          ...formData.hijriDate,
                          year: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Namoz Vaqtlari *</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Bomdod</label>
                  <input
                    type="time"
                    required
                    value={formData.timings.fajr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timings: { ...formData.timings, fajr: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Quyosh</label>
                  <input
                    type="time"
                    required
                    value={formData.timings.sunrise}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timings: {
                          ...formData.timings,
                          sunrise: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Peshin</label>
                  <input
                    type="time"
                    required
                    value={formData.timings.dhuhr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timings: { ...formData.timings, dhuhr: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Asr</label>
                  <input
                    type="time"
                    required
                    value={formData.timings.asr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timings: { ...formData.timings, asr: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Shom</label>
                  <input
                    type="time"
                    required
                    value={formData.timings.maghrib}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timings: {
                          ...formData.timings,
                          maghrib: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Xufton</label>
                  <input
                    type="time"
                    required
                    value={formData.timings.isha}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timings: { ...formData.timings, isha: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                💾 Saqlash
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                ❌ Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics */}
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <p className="stat-label">Saqlangan Kunlar</p>
            <h3 className="stat-value">{prayerTimes.length}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <p className="stat-label">Tanlangan Oy</p>
            <h3 className="stat-value">
              {new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
                "uz-UZ",
                { month: "long", year: "numeric" }
              )}
            </h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-info">
            <p className="stat-label">Joylashuv</p>
            <h3 className="stat-value">{location?.nameUz || "..."}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            {prayerTimes.length === 0
              ? "❌"
              : prayerTimes.length >= 28
                ? "✅"
                : "⚠️"}
          </div>
          <div className="stat-info">
            <p className="stat-label">Holat</p>
            <h3 className="stat-value">
              {prayerTimes.length === 0
                ? "Bo'sh"
                : prayerTimes.length >= 28
                  ? "To'liq"
                  : "Qisman"}
            </h3>
          </div>
        </div>
      </div>

      {/* Prayer Times List */}
      <div className="prayer-times-list">
        <h3>📋 Namoz Vaqtlari Jadvali ({prayerTimes.length} kun saqlangan)</h3>

        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : prayerTimes.length === 0 ? (
          <div className="empty-state">
            <p>⚠️ Bu oy uchun namoz vaqtlari kiritilmagan</p>
          </div>
        ) : (
          <div className="times-grid">
            {prayerTimes.map((item) => (
              <div key={item._id} className="time-card card">
                <div className="time-header">
                  <div>
                    <h4>{formatDate(item.date)}</h4>
                    <p className="hijri-date">
                      🌙 {item.hijriDate.month} {item.hijriDate.day},{" "}
                      {item.hijriDate.year}
                    </p>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(item.date)}
                  >
                    🗑️
                  </button>
                </div>

                <div className="timings">
                  <div className="timing-item">
                    <span>Bomdod:</span>
                    <strong>{item.timings.fajr}</strong>
                  </div>
                  <div className="timing-item">
                    <span>Quyosh:</span>
                    <strong>{item.timings.sunrise}</strong>
                  </div>
                  <div className="timing-item">
                    <span>Peshin:</span>
                    <strong>{item.timings.dhuhr}</strong>
                  </div>
                  <div className="timing-item">
                    <span>Asr:</span>
                    <strong>{item.timings.asr}</strong>
                  </div>
                  <div className="timing-item">
                    <span>Shom:</span>
                    <strong>{item.timings.maghrib}</strong>
                  </div>
                  <div className="timing-item">
                    <span>Xufton:</span>
                    <strong>{item.timings.isha}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyPrayerTimes;
