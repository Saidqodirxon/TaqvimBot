import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../api";
import {
  Send,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Radio,
  Link as LinkIcon,
} from "lucide-react";
import "./Broadcast.css";

// using global API_URL from src/api.js

function Broadcast() {
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    language: "",
    hasJoinedChannel: undefined,
  });
  const [jobId, setJobId] = useState(null);
  const [buttons, setButtons] = useState([{ text: "", url: "", callback: "" }]);
  const [buttonType, setButtonType] = useState("url"); // url or callback

  // Get current stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["broadcast-stats"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/broadcast/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    refetchInterval: jobId ? 2000 : false, // Auto-refresh if job is active
  });

  // Send broadcast mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");

      // Prepare inline keyboard if buttons exist
      const validButtons = buttons.filter(
        (btn) => btn.text.trim() && (btn.url.trim() || btn.callback.trim())
      );
      const reply_markup =
        validButtons.length > 0
          ? {
              inline_keyboard: validButtons.map((btn) => [
                btn.url.trim()
                  ? { text: btn.text, url: btn.url }
                  : { text: btn.text, callback_data: btn.callback },
              ]),
            }
          : undefined;

      const response = await axios.post(
        `${API_URL}/broadcast/send`,
        {
          message,
          filters: {
            language: filters.language || undefined,
            hasJoinedChannel: filters.hasJoinedChannel,
          },
          options: {
            parse_mode: "HTML",
            reply_markup,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setJobId(data.result.jobId);
      alert(`Xabar yuborish boshlandi! ${data.result.total} ta foydalanuvchi`);
    },
    onError: (error) => {
      alert("Xatolik: " + (error.response?.data?.error || error.message));
    },
  });

  const addButton = () => {
    if (buttons.length < 5) {
      setButtons([...buttons, { text: "", url: "", callback: "" }]);
    }
  };

  const removeButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index, field, value) => {
    const newButtons = [...buttons];
    newButtons[index][field] = value;
    setButtons(newButtons);
  };

  const handleSend = () => {
    if (!message.trim()) {
      alert("Xabar matnini kiriting!");
      return;
    }

    if (
      !confirm(
        `Xabarni yuborishni tasdiqlaysizmi?\n\nFilter: ${
          filters.language || "Barchasi"
        }`
      )
    ) {
      return;
    }

    sendMutation.mutate();
  };

  const stats = statsData?.stats;
  const estimate = statsData?.estimate;

  return (
    <div className="broadcast-page">
      <div className="page-header">
        <h1>
          <Radio size={32} />
          Ommaviy Xabar Yuborish
        </h1>
        <p>Barcha yoki filtrlangan foydalanuvchilarga xabar yuboring</p>
      </div>

      {/* Message Form */}
      <div className="card">
        <div className="setting-header">
          <Send size={24} />
          <div>
            <h3>Xabar matni</h3>
            <p>HTML formatda xabar yozing</p>
          </div>
        </div>

        <div className="form-group">
          <label>Xabar</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Assalomu alaykum! Yangi xususiyat..."
            rows="8"
            disabled={stats?.isProcessing}
          />
          <small className="help-text">
            💡 HTML taglar: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;,
            &lt;code&gt;code&lt;/code&gt;, &lt;a href="..."&gt;link&lt;/a&gt;
          </small>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <h4>Filtrlar</h4>
          <div className="filters-grid">
            <div className="form-group">
              <label>Til</label>
              <select
                value={filters.language}
                onChange={(e) =>
                  setFilters({ ...filters, language: e.target.value })
                }
                disabled={stats?.isProcessing}
              >
                <option value="">Barchasi</option>
                <option value="uz">O'zbek (Lotin)</option>
                <option value="cr">Ўзбек (Кирилл)</option>
                <option value="ru">Русский</option>
              </select>
            </div>

            <div className="form-group">
              <label>Kanal a'zoligi</label>
              <select
                value={filters.hasJoinedChannel ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    hasJoinedChannel:
                      e.target.value === ""
                        ? undefined
                        : e.target.value === "true",
                  })
                }
                disabled={stats?.isProcessing}
              >
                <option value="">Barchasi</option>
                <option value="true">Faqat a'zolar</option>
                <option value="false">A'zo bo'lmaganlar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inline Buttons */}
        <div className="buttons-section">
          <div className="section-header">
            <LinkIcon size={20} />
            <h4>Inline tugmalar (ixtiyoriy)</h4>
          </div>
          
          <div className="button-type-selector" style={{ marginBottom: "15px" }}>
            <label style={{ marginRight: "20px" }}>
              <input
                type="radio"
                value="url"
                checked={buttonType === "url"}
                onChange={(e) => setButtonType(e.target.value)}
              />
              {" "}URL tugmalar (tashqi link)
            </label>
            <label>
              <input
                type="radio"
                value="callback"
                checked={buttonType === "callback"}
                onChange={(e) => setButtonType(e.target.value)}
              />
              {" "}Callback tugmalar (bot amallar)
            </label>
          </div>

          {buttonType === "callback" && (
            <div className="preset-buttons" style={{ marginBottom: "15px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-preset"
                style={{ background: "#e3f2fd", border: "1px solid #2196f3", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                onClick={() => setButtons([{ text: "📍 Joylashuvni tanlash", url: "", callback: "enter_location_scene" }])}
              >
                📍 Joylashuv
              </button>
              <button
                type="button"
                className="btn-preset"
                style={{ background: "#e8f5e9", border: "1px solid #4caf50", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                onClick={() => setButtons([{ text: "🔔 Eslatmalarni yoqish", url: "", callback: "enable_reminders_from_broadcast" }])}
              >
                🔔 Eslatmalar
              </button>
              <button
                type="button"
                className="btn-preset"
                style={{ background: "#fff3e0", border: "1px solid #ff9800", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                onClick={() => setButtons([{ text: "📅 Bugungi vaqtlar", url: "", callback: "today_times" }])}
              >
                📅 Bugungi
              </button>
              <button
                type="button"
                className="btn-preset"
                style={{ background: "#fce4ec", border: "1px solid #e91e63", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                onClick={() => setButtons([
                  { text: "📍 Joylashuvni tanlash", url: "", callback: "enter_location_scene" },
                  { text: "🔔 Eslatmalarni yoqish", url: "", callback: "enable_reminders_from_broadcast" }
                ])}
              >
                📍+🔔 Ikkalasi
              </button>
            </div>
          )}

          {buttons.map((button, index) => (
            <div key={index} className="button-row">
              <input
                type="text"
                placeholder="Tugma matni"
                value={button.text}
                onChange={(e) => updateButton(index, "text", e.target.value)}
                disabled={stats?.isProcessing}
                style={{ flex: 2 }}
              />
              {buttonType === "url" ? (
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={button.url}
                  onChange={(e) => updateButton(index, "url", e.target.value)}
                  disabled={stats?.isProcessing}
                  style={{ flex: 3 }}
                />
              ) : (
                <input
                  type="text"
                  placeholder="callback_data (masalan: enter_location_scene)"
                  value={button.callback}
                  onChange={(e) => updateButton(index, "callback", e.target.value)}
                  disabled={stats?.isProcessing}
                  style={{ flex: 3 }}
                />
              )}
              {buttons.length > 1 && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeButton(index)}
                  disabled={stats?.isProcessing}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {buttons.length < 5 && (
            <button
              type="button"
              className="btn-add-button"
              onClick={addButton}
              disabled={stats?.isProcessing}
            >
              + Tugma qo'shish
            </button>
          )}
        </div>

        <button
          className="btn-primary btn-send"
          onClick={handleSend}
          disabled={sendMutation.isLoading || stats?.isProcessing}
        >
          <Send size={18} />
          {sendMutation.isLoading
            ? "Yuklanmoqda..."
            : stats?.isProcessing
              ? "Yuborilmoqda..."
              : "Yuborish"}
        </button>
      </div>

      {/* Stats */}
      {stats && (stats.isProcessing || stats.sent > 0) && (
        <div className="card stats-card">
          <div className="setting-header">
            <Users size={24} />
            <div>
              <h3>Yuborish holati</h3>
              <p>Real vaqt statistikasi</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <Users size={32} className="stat-icon" />
              <div className="stat-info">
                <span className="stat-label">Jami</span>
                <span className="stat-value">{stats.total}</span>
              </div>
            </div>

            <div className="stat-box success">
              <CheckCircle size={32} className="stat-icon" />
              <div className="stat-info">
                <span className="stat-label">Yuborildi</span>
                <span className="stat-value">{stats.sent}</span>
              </div>
            </div>

            <div className="stat-box danger">
              <XCircle size={32} className="stat-icon" />
              <div className="stat-info">
                <span className="stat-label">Xatolik</span>
                <span className="stat-value">{stats.failed}</span>
              </div>
            </div>

            <div className="stat-box warning">
              <Clock size={32} className="stat-icon" />
              <div className="stat-info">
                <span className="stat-label">Navbatda</span>
                <span className="stat-value">{stats.queueLength}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span>Jarayon</span>
              <span>
                {stats.sent} / {stats.total} (
                {((stats.sent / stats.total) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(stats.sent / stats.total) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Estimate */}
          {estimate && stats.isProcessing && (
            <div className="estimate-section">
              <div className="estimate-item">
                <Clock size={18} />
                <span>
                  Qolgan vaqt: ~{estimate.estimatedMinutes} daqiqa (
                  {estimate.estimatedSeconds}s)
                </span>
              </div>
              <div className="estimate-item">
                <Send size={18} />
                <span>Tezlik: {estimate.currentRate} xabar/soniya</span>
              </div>
              <div className="estimate-item">
                <Users size={18} />
                <span>Qolgan: {estimate.remaining} ta</span>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="status-indicator">
            {stats.isProcessing ? (
              <>
                <Loader size={20} className="spin" />
                <span className="status-text processing">Yuborilmoqda...</span>
              </>
            ) : (
              <>
                <CheckCircle size={20} className="status-icon-success" />
                <span className="status-text success">Yakunlandi</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="info-card">
        <h4>⚡ Telegram Rate Limits:</h4>
        <ul>
          <li>
            <strong>25 xabar/soniya:</strong> Xavfsiz tezlik
          </li>
          <li>
            <strong>1200 xabar/daqiqa:</strong> Maksimal tezlik
          </li>
          <li>
            <strong>50K foydalanuvchi:</strong> ~35 daqiqa
          </li>
          <li>
            <strong>100K foydalanuvchi:</strong> ~70 daqiqa
          </li>
          <li>
            <strong>Background process:</strong> Brauzer yopilganda ham ishlaydi
          </li>
          <li>
            <strong>Auto-retry:</strong> Xatolik bo'lsa 3 marta qayta urinadi
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Broadcast;
