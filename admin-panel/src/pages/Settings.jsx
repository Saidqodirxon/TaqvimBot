import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settings } from "../api";
import { Save, Bell } from "lucide-react";
import "./Settings.css";

function Settings() {
  // Reminder settings state
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [defaultMinutes, setDefaultMinutes] = useState(10);
  const [notifyAtPrayerTime, setNotifyAtPrayerTime] = useState(true);
  const [offerReminders, setOfferReminders] = useState(true);

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
      const reminderSettings = data?.find((s) => s.key === "reminder_settings");

      if (reminderSettings?.value) {
        setReminderEnabled(reminderSettings.value.enabled ?? true);
        setDefaultMinutes(reminderSettings.value.defaultMinutes ?? 10);
        setNotifyAtPrayerTime(
          reminderSettings.value.notifyAtPrayerTime ?? true
        );
        setOfferReminders(reminderSettings.value.offerReminders ?? true);
      }
    }
  }, [data]);

  const reminderMutation = useMutation({
    mutationFn: () =>
      settings.setReminderSettings({
        enabled: reminderEnabled,
        defaultMinutes: parseInt(defaultMinutes),
        notifyAtPrayerTime,
        offerReminders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Eslatma sozlamalari saqlandi!");
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
    <div className="settings-page">
      <div className="page-header">
        <h1>
          <Bell size={32} />
          Eslatma Sozlamalari
        </h1>
        <p>Namoz vaqtlari eslatmalari uchun standart sozlamalar</p>
      </div>

      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <Bell size={24} />
            <div>
              <h3>Namoz Eslatmalari</h3>
              <p>
                Foydalanuvchilar uchun namoz vaqtlari eslatmalarini boshqarish
              </p>
            </div>
          </div>

          <div className="toggle-group">
            <label className="toggle-label">
              <div>
                <strong>Eslatmalar yoqilgan</strong>
                <p className="toggle-desc">
                  Barcha foydalanuvchilar uchun eslatmalarni global
                  yoqish/o'chirish
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </label>
          </div>

          <div className="form-group">
            <label>Standart eslatma vaqti (daqiqalarda)</label>
            <select
              value={defaultMinutes}
              onChange={(e) => setDefaultMinutes(e.target.value)}
            >
              <option value="5">5 daqiqa oldin</option>
              <option value="10">10 daqiqa oldin</option>
              <option value="15">15 daqiqa oldin</option>
              <option value="30">30 daqiqa oldin</option>
            </select>
            <small className="help-text">
              💡 Yangi foydalanuvchilar uchun standart eslatma vaqti
            </small>
          </div>

          <div className="toggle-group">
            <label className="toggle-label">
              <div>
                <strong>Namoz vaqtida eslatma</strong>
                <p className="toggle-desc">
                  Namoz vaqti kirganida ham eslatma yuborish
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifyAtPrayerTime}
                  onChange={(e) => setNotifyAtPrayerTime(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </label>
          </div>

          <div className="toggle-group">
            <label className="toggle-label">
              <div>
                <strong>Eslatma yoqish taklifini ko'rsatish</strong>
                <p className="toggle-desc">
                  Yangi foydalanuvchilarga eslatmalarni yoqishni taklif qilish
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={offerReminders}
                  onChange={(e) => setOfferReminders(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </label>
          </div>

          <button
            className="btn-primary"
            onClick={() => reminderMutation.mutate()}
            disabled={reminderMutation.isLoading}
          >
            <Save size={18} />
            {reminderMutation.isLoading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>

      <div className="info-card">
        <h4>📋 Eslatmalar haqida:</h4>
        <ul>
          <li>
            <strong>Standart vaqt:</strong> Yangi foydalanuvchilarga namozdan
            necha daqiqa oldin eslatma yuboriladi
          </li>
          <li>
            <strong>Namoz vaqtida:</strong> Namoz vaqti kirganida ham qo'shimcha
            eslatma yuboriladi
          </li>
          <li>
            <strong>Taklif:</strong> Yangi foydalanuvchilarga eslatmalarni
            yoqishni taklif qilinadi
          </li>
          <li>
            <strong>Shaxsiy sozlamalar:</strong> Har bir foydalanuvchi
            sozlamalarda o'z eslatma vaqtini va qaysi namozlarga eslatma
            olishini tanlashi mumkin
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Settings;
