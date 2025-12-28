import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settings } from "../api";
import { Save, Info } from "lucide-react";
import "./BotInfo.css";

function BotInfo() {
  const [aboutTextUz, setAboutTextUz] = useState("");
  const [aboutTextCr, setAboutTextCr] = useState("");
  const [aboutTextRu, setAboutTextRu] = useState("");
  const [ramadanDate, setRamadanDate] = useState("");

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

      if (aboutBot?.value) {
        setAboutTextUz(aboutBot.value.uz || "");
        setAboutTextCr(aboutBot.value.cr || "");
        setAboutTextRu(aboutBot.value.ru || "");
      }
      if (ramadan?.value) {
        setRamadanDate(ramadan.value);
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
    </div>
  );
}

export default BotInfo;
