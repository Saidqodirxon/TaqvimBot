import { useState, useEffect } from "react";
import axios from "axios";
import "./Cache.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

function Cache() {
  const [caches, setCaches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCaches();
  }, [page]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await axios.get(`${API_BASE}/api/cache/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCaches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await axios.get(`${API_BASE}/api/cache`, {
        params: { page, limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setCaches(response.data.caches);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching caches:", error);
      alert("Xatolik: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (latitude, longitude) => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("adminToken");
      await axios.post(
        `${API_BASE}/api/cache/refresh`,
        { latitude, longitude },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Cache yangilandi!");
      fetchCaches();
      fetchStats();
    } catch (error) {
      console.error("Error refreshing cache:", error);
      alert("Xatolik: " + (error.response?.data?.error || error.message));
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      await axios.delete(`${API_BASE}/api/cache/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Cache o'chirildi!");
      fetchCaches();
      fetchStats();
    } catch (error) {
      console.error("Error deleting cache:", error);
      alert("Xatolik: " + error.message);
    }
  };

  const handleClearExpired = async () => {
    if (!confirm("Barcha muddati o'tgan cache'larni o'chirmoqchimisiz?"))
      return;

    try {
      const token = localStorage.getItem("adminToken");
      const response = await axios.post(
        `${API_BASE}/api/cache/clear-expired`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`${response.data.deletedCount} ta cache o'chirildi!`);
      fetchCaches();
      fetchStats();
    } catch (error) {
      console.error("Error clearing expired:", error);
      alert("Xatolik: " + error.message);
    }
  };

  const handleBulkRefresh = async () => {
    if (
      !confirm(
        "Barcha joylashuvlar uchun cache'ni yangilamoqchimisiz? Bu biroz vaqt olishi mumkin."
      )
    )
      return;

    try {
      setRefreshing(true);
      const token = localStorage.getItem("adminToken");
      const response = await axios.post(
        `${API_BASE}/api/cache/bulk-refresh`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(
        `Tugadi!\nMuvaffaqiyatli: ${response.data.success}\nXato: ${response.data.failed}`
      );
      fetchCaches();
      fetchStats();
    } catch (error) {
      console.error("Error bulk refresh:", error);
      alert("Xatolik: " + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("uz-UZ");
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading && !caches.length) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="cache-page">
      <div className="page-header">
        <h1>💾 Cache Boshqaruvi</h1>
        <div className="header-actions">
          <button
            onClick={handleBulkRefresh}
            disabled={refreshing}
            className="btn-refresh"
          >
            {refreshing ? "⏳ Yangilanmoqda..." : "🔄 Barchasini Yangilash"}
          </button>
          <button onClick={handleClearExpired} className="btn-clear">
            🗑️ Muddati O'tganlarni Tozalash
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Jami Cache</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Aktiv</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.expired}</div>
            <div className="stat-label">Muddati O'tgan</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.uniqueLocations}</div>
            <div className="stat-label">Joylashuvlar</div>
          </div>
        </div>
      )}

      <div className="caches-table">
        <table>
          <thead>
            <tr>
              <th>Joylashuv</th>
              <th>Sana</th>
              <th>Manba</th>
              <th>Saqlangan</th>
              <th>Muddati</th>
              <th>Holat</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {caches.map((cache) => (
              <tr
                key={cache._id}
                className={isExpired(cache.expiresAt) ? "expired" : ""}
              >
                <td>
                  <div className="location-info">
                    <div className="location-key">{cache.locationKey}</div>
                    <div className="location-coords">
                      {cache.latitude.toFixed(4)}, {cache.longitude.toFixed(4)}
                    </div>
                  </div>
                </td>
                <td>{cache.date}</td>
                <td>
                  <span className={`badge badge-${cache.source}`}>
                    {cache.source === "aladhan-api"
                      ? "🌐 API"
                      : cache.source === "monthly"
                        ? "📅 Oylik"
                        : "✍️ Manual"}
                  </span>
                </td>
                <td>{formatDate(cache.fetchedAt)}</td>
                <td>{formatDate(cache.expiresAt)}</td>
                <td>
                  {isExpired(cache.expiresAt) ? (
                    <span className="status-expired">❌ Muddati o'tgan</span>
                  ) : (
                    <span className="status-active">✅ Aktiv</span>
                  )}
                </td>
                <td>
                  <div className="actions">
                    <button
                      onClick={() =>
                        handleRefresh(cache.latitude, cache.longitude)
                      }
                      disabled={refreshing}
                      className="btn-sm btn-refresh-sm"
                      title="Yangilash"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => handleDelete(cache._id)}
                      className="btn-sm btn-delete"
                      title="O'chirish"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn-page"
          >
            ← Oldingi
          </button>
          <span className="page-info">
            {page} / {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn-page"
          >
            Keyingi →
          </button>
        </div>
      )}
    </div>
  );
}

export default Cache;
