import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../api";
import { TestTube2, CheckCircle, XCircle, Loader } from "lucide-react";
import "./Test.css";

function Test() {
  const [results, setResults] = useState({});

  const runTest = async (testName, endpoint) => {
    try {
      setResults((prev) => ({ ...prev, [testName]: { loading: true } }));

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/test/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
    },
    {
      name: "database",
      title: "Database",
      description: "MongoDB bilan bog'lanishni tekshirish",
      endpoint: "database",
    },
    {
      name: "testMessage",
      title: "Test Message",
      description: "Admin ID ga test xabar yuborish",
      endpoint: "send-test-message",
    },
    {
      name: "logChannel",
      title: "Log Channel",
      description: "Log kanaliga test xabar yuborish",
      endpoint: "log-channel",
    },
    {
      name: "greetingChannel",
      title: "Greeting Channel",
      description: "Greeting kanaliga test xabar yuborish",
      endpoint: "greeting-channel",
    },
    {
      name: "translations",
      title: "Translations",
      description: "Tarjima tizimini tekshirish",
      endpoint: "translations",
    },
    {
      name: "backup",
      title: "Backup",
      description: "MongoDB backup yaratish (background)",
      endpoint: "backup",
    },
  ];

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.name, test.endpoint);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay between tests
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
          <p>Tizim komponentlarini tekshirish</p>
        </div>
        <button className="btn-primary" onClick={runAllTests}>
          🚀 Barchasini Test Qilish
        </button>
      </div>

      <div className="tests-grid">
        {tests.map((test) => {
          const result = results[test.name];

          return (
            <div key={test.name} className="test-card">
              <div className="test-header">
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
