import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settings } from "../api";
import { Save, Info, Eye, EyeOff, Key } from "lucide-react";
import "./BotInfo.css";

function BotInfo() {
  const [aboutTextUz, setAboutTextUz] = useState("");
  const [aboutTextCr, setAboutTextCr] = useState("");
  const [aboutTextRu, setAboutTextRu] = useState("");
  const [ramadanDate, setRamadanDate] = useState("");
  const [greetingChannelId, setGreetingChannelId] = useState("");
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await settings.getAll();
      return response.data.settings;
    },
  });

  useEffect(() => {
    if (data) {
      const aboutBot = data?.find((s) => s.key === "about_bot_text");
      const ramadan = data?.find((s) => s.key === "ramadan_start_date");
      const greetingChannel = data?.find((s) => s.key === "greeting_channel");

      if (aboutBot?.value) {
        setAboutTextUz(aboutBot.value.uz || "");
        setAboutTextCr(aboutBot.value.cr || "");
        setAboutTextRu(aboutBot.value.ru || "");
      }
      if (ramadan?.value) {
        setRamadanDate(ramadan.value);
      }
      if (greetingChannel?.value) {
        setGreetingChannelId(greetingChannel.value);
      }
    }
  }, [data]);

  const aboutMutation = useMutation({
    mutationFn: () =>
      settings.setAboutBot({
        uz: aboutTextUz,
        cr: aboutTextCr,
        ru: aboutTextRu,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Bot haqida matni saqlandi!");
    },
  });

  const ramadanMutation = useMutation({
    mutationFn: () => settings.setRamadanDate(ramadanDate),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Ramazon sanasi saqlandi!");
    },
  });

  const greetingChannelMutation = useMutation({
    mutationFn: () => settings.setGreetingChannel(greetingChannelId),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Tabrik kanali saqlandi!");
    },
  });

  const botTokenMutation = useMutation({
    mutationFn: () => settings.setBotToken(botToken),
    onSuccess: (response) => {
      const message = response.data.autoRestarted
        ? "Bot token yangilandi! ✅ Bot avtomatik qayta ishga tushirildi."
        : "Bot token yangilandi! ⚠️ Botni qo'lda qayta ishga tushiring: pm2 restart ramazonbot-api";
      alert(message);
      setBotToken("");
      setShowToken(false);
    },
    onError: (error) => {
      alert(
        error.response?.data?.error || "Xatolik yuz berdi. Token tekshiring!"
      );
    },
  });

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="bot-info-page">
      <div className="page-header">
        <h1>
          <Info size={32} />
          Bot Ma'lumotlari
        </h1>
        <p>Bot haqida va Ramazon sanasi sozlamalari</p>
      </div>

      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <Info size={24} />
            <div>
              <h3>Bot Haqida Matni</h3>
              <p>
                Foydalanuvchilarga ko'rsatiladigan bot haqida ma'lumot (har bir
                til uchun)
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>O'zbek tilida (Lotin)</label>
            <textarea
              value={aboutTextUz}
              onChange={(e) => setAboutTextUz(e.target.value)}
              placeholder="Bot haqida ma'lumot (uz)"
              rows="5"
            />
          </div>

          <div className="form-group">
            <label>Ўзбек тилида (Кирилл)</label>
            <textarea
              value={aboutTextCr}
              onChange={(e) => setAboutTextCr(e.target.value)}
              placeholder="Бот ҳақида маълумот (cr)"
              rows="5"
            />
          </div>

          <div className="form-group">
            <label>Русский язык</label>
            <textarea
              value={aboutTextRu}
              onChange={(e) => setAboutTextRu(e.target.value)}
              placeholder="Информация о боте (ru)"
              rows="5"
            />
          </div>

          <button
            className="btn-primary"
            onClick={() => aboutMutation.mutate()}
            disabled={aboutMutation.isLoading}
          >
            <Save size={18} />
            {aboutMutation.isLoading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <Info size={24} />
            <div>
              <h3>Ramazon Boshlanish Sanasi</h3>
              <p>Ramazongacha ortiq vaqtni hisoblash uchun sana</p>
            </div>
          </div>

          <div className="form-group">
            <label>Sana (YYYY-MM-DD format)</label>
            <input
              type="date"
              value={ramadanDate}
              onChange={(e) => setRamadanDate(e.target.value)}
              placeholder="2026-02-17"
            />
          </div>

          <button
            className="btn-primary"
            onClick={() => ramadanMutation.mutate()}
            disabled={ramadanMutation.isLoading}
          >
            <Save size={18} />
            {ramadanMutation.isLoading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <Info size={24} />
            <div>
              <h3>Tabrik Kanali</h3>
              <p>
                Tabriklar yuboriladigan kanal ID (botni kanalga admin qilishni
                unutmang)
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Kanal ID</label>
            <input
              type="text"
              value={greetingChannelId}
              onChange={(e) => setGreetingChannelId(e.target.value)}
              placeholder="-1001234567890"
            />
            <small>
              Kanal ID ni @userinfobot orqali olishingiz mumkin. Majburiy
              ravishda -100 bilan boshlanishi kerak va bot kanal adminligida
              bo'lishi kerak.
            </small>
          </div>

          <button
            className="btn-primary"
            onClick={() => greetingChannelMutation.mutate()}
            disabled={greetingChannelMutation.isLoading}
          >
            <Save size={18} />
            {greetingChannelMutation.isLoading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <Key size={24} />
            <div>
              <h3>Bot Token (⚠️ Superadmin)</h3>
              <p>
                Telegram bot tokenini yangilash. DIQQAT: Token o'zgargandan
                keyin botni qayta ishga tushirish kerak!
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Bot Token</label>
            <div style={{ position: "relative" }}>
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
              <button
                className="btn-icon"
                onClick={() => setShowToken(!showToken)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <small>
              Format: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz. Token @BotFather
              dan olinadi. Token o'zgargandan keyin PM2 orqali botni restart
              qiling: <code>pm2 restart ramazonbot-api</code>
            </small>
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              if (
                confirm(
                  "Bot tokenini o'zgartirishga ishonchingiz komilmi? Botni qayta ishga tushirish kerak bo'ladi!"
                )
              ) {
                botTokenMutation.mutate();
              }
            }}
            disabled={botTokenMutation.isLoading || !botToken}
            style={{ background: "#dc3545" }}
          >
            <Save size={18} />
            {botTokenMutation.isLoading ? "Saqlanmoqda..." : "Tokenni Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BotInfo;
