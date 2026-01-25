import { useEffect, useState } from "react";
import { api } from "../api";
import "./GreetingLogs.css";

function GreetingLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, [filter, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (filter !== "all") {
        params.append("status", filter);
      }

      const response = await api.get(`/greeting-logs?${params.toString()}`);
      setLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
      setStats(response.data.stats);
      setError("");
    } catch (err) {
      console.error("Error fetching greeting logs:", err);
      setError("Failed to load greeting logs");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "badge-pending",
      approved: "badge-approved",
      rejected: "badge-rejected",
    };
    return badges[status] || "";
  };

  const getStatusText = (status) => {
    const texts = {
      pending: "⏳ Kutilmoqda",
      approved: "✅ Tasdiqlangan",
      rejected: "❌ Rad etilgan",
    };
    return texts[status] || status;
  };

  const getMediaIcon = (mediaType) => {
    const icons = {
      text: "📝",
      photo: "📷",
      video: "🎥",
    };
    return icons[mediaType] || "📄";
  };

  if (loading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="greeting-logs-page">
      <div className="page-header">
        <h1>💌 Tabrik tarixchasi</h1>
        <div className="stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Jami</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Kutilmoqda</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Tasdiqlangan</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rad etilgan</div>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="filters">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
        >
          Barchasi
        </button>
        <button
          className={filter === "pending" ? "active" : ""}
          onClick={() => {
            setFilter("pending");
            setPage(1);
          }}
        >
          Kutilmoqda
        </button>
        <button
          className={filter === "approved" ? "active" : ""}
          onClick={() => {
            setFilter("approved");
            setPage(1);
          }}
        >
          Tasdiqlangan
        </button>
        <button
          className={filter === "rejected" ? "active" : ""}
          onClick={() => {
            setFilter("rejected");
            setPage(1);
          }}
        >
          Rad etilgan
        </button>
      </div>

      <div className="logs-list">
        {logs.map((log) => (
          <div key={log._id} className="log-card">
            <div className="log-header">
              <div className="log-title">
                {getMediaIcon(log.mediaType)} {log.mediaType}
              </div>
              <span className={`status-badge ${getStatusBadge(log.status)}`}>
                {getStatusText(log.status)}
              </span>
            </div>

            <div className="log-text">{log.text}</div>

            <div className="log-meta">
              <div>👤 User ID: {log.userId}</div>
              <div>📅 {new Date(log.createdAt).toLocaleString("uz-UZ")}</div>
            </div>

            {log.channelMessageId && (
              <div className="channel-info">
                ✅ Kanalga yuborildi: Message ID {log.channelMessageId}
              </div>
            )}

            {log.rejectionReason && (
              <div className="rejection-reason">
                <strong>Rad etish sababi:</strong> {log.rejectionReason}
              </div>
            )}

            {log.approvedAt && (
              <div className="approved-at">
                Tasdiqlandi: {new Date(log.approvedAt).toLocaleString("uz-UZ")}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            ← Oldingi
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Keyingi →
          </button>
        </div>
      )}
    </div>
  );
}

export default GreetingLogs;
