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
      const response = await axios.get(
        `${API_URL}/locations/${locationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLocation(response.data);
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

      {/* Prayer Times List */}
      <div className="prayer-times-list">
        <h3>Saqlangan sanalar: {prayerTimes.length} ta</h3>

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
