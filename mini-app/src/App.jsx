import { useEffect, useState } from "react";
import axios from "axios";
import Calendar from "./components/Calendar";
import Qibla from "./components/Qibla";
import "./App.css";

const API_BASE = "https://ramazonbot-api.saidqodirxon.uz";

function App() {
  const [userData, setUserData] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prayerError, setPrayerError] = useState(null);
  const [currentView, setCurrentView] = useState("calendar"); // "calendar" or "qibla"

  useEffect(() => {
    // Initialize Telegram WebApp
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // Set theme colors
    document.documentElement.style.setProperty(
      "--tg-theme-bg-color",
      tg.themeParams.bg_color || "#ffffff"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-text-color",
      tg.themeParams.text_color || "#000000"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-button-color",
      tg.themeParams.button_color || "#007aff"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-button-text-color",
      tg.themeParams.button_text_color || "#ffffff"
    );

    // Get user ID from multiple sources
    let userId = null;

    // 1. Try from Telegram WebApp data (preferred)
    const initDataUnsafe = tg.initDataUnsafe;
    if (initDataUnsafe && initDataUnsafe.user) {
      userId = initDataUnsafe.user.id;
    }

    // 2. Try from URL query parameter (fallback)
    if (!userId) {
      const urlParams = new URLSearchParams(window.location.search);
      const userIdParam = urlParams.get("userId");
      if (userIdParam) {
        userId = parseInt(userIdParam);
      }
    }

    // 3. Fetch user data if userId found
    if (userId) {
      fetchUserData(userId);
    } else {
      // No user ID available
      setError(
        "Telegram user data not found. Please open this app from Telegram."
      );
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      setPrayerError(null);
      
      const response = await axios.get(
        `${API_BASE}/api/miniapp/user/${userId}`
      );
      setUserData(response.data);

      // Fetch prayer times only if location exists
      if (response.data.location && response.data.location.latitude) {
        try {
          const prayerResponse = await axios.post(
            `${API_BASE}/api/miniapp/prayer-times`,
            {
              userId,
              latitude: response.data.location.latitude,
              longitude: response.data.location.longitude,
            }
          );
          setPrayerTimes(prayerResponse.data);
        } catch (prayerErr) {
          console.error("Error fetching prayer times:", prayerErr);
          setPrayerError(prayerErr.response?.data?.error || "Namoz vaqtlarini yuklashda xatolik");
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.response?.data?.error || err.message || "Ma'lumot yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const retryFetchPrayerTimes = () => {
    if (userData?.userId && userData?.location) {
      setPrayerError(null);
      setLoading(true);
      
      axios.post(`${API_BASE}/api/miniapp/prayer-times`, {
        userId: userData.userId,
        latitude: userData.location.latitude,
        longitude: userData.location.longitude,
      })
      .then(response => {
        setPrayerTimes(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Retry error:", err);
        setPrayerError(err.response?.data?.error || "Namoz vaqtlarini yuklashda xatolik");
        setLoading(false);
      });
    }
  };

  if (loading) {
    return (
      <div className="app loading">
        <div className="spinner"></div>
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app error">
        <p>❌ Xatolik: {error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🕌 Namoz Taqvimi</h1>
        {userData?.location && (
          <p className="location">📍 {userData.location.name}</p>
        )}

        {/* View Tabs */}
        <div className="view-tabs">
          <button
            className={currentView === "calendar" ? "tab active" : "tab"}
            onClick={() => setCurrentView("calendar")}
          >
            📅 Taqvim
          </button>
          <button
            className={currentView === "qibla" ? "tab active" : "tab"}
            onClick={() => setCurrentView("qibla")}
          >
            🕋 Qibla
          </button>
        </div>
      </header>

      {currentView === "calendar" ? (
        prayerError ? (
          <div className="error-container">
            <p>❌ Xatolik: {prayerError}</p>
            <button onClick={retryFetchPrayerTimes} className="retry-button">
              🔄 Qayta urinish
            </button>
          </div>
        ) : prayerTimes ? (
          <Calendar prayerTimes={prayerTimes} userData={userData} />
        ) : (
          <div className="no-location">
            <p>📍 Joylashuvingizni kiriting</p>
            <p className="hint">Botda /start bosing va joylashuvni kiriting</p>
          </div>
        )
      ) : (
        <Qibla userData={userData} />
      )}
    </div>
  );
}

export default App;
