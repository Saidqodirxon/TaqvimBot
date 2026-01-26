import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Greetings from "./pages/Greetings";
import BotInfo from "./pages/BotInfo";
import Channels from "./pages/Channels";
import Prayers from "./pages/Prayers";
import Broadcast from "./pages/Broadcast";
import PrayerDefaults from "./pages/PrayerDefaults";
import Admins from "./pages/Admins";
import Locations from "./pages/Locations";
import MonthlyPrayerTimes from "./pages/MonthlyPrayerTimes";
import Cache from "./pages/Cache";
import Suggestions from "./pages/Suggestions";
import Translations from "./pages/Translations";
import Profile from "./pages/Profile";
import Resources from "./pages/Resources";
import Test from "./pages/Test";
import Backups from "./pages/Backups";
import Layout from "./components/Layout";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout setAuth={setIsAuthenticated}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/greetings" element={<Greetings />} />
        <Route path="/prayers" element={<Prayers />} />
        <Route path="/prayer-defaults" element={<PrayerDefaults />} />
        <Route path="/bot-info" element={<BotInfo />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/admins" element={<Admins />} />
        <Route path="/locations" element={<Locations />} />
        <Route
          path="/locations/:locationId/monthly-times"
          element={<MonthlyPrayerTimes />}
        />
        <Route path="/cache" element={<Cache />} />
        <Route path="/suggestions" element={<Suggestions />} />
        <Route path="/translations" element={<Translations />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/test" element={<Test />} />
        <Route path="/backups" element={<Backups />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
