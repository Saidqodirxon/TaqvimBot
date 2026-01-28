import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../api";
import {
  TestTube2,
  CheckCircle,
  XCircle,
  Loader,
  Send,
  Bell,
  MapPin,
  Calendar,
  MessageSquare,
  Database,
  AlertTriangle,
} from "lucide-react";
import "./Test.css";

function Test() {
  const [results, setResults] = useState({});
  const [testMessage, setTestMessage] = useState(
    "🧪 Test xabari - Admin paneldan yuborildi"
  );

  const runTest = async (testName, endpoint, body = {}) => {
    try {
      setResults((prev) => ({ ...prev, [testName]: { loading: true } }));

      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/test/${endpoint}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setResults((prev) => ({
        ...prev,
        [testName]: {
          loading: false,
          success: true,
          data: response.data,
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [testName]: {
          loading: false,
          success: false,
          error: error.response?.data?.error || error.message,
        },
      }));
    }
  };

  const tests = [
    {
      name: "bot",
      title: "Bot Connection",
      description: "Telegram bot bilan bog'lanishni tekshirish",
      endpoint: "bot-connection",
      icon: <TestTube2 size={20} />,
    },
    {
      name: "database",
      title: "Database",
      description: "MongoDB bilan bog'lanishni tekshirish",
      endpoint: "database",
      icon: <TestTube2 size={20} />,
    },
    {
      name: "testMessage",
      title: "Test Message",
      description: "Admin ID ga test xabar yuborish",
      endpoint: "send-test-message",
      icon: <Send size={20} />,
    },
    {
      name: "testMessageWithButtons",
      title: "Tugmali Test Xabar",
      description: "Inline tugmali test xabar yuborish",
      endpoint: "send-test-message-buttons",
      icon: <MessageSquare size={20} />,
    },
    {
      name: "logChannel",
      title: "Log Channel",
      description: "Log kanaliga test xabar yuborish",
      endpoint: "log-channel",
      icon: <Send size={20} />,
    },
    {
      name: "greetingChannel",
      title: "Greeting Channel",
      description: "Greeting kanaliga test xabar yuborish",
      endpoint: "greeting-channel",
      icon: <Send size={20} />,
    },
    {
      name: "translations",
      title: "Translations",
      description: "Tarjima tizimini tekshirish",
      endpoint: "translations",
      icon: <TestTube2 size={20} />,
    },
    {
      name: "prayerTimes",
      title: "Prayer Times API",
      description: "Namoz vaqtlari APIni tekshirish",
      endpoint: "prayer-times",
      icon: <Calendar size={20} />,
    },
    {
      name: "locations",
      title: "Locations",
      description: "Joylashuvlar bazasini tekshirish",
      endpoint: "locations",
      icon: <MapPin size={20} />,
    },
    {
      name: "reminders",
      title: "Reminders System",
      description: "Eslatma tizimini tekshirish",
      endpoint: "reminders",
      icon: <Bell size={20} />,
    },
    {
      name: "prayerDataCheck",
      title: "📊 Ma'lumotlar To'liqligi",
      description: "Namoz vaqtlari ma'lumotlarini tekshirish va alert yuborish",
      endpoint: "prayer-data-check",
      icon: <AlertTriangle size={20} />,
    },
    {
      name: "backup",
      title: "Backup",
      description: "MongoDB backup yaratish (background)",
      endpoint: "backup",
      icon: <Database size={20} />,
    },
  ];

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.name, test.endpoint);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="test-page">
      <div className="page-header">
        <div>
          <h1>
            <TestTube2 size={32} />
            Test Tugmalari
          </h1>
          <p>
            Tizim komponentlarini tekshirish - faqat admin va log kanalga
            yuboriladi
          </p>
        </div>
        <button className="btn-primary" onClick={runAllTests}>
          🚀 Barchasini Test Qilish
        </button>
      </div>

      {/* Custom test message input */}
      <div
        className="custom-test-section"
        style={{
          marginBottom: "20px",
          padding: "20px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginBottom: "15px" }}>📝 Maxsus Test Xabari</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Test xabarini kiriting..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "2px solid #e1e8ed",
            }}
          />
          <button
            className="btn-primary"
            onClick={() =>
              runTest("customMessage", "send-custom-message", {
                message: testMessage,
              })
            }
            disabled={results.customMessage?.loading}
          >
            {results.customMessage?.loading ? "⏳..." : "📤 Yuborish"}
          </button>
        </div>
        {results.customMessage && !results.customMessage.loading && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              background: results.customMessage.success ? "#d4edda" : "#f8d7da",
              borderRadius: "6px",
            }}
          >
            {results.customMessage.success
              ? `✅ ${results.customMessage.data?.message || "Yuborildi"}`
              : `❌ ${results.customMessage.error}`}
          </div>
        )}
      </div>

      <div className="tests-grid">
        {tests.map((test) => {
          const result = results[test.name];

          return (
            <div key={test.name} className="test-card">
              <div className="test-header">
                {test.icon}
                <h3>{test.title}</h3>
                {result?.loading && <Loader className="spinning" size={20} />}
                {result?.success && <CheckCircle size={20} color="#4caf50" />}
                {result?.success === false && (
                  <XCircle size={20} color="#f44336" />
                )}
              </div>

              <p className="test-description">{test.description}</p>

              {result && !result.loading && (
                <div
                  className={`test-result ${result.success ? "success" : "error"}`}
                >
                  {result.success ? (
                    <>
                      <div className="result-message">
                        ✅ {result.data.message}
                      </div>
                      {result.data.bot && (
                        <div className="result-details">
                          <strong>Bot:</strong> @{result.data.bot.username} (ID:{" "}
                          {result.data.bot.id})
                        </div>
                      )}
                      {result.data.database && (
                        <div className="result-details">
                          <strong>Database:</strong> {result.data.database.name}
                          <br />
                          <strong>Users:</strong>{" "}
                          {result.data.database.userCount}
                        </div>
                      )}
                      {result.data.translationCount !== undefined && (
                        <div className="result-details">
                          <strong>Translations:</strong>{" "}
                          {result.data.translationCount}
                        </div>
                      )}
                      {result.data.prayerTimes && (
                        <div className="result-details">
                          <strong>Bomdod:</strong>{" "}
                          {result.data.prayerTimes.fajr}
                          <br />
                          <strong>Peshin:</strong>{" "}
                          {result.data.prayerTimes.dhuhr}
                          <br />
                          <strong>Asr:</strong> {result.data.prayerTimes.asr}
                        </div>
                      )}
                      {result.data.locationsCount !== undefined && (
                        <div className="result-details">
                          <strong>Joylashuvlar:</strong>{" "}
                          {result.data.locationsCount}
                        </div>
                      )}
                      {result.data.reminderUsers !== undefined && (
                        <div className="result-details">
                          <strong>Eslatma foydalanuvchilari:</strong>{" "}
                          {result.data.reminderUsers}
                        </div>
                      )}
                      {result.data.note && (
                        <div className="result-note">ℹ️ {result.data.note}</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="result-message">❌ {result.error}</div>
                    </>
                  )}
                </div>
              )}

              <button
                className="btn-test"
                onClick={() => runTest(test.name, test.endpoint)}
                disabled={result?.loading}
              >
                {result?.loading ? "⏳ Testing..." : "🧪 Test"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Test;
