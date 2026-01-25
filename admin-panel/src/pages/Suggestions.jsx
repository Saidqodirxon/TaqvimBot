import { useEffect, useState } from "react";
import { api } from "../api";
import "./Suggestions.css";

function Suggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    implemented: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchSuggestions();
  }, [filter, page]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (filter !== "all") {
        params.append("status", filter);
      }

      const response = await api.get(`/suggestions?${params.toString()}`);
      setSuggestions(response.data.suggestions);
      setTotalPages(response.data.totalPages);
      setStats(response.data.stats);
      setError("");
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, adminNote = "") => {
    try {
      await api.patch(`/suggestions/${id}`, { status, adminNote });
      fetchSuggestions();
    } catch (err) {
      console.error("Error updating suggestion:", err);
      alert("Failed to update suggestion");
    }
  };

  const deleteSuggestion = async (id) => {
    if (!confirm("Are you sure you want to delete this suggestion?")) {
      return;
    }

    try {
      await api.delete(`/suggestions/${id}`);
      fetchSuggestions();
    } catch (err) {
      console.error("Error deleting suggestion:", err);
      alert("Failed to delete suggestion");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "badge-pending",
      reviewed: "badge-reviewed",
      implemented: "badge-implemented",
      rejected: "badge-rejected",
    };
    return badges[status] || "";
  };

  const getStatusText = (status) => {
    const texts = {
      pending: "⏳ Kutilmoqda",
      reviewed: "👀 Ko'rib chiqilgan",
      implemented: "✅ Amalga oshirilgan",
      rejected: "❌ Rad etilgan",
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="suggestions-page">
      <div className="page-header">
        <h1>💡 Takliflar</h1>
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
            <div className="stat-value">{stats.implemented}</div>
            <div className="stat-label">Amalga oshirilgan</div>
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
          className={filter === "reviewed" ? "active" : ""}
          onClick={() => {
            setFilter("reviewed");
            setPage(1);
          }}
        >
          Ko'rib chiqilgan
        </button>
        <button
          className={filter === "implemented" ? "active" : ""}
          onClick={() => {
            setFilter("implemented");
            setPage(1);
          }}
        >
          Amalga oshirilgan
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

      <div className="suggestions-list">
        {suggestions.map((suggestion) => (
          <div key={suggestion._id} className="suggestion-card">
            <div className="suggestion-header">
              <span className={`status-badge ${getStatusBadge(suggestion.status)}`}>
                {getStatusText(suggestion.status)}
              </span>
              <span className="suggestion-date">
                {new Date(suggestion.createdAt).toLocaleDateString("uz-UZ")}
              </span>
            </div>

            <div className="suggestion-text">{suggestion.text}</div>

            <div className="suggestion-user">
              👤 User ID: {suggestion.userId}
            </div>

            {suggestion.adminNote && (
              <div className="admin-note">
                <strong>Admin eslatma:</strong> {suggestion.adminNote}
              </div>
            )}

            {suggestion.reviewedBy && (
              <div className="reviewed-by">
                Ko'rib chiqdi: {suggestion.reviewedBy} •{" "}
                {new Date(suggestion.reviewedAt).toLocaleDateString("uz-UZ")}
              </div>
            )}

            <div className="suggestion-actions">
              {suggestion.status === "pending" && (
                <>
                  <button
                    className="btn-reviewed"
                    onClick={() => updateStatus(suggestion._id, "reviewed")}
                  >
                    👀 Ko'rib chiqilgan
                  </button>
                  <button
                    className="btn-implemented"
                    onClick={() => updateStatus(suggestion._id, "implemented")}
                  >
                    ✅ Amalga oshirildi
                  </button>
                  <button
                    className="btn-rejected"
                    onClick={() => {
                      const note = prompt("Rad etish sababi:");
                      if (note) {
                        updateStatus(suggestion._id, "rejected", note);
                      }
                    }}
                  >
                    ❌ Rad etish
                  </button>
                </>
              )}

              {suggestion.status === "reviewed" && (
                <>
                  <button
                    className="btn-implemented"
                    onClick={() => updateStatus(suggestion._id, "implemented")}
                  >
                    ✅ Amalga oshirildi
                  </button>
                  <button
                    className="btn-rejected"
                    onClick={() => {
                      const note = prompt("Rad etish sababi:");
                      if (note) {
                        updateStatus(suggestion._id, "rejected", note);
                      }
                    }}
                  >
                    ❌ Rad etish
                  </button>
                </>
              )}

              <button
                className="btn-delete"
                onClick={() => deleteSuggestion(suggestion._id)}
              >
                🗑️ O'chirish
              </button>
            </div>
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

export default Suggestions;
