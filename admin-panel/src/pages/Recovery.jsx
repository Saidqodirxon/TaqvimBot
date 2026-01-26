import { useState } from "react";
import { api } from "../api";
import "./Recovery.css";

export default function Recovery() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    apiId: "",
    apiHash: "",
    botUsername: "",
    phoneNumber: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(null);
  const [extractionResult, setExtractionResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");

  const handleExtractUsers = async () => {
    if (!config.apiId || !config.apiHash || !config.botUsername) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }

    setIsExtracting(true);
    setError("");
    setStep(2);

    try {
      const response = await api.post("/recovery/extract", config);

      if (response.data.requiresAuth) {
        // Need phone verification
        setStep(2);
      } else {
        // Extraction started
        pollExtractionProgress();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Xatolik yuz berdi");
      setIsExtracting(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode) {
      setError("Verification code ni kiriting");
      return;
    }

    try {
      await api.post("/recovery/verify", { code: verificationCode });
      setStep(3);
      pollExtractionProgress();
    } catch (err) {
      setError(err.response?.data?.message || "Kod noto'g'ri");
    }
  };

  const pollExtractionProgress = () => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get("/recovery/progress");
        setExtractionProgress(response.data);

        if (response.data.status === "completed") {
          clearInterval(interval);
          setIsExtracting(false);
          setExtractionResult(response.data.result);
          setStep(4);
        } else if (response.data.status === "failed") {
          clearInterval(interval);
          setIsExtracting(false);
          setError(response.data.error);
        }
      } catch (err) {
        clearInterval(interval);
        setIsExtracting(false);
        setError("Progress olishda xatolik");
      }
    }, 2000);
  };

  const handleImportUsers = async () => {
    setIsImporting(true);
    setError("");

    try {
      const response = await api.post("/recovery/import");
      setImportResult(response.data);
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.message || "Import xatolik");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(extractionResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovered-users-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="recovery-page">
      <div className="recovery-header">
        <h1>🔄 User Recovery</h1>
        <p>MTProto orqali eski foydalanuvchilarni tiklash</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          {error}
        </div>
      )}

      {/* Step 1: Configuration */}
      {step === 1 && (
        <div className="recovery-card">
          <div className="card-header">
            <h2>📋 1. API Sozlamalari</h2>
            <p>Telegram API credentials ni kiriting</p>
          </div>

          <div className="form-group">
            <label>API ID</label>
            <input
              type="number"
              value={config.apiId}
              onChange={(e) => setConfig({ ...config, apiId: e.target.value })}
              placeholder="12345678"
            />
            <small>https://my.telegram.org/apps dan oling</small>
          </div>

          <div className="form-group">
            <label>API Hash</label>
            <input
              type="text"
              value={config.apiHash}
              onChange={(e) =>
                setConfig({ ...config, apiHash: e.target.value })
              }
              placeholder="abc123def456..."
            />
            <small>https://my.telegram.org/apps dan oling</small>
          </div>

          <div className="form-group">
            <label>Bot Username</label>
            <input
              type="text"
              value={config.botUsername}
              onChange={(e) =>
                setConfig({ ...config, botUsername: e.target.value })
              }
              placeholder="ramazonbot"
            />
            <small>@ belgisiz bot username</small>
          </div>

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleExtractUsers}
              disabled={isExtracting}
            >
              {isExtracting ? "⏳ Yuklanmoqda..." : "🚀 Boshlash"}
            </button>
          </div>

          <div className="info-box">
            <strong>ℹ️ Eslatma:</strong>
            <ul>
              <li>Bu sizning shaxsiy Telegram akkauntingiz orqali ishlaydi</li>
              <li>Telefon raqam va verification code kerak bo'ladi</li>
              <li>Bot bilan suhbatlashgan foydalanuvchilar topiladi</li>
              <li>Jarayon 5-10 daqiqa davom etishi mumkin</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Phone Verification */}
      {step === 2 && (
        <div className="recovery-card">
          <div className="card-header">
            <h2>📱 2. Telefon Tasdiqlash</h2>
            <p>Telegram'dan kelgan kodni kiriting</p>
          </div>

          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="12345"
              maxLength={5}
            />
            <small>Telegram'ga yuborilgan 5 raqamli kod</small>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Orqaga
            </button>
            <button className="btn btn-primary" onClick={handleVerifyPhone}>
              ✓ Tasdiqlash
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Extraction Progress */}
      {step === 3 && isExtracting && (
        <div className="recovery-card">
          <div className="card-header">
            <h2>⚙️ 3. Foydalanuvchilar Yuklanmoqda...</h2>
            <p>Iltimos kuting, bu bir necha daqiqa davom etishi mumkin</p>
          </div>

          {extractionProgress && (
            <div className="progress-stats">
              <div className="stat-item">
                <span className="stat-label">Dialoglar:</span>
                <span className="stat-value">
                  {extractionProgress.dialogsScanned || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Topilgan foydalanuvchilar:</span>
                <span className="stat-value">
                  {extractionProgress.usersFound || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Status:</span>
                <span className="stat-value">
                  {extractionProgress.currentStep || "Loading..."}
                </span>
              </div>
            </div>
          )}

          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      )}

      {/* Step 4: Extraction Results */}
      {step === 4 && extractionResult && (
        <div className="recovery-card">
          <div className="card-header">
            <h2>✅ 4. Natijalar</h2>
            <p>Foydalanuvchilar muvaffaqiyatli yuklandi!</p>
          </div>

          <div className="results-stats">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">
                  {extractionResult.totalUsers?.toLocaleString()}
                </div>
                <div className="stat-label">Jami foydalanuvchilar</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">
                  {extractionResult.activeUsers?.toLocaleString()}
                </div>
                <div className="stat-label">Faol</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏸️</div>
              <div className="stat-content">
                <div className="stat-number">
                  {extractionResult.inactiveUsers?.toLocaleString()}
                </div>
                <div className="stat-label">Nofaol</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📱</div>
              <div className="stat-content">
                <div className="stat-number">
                  {extractionResult.withUsername?.toLocaleString()}
                </div>
                <div className="stat-label">Username bilan</div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={handleDownloadJSON}>
              💾 JSON Yuklab olish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImportUsers}
              disabled={isImporting}
            >
              {isImporting
                ? "⏳ Import qilinmoqda..."
                : "📥 MongoDB ga import qilish"}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Import Results */}
      {step === 5 && importResult && (
        <div className="recovery-card">
          <div className="card-header">
            <h2>🎉 5. Import Tugadi!</h2>
            <p>Foydalanuvchilar muvaffaqiyatli import qilindi</p>
          </div>

          <div className="results-stats">
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">
                  {importResult.newUsers?.toLocaleString()}
                </div>
                <div className="stat-label">Yangi qo'shildi</div>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">ℹ️</div>
              <div className="stat-content">
                <div className="stat-number">
                  {importResult.existingUsers?.toLocaleString()}
                </div>
                <div className="stat-label">Allaqachon mavjud</div>
              </div>
            </div>

            <div className="stat-card primary">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">
                  {importResult.totalInDb?.toLocaleString()}
                </div>
                <div className="stat-label">Jami DB da</div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={() => (window.location.href = "/dashboard")}
            >
              📊 Dashboard ga o'tish
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              🔄 Yana boshlash
            </button>
          </div>

          <div className="success-box">
            <strong>✅ Keyingi qadamlar:</strong>
            <ul>
              <li>Dashboard da foydalanuvchilar sonini tekshiring</li>
              <li>Test broadcast yuboring</li>
              <li>Backup yarating (Settings → Backup)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="recovery-docs">
        <h3>📚 Qo'llanma</h3>

        <div className="doc-section">
          <h4>1. API Credentials qanday olish kerak?</h4>
          <ol>
            <li>
              <a href="https://my.telegram.org/apps" target="_blank">
                https://my.telegram.org/apps
              </a>{" "}
              ga kiring
            </li>
            <li>"API development tools" tugmasini bosing</li>
            <li>Yangi application yarating</li>
            <li>api_id va api_hash ni ko'chiring</li>
          </ol>
        </div>

        <div className="doc-section">
          <h4>2. Qanday ishlaydi?</h4>
          <p>
            MTProto - Telegram'ning asosiy protokoli. Bu orqali sizning shaxsiy
            akkauntingiz dialoglarini ko'rish va bot bilan suhbatlashgan
            foydalanuvchilarni topish mumkin.
          </p>
        </div>

        <div className="doc-section">
          <h4>3. Xavfsizlik</h4>
          <ul>
            <li>API credentials faqat server da saqlanadi</li>
            <li>Session fayllar xavfsiz joyda</li>
            <li>Faqat o'qish ruxsati ishlatiladi</li>
            <li>Hech narsa o'chirilmaydi yoki o'zgartirilmaydi</li>
          </ul>
        </div>

        <div className="doc-section">
          <h4>4. Terminal orqali ishlatish</h4>
          <p>
            Agar admin panelda ishlamasa, terminal orqali ham ishlatishingiz
            mumkin:
          </p>
          <pre>
            {`cd recovery-tools
npm install
cp .env.example .env
# .env ni sozlang
node extract-users-mtproto.js
node import-to-db.js`}
          </pre>
        </div>
      </div>
    </div>
  );
}
