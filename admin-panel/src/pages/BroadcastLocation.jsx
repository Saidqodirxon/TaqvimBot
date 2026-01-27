import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settings, API_URL } from "../api";
import {
  Save,
  MapPin,
  Send,
  RefreshCw,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import "./BroadcastLocation.css";

function BroadcastLocation() {
  const [messageUz, setMessageUz] = useState("");
  const [messageRu, setMessageRu] = useState("");
  const [messageCr, setMessageCr] = useState("");
  const [restartButtonText, setRestartButtonText] = useState("");
  const [reminderBtnUz, setReminderBtnUz] = useState("");
  const [reminderBtnRu, setReminderBtnRu] = useState("");
  const [reminderBtnCr, setReminderBtnCr] = useState("");
  const [showLocationBtn, setShowLocationBtn] = useState(true);
  const [showReminderBtn, setShowReminderBtn] = useState(true);
  const [showRestartBtn, setShowRestartBtn] = useState(true);
  const [activeTab, setActiveTab] = useState("uz");
  const [estimatedUsers, setEstimatedUsers] = useState(0);

  const queryClient = useQueryClient();

  // Get broadcast settings
  const { data, isLoading } = useQuery({
    queryKey: ["broadcast-settings"],
    queryFn: async () => {
      const response = await settings.getAll();
      return response.data.settings;
    },
  });

  // Get users count without location
  const { data: statsData } = useQuery({
    queryKey: ["users-without-location"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/stats/users-without-location`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
  });

  useEffect(() => {
    if (data) {
      const msgUz = data?.find(
        (s) => s.key === "broadcast_location_message_uz"
      );
      const msgRu = data?.find(
        (s) => s.key === "broadcast_location_message_ru"
      );
      const msgCr = data?.find(
        (s) => s.key === "broadcast_location_message_cr"
      );
      const restartBtn = data?.find(
        (s) => s.key === "broadcast_restart_button_text"
      );
      const remBtnUz = data?.find(
        (s) => s.key === "broadcast_reminder_button_text_uz"
      );
      const remBtnRu = data?.find(
        (s) => s.key === "broadcast_reminder_button_text_ru"
      );
      const remBtnCr = data?.find(
        (s) => s.key === "broadcast_reminder_button_text_cr"
      );
      const showLocBtn = data?.find(
        (s) => s.key === "broadcast_show_location_button"
      );
      const showRemBtn = data?.find(
        (s) => s.key === "broadcast_show_reminder_button"
      );
      const showResBtn = data?.find(
        (s) => s.key === "broadcast_show_restart_button"
      );

      if (msgUz) setMessageUz(msgUz.value);
      if (msgRu) setMessageRu(msgRu.value);
      if (msgCr) setMessageCr(msgCr.value);
      if (restartBtn) setRestartButtonText(restartBtn.value);
      if (remBtnUz) setReminderBtnUz(remBtnUz.value);
      if (remBtnRu) setReminderBtnRu(remBtnRu.value);
      if (remBtnCr) setReminderBtnCr(remBtnCr.value);
      if (showLocBtn !== undefined) setShowLocationBtn(showLocBtn.value);
      if (showRemBtn !== undefined) setShowReminderBtn(showRemBtn.value);
      if (showResBtn !== undefined) setShowRestartBtn(showResBtn.value);
    }
  }, [data]);

  useEffect(() => {
    if (statsData?.count) {
      setEstimatedUsers(statsData.count);
    }
  }, [statsData]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        settings.update("broadcast_location_message_uz", messageUz),
        settings.update("broadcast_location_message_ru", messageRu),
        settings.update("broadcast_location_message_cr", messageCr),
        settings.update("broadcast_restart_button_text", restartButtonText),
        settings.update("broadcast_reminder_button_text_uz", reminderBtnUz),
        settings.update("broadcast_reminder_button_text_ru", reminderBtnRu),
        settings.update("broadcast_reminder_button_text_cr", reminderBtnCr),
        settings.update("broadcast_show_location_button", showLocationBtn),
        settings.update("broadcast_show_reminder_button", showReminderBtn),
        settings.update("broadcast_show_restart_button", showRestartBtn),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["broadcast-settings"]);
      alert("✅ Sozlamalar saqlandi!");
    },
    onError: (error) => {
      alert("❌ Xatolik: " + (error.response?.data?.error || error.message));
    },
  });

  const handleSave = () => {
    if (!messageUz.trim() || !messageRu.trim() || !messageCr.trim()) {
      alert("Barcha tillardagi xabarlarni to'ldiring!");
      return;
    }

    if (!restartButtonText.trim()) {
      alert("Qayta ishga tushirish tugmasi matnini kiriting!");
      return;
    }

    saveMutation.mutate();
  };

  // Calculate estimated time
  const estimatedMinutes = Math.ceil((estimatedUsers * 40) / 1000 / 60); // 40ms per message
  const estimatedTimeText =
    estimatedMinutes < 60
      ? `~${estimatedMinutes} daqiqa`
      : `~${Math.floor(estimatedMinutes / 60)} soat ${estimatedMinutes % 60} daqiqa`;

  // Test broadcast mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const lang = "uz"; // or get from user's preferred language
      const message =
        activeTab === "uz"
          ? messageUz
          : activeTab === "ru"
            ? messageRu
            : messageCr;

      const response = await fetch(`${API_URL}/broadcast/send-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Xatolik yuz berdi");
      }

      return response.json();
    },
    onSuccess: () => {
      alert("✅ Test xabar sizga yuborildi! Telegram botni tekshiring.");
    },
    onError: (error) => {
      alert("❌ Xatolik: " + error.message);
    },
  });

  const handleTest = () => {
    const currentMessage =
      activeTab === "uz"
        ? messageUz
        : activeTab === "ru"
          ? messageRu
          : messageCr;

    if (!currentMessage.trim()) {
      alert("Avval xabar matnini to'ldiring!");
      return;
    }

    if (
      !confirm(
        "Test xabar sizga yuboriladi. Telegram botingizni tekshirishga tayyor misiz?"
      )
    ) {
      return;
    }

    testMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="broadcast-location-page">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="broadcast-location-page">
      <div className="page-header">
        <h1>
          <MapPin size={32} />
          Joylashuv So'rovi - Broadcast
        </h1>
        <p>
          64K foydalanuvchiga joylashuv tanlash so'rovini yuboring (3 tilda)
        </p>
      </div>

      {/* Stats Card */}
      <div className="card stats-summary">
        <div className="stat-row">
          <div className="stat-item">
            <Users size={24} />
            <div>
              <div className="stat-value">
                {estimatedUsers.toLocaleString()}
              </div>
              <div className="stat-label">Joylashuvni tanlamagan</div>
            </div>
          </div>

          <div className="stat-item">
            <Clock size={24} />
            <div>
              <div className="stat-value">{estimatedTimeText}</div>
              <div className="stat-label">Taxminiy vaqt</div>
            </div>
          </div>

          <div className="stat-item">
            <Send size={24} />
            <div>
              <div className="stat-value">25 xabar/s</div>
              <div className="stat-label">Xavfsiz tezlik</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Editor */}
      <div className="card">
        <div className="setting-header">
          <Send size={24} />
          <div>
            <h3>Xabar matni</h3>
            <p>Har bir til uchun xabar tahrirlanishi mumkin</p>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="language-tabs">
          <button
            className={`tab ${activeTab === "uz" ? "active" : ""}`}
            onClick={() => setActiveTab("uz")}
          >
            🇺🇿 O'zbek (Lotin)
          </button>
          <button
            className={`tab ${activeTab === "ru" ? "active" : ""}`}
            onClick={() => setActiveTab("ru")}
          >
            🇷🇺 Русский
          </button>
          <button
            className={`tab ${activeTab === "cr" ? "active" : ""}`}
            onClick={() => setActiveTab("cr")}
          >
            🇺🇿 Ўзбек (Кирилл)
          </button>
        </div>

        {/* Uzbek Latin */}
        {activeTab === "uz" && (
          <div className="form-group">
            <label>Xabar matni (O'zbek Lotin)</label>
            <textarea
              value={messageUz}
              onChange={(e) => setMessageUz(e.target.value)}
              placeholder="Xabar matnini kiriting..."
              rows="12"
            />
            <small className="help-text">
              💡 HTML taglar: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;
            </small>
          </div>
        )}

        {/* Russian */}
        {activeTab === "ru" && (
          <div className="form-group">
            <label>Текст сообщения (Русский)</label>
            <textarea
              value={messageRu}
              onChange={(e) => setMessageRu(e.target.value)}
              placeholder="Введите текст сообщения..."
              rows="12"
            />
            <small className="help-text">
              💡 HTML теги: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;
            </small>
          </div>
        )}

        {/* Uzbek Cyrillic */}
        {activeTab === "cr" && (
          <div className="form-group">
            <label>Хабар матни (Ўзбек Кирилл)</label>
            <textarea
              value={messageCr}
              onChange={(e) => setMessageCr(e.target.value)}
              placeholder="Хабар матнини киритинг..."
              rows="12"
            />
            <small className="help-text">
              💡 HTML теглар: &lt;b&gt;қалин&lt;/b&gt;,
              &lt;i&gt;курсив&lt;/i&gt;
            </small>
          </div>
        )}

        {/* Restart Button Text */}
        <div className="form-group">
          <label>Qayta ishga tushirish tugmasi matni</label>
          <input
            type="text"
            value={restartButtonText}
            onChange={(e) => setRestartButtonText(e.target.value)}
            placeholder="🔄 Botni qayta ishga tushirish"
          />
          <small className="help-text">
            Bu tugma joylashuv tanlash tugmasidan alohida ko'rsatiladi
          </small>
        </div>

        {/* Reminder Button Texts */}
        <div className="form-group">
          <label>🔔 Eslatma tugmasi matni (O'zbek)</label>
          <input
            type="text"
            value={reminderBtnUz}
            onChange={(e) => setReminderBtnUz(e.target.value)}
            placeholder="🔔 Eslatmalarni yoqish"
          />
        </div>

        <div className="form-group">
          <label>🔔 Текст кнопки напоминания (Русский)</label>
          <input
            type="text"
            value={reminderBtnRu}
            onChange={(e) => setReminderBtnRu(e.target.value)}
            placeholder="🔔 Включить напоминания"
          />
        </div>

        <div className="form-group">
          <label>🔔 Эслатма тугмаси матни (Кирилл)</label>
          <input
            type="text"
            value={reminderBtnCr}
            onChange={(e) => setReminderBtnCr(e.target.value)}
            placeholder="🔔 Эслатмаларни ёқиш"
          />
          <small className="help-text">
            Bu tugma namoz vaqtlarini ko'rganda eslatmani yoqish uchun
          </small>
        </div>

        {/* Button Visibility Controls */}
        <div className="form-group">
          <label
            style={{
              fontSize: "1.1rem",
              fontWeight: "bold",
              marginBottom: "1rem",
              display: "block",
            }}
          >
            📋 Tugmalarni boshqarish
          </label>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              padding: "1rem",
              background: "#f7fafc",
              borderRadius: "8px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showLocationBtn}
                onChange={(e) => setShowLocationBtn(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span>📍 Joylashuvni tanlash tugmasini ko'rsatish</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showReminderBtn}
                onChange={(e) => setShowReminderBtn(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span>🔔 Eslatma tugmasini ko'rsatish</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showRestartBtn}
                onChange={(e) => setShowRestartBtn(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span>🔄 Qayta ishga tushirish tugmasini ko'rsatish</span>
            </label>
          </div>

          <small className="help-text">
            Belgilangan tugmalar broadcast xabarida ko'rsatiladi
          </small>
        </div>

        {/* Save Button */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saveMutation.isLoading}
        >
          <Save size={18} />
          {saveMutation.isLoading ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>

      {/* Broadcast Action Card */}
      <div className="card broadcast-action">
        <div className="setting-header">
          <AlertCircle size={24} className="warning-icon" />
          <div>
            <h3>Broadcast Yuborish</h3>
            <p className="warning-text">
              ⚠️ Diqqat! Bu amal {estimatedUsers.toLocaleString()} ta
              foydalanuvchiga xabar yuboradi
            </p>
          </div>
        </div>

        <div className="broadcast-info">
          <h4>Yuborishdan oldin:</h4>
          <ul>
            <li>
              <CheckCircle size={16} /> Barcha xabarlar tahrirlandi va saqlandi
            </li>
            <li>
              <CheckCircle size={16} /> Xabarlar to'g'riligini tekshiring (3
              tilda)
            </li>
            <li>
              <Clock size={16} /> Taxminiy vaqt: {estimatedTimeText}
            </li>
            <li>
              <RefreshCw size={16} /> Broadcast background rejimda ishlaydi
            </li>
            <li>
              <XCircle size={16} /> Blok qilgan foydalanuvchilar isActive=false
              bo'ladi
            </li>
          </ul>
        </div>

        <div className="broadcast-actions">
          <button
            className="btn-secondary"
            onClick={handleTest}
            disabled={testMutation.isLoading}
          >
            <Send size={18} />
            {testMutation.isLoading ? "Yuborilmoqda..." : "Test yuborish (Admin)"}
          </button>

          <button className="btn-primary btn-broadcast" disabled>
            <Send size={18} />
            Broadcast Yuborish ({estimatedUsers.toLocaleString()} ta)
          </button>
        </div>

        <small className="help-text">
          💡 Broadcast funksiyasi hozircha ishlab chiqilmoqda. Terminal orqali
          ishga tushiring: <code>node broadcast-location-professional.js</code>
        </small>
      </div>

      {/* Info Card */}
      <div className="info-card">
        <h4>📋 Texnik Ma'lumotlar:</h4>
        <ul>
          <li>
            <strong>Rate Limiting:</strong> 25 xabar/soniya (Telegram limitlar
            ichida)
          </li>
          <li>
            <strong>Batch Processing:</strong> 25 xabar/batch, 1 soniya kutish
          </li>
          <li>
            <strong>Auto-deactivate:</strong> Blok qilgan userlar isActive=false
            bo'ladi
          </li>
          <li>
            <strong>Resume Capability:</strong> To'xtab qolsa qayerdan
            to'xtaganidan davom etadi
          </li>
          <li>
            <strong>Progress Tracking:</strong> Real-time progress logs
          </li>
          <li>
            <strong>3 Languages:</strong> O'zbek, Русский, Ўзбек (har bir user
            o'z tilida)
          </li>
        </ul>

        <div className="command-box">
          <h5>Terminal buyrug'i:</h5>
          <code>cd api && node broadcast-location-professional.js</code>
          <p className="help-text">
            Background rejimda:{" "}
            <code>pm2 start broadcast-location-professional.js</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default BroadcastLocation;
