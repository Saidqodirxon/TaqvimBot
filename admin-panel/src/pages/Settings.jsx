import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settings } from "../api";
import { Save, Bell, MessageSquare, Database, FileText } from "lucide-react";
import "./Settings.css";

function Settings() {
  // Reminder settings state
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [defaultMinutes, setDefaultMinutes] = useState(10);
  const [notifyAtPrayerTime, setNotifyAtPrayerTime] = useState(true);
  const [offerReminders, setOfferReminders] = useState(true);

  // Channel settings state
  const [greetingChannelId, setGreetingChannelId] = useState("");
  const [logChannelId, setLogChannelId] = useState("");

  // Cache settings state
  const [cacheTtl, setCacheTtl] = useState(86400); // 24 hours default
  const [cacheMaxSize, setCacheMaxSize] = useState(1000);
  const [cacheAutoClean, setCacheAutoClean] = useState(true);

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
      // Reminder settings
      const reminderSettings = data?.find((s) => s.key === "reminder_settings");
      if (reminderSettings?.value) {
        setReminderEnabled(reminderSettings.value.enabled ?? true);
        setDefaultMinutes(reminderSettings.value.defaultMinutes ?? 10);
        setNotifyAtPrayerTime(
          reminderSettings.value.notifyAtPrayerTime ?? true
        );
        setOfferReminders(reminderSettings.value.offerReminders ?? true);
      }

      // Greeting channel
      const greetingChannel = data?.find((s) => s.key === "greeting_channel");
      if (greetingChannel?.value) {
        setGreetingChannelId(greetingChannel.value);
      }

      // Log channel
      const logChannel = data?.find((s) => s.key === "log_channel");
      if (logChannel?.value) {
        setLogChannelId(logChannel.value);
      }

      // Cache settings
      const cacheSettings = data?.find((s) => s.key === "cache_settings");
      if (cacheSettings?.value) {
        setCacheTtl(cacheSettings.value.ttl ?? 86400);
        setCacheMaxSize(cacheSettings.value.maxSize ?? 1000);
        setCacheAutoClean(cacheSettings.value.autoClean ?? true);
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

  const greetingChannelMutation = useMutation({
    mutationFn: () => settings.setGreetingChannel(greetingChannelId),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Tabrik kanali o'rnatildi!");
    },
    onError: () => {
      alert("Xatolik yuz berdi!");
    },
  });

  const logChannelMutation = useMutation({
    mutationFn: () => settings.setLogChannel(logChannelId),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Log kanali o'rnatildi!");
    },
    onError: () => {
      alert("Xatolik yuz berdi!");
    },
  });

  const cacheMutation = useMutation({
    mutationFn: () =>
      settings.setCacheSettings({
        ttl: parseInt(cacheTtl),
        maxSize: parseInt(cacheMaxSize),
        autoClean: cacheAutoClean,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Cache sozlamalari saqlandi!");
    },
    onError: () => {
      alert("Xatolik yuz berdi!");
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
        <h1>⚙️ Sozlamalar</h1>
        <p>Bot uchun global sozlamalar</p>
      </div>

      {/* Reminder Settings */}
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

      {/* Channel Settings */}
      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <MessageSquare size={24} />
            <div>
              <h3>Kanal Sozlamalari</h3>
              <p>Tabrik va log kanallari</p>
            </div>
          </div>

          <div className="form-group">
            <label>📨 Tabrik Kanali ID</label>
            <input
              type="text"
              placeholder="-1001234567890"
              value={greetingChannelId}
              onChange={(e) => setGreetingChannelId(e.target.value)}
            />
            <small className="help-text">
              💡 Foydalanuvchilar yuborgan tabriklar shu kanalga chiqadi
            </small>
          </div>

          <button
            className="btn-primary"
            onClick={() => greetingChannelMutation.mutate()}
            disabled={
              greetingChannelMutation.isLoading || !greetingChannelId.trim()
            }
          >
            <Save size={18} />
            {greetingChannelMutation.isLoading
              ? "Saqlanmoqda..."
              : "Tabrik Kanalini Saqlash"}
          </button>

          <div className="form-group" style={{ marginTop: "24px" }}>
            <label>📋 Log Kanali ID</label>
            <input
              type="text"
              placeholder="-1001234567890"
              value={logChannelId}
              onChange={(e) => setLogChannelId(e.target.value)}
            />
            <small className="help-text">
              💡 Bot loglar, xatolar va eventlar shu kanalga yuboriladi
            </small>
          </div>

          <button
            className="btn-primary"
            onClick={() => logChannelMutation.mutate()}
            disabled={logChannelMutation.isLoading || !logChannelId.trim()}
          >
            <Save size={18} />
            {logChannelMutation.isLoading
              ? "Saqlanmoqda..."
              : "Log Kanalini Saqlash"}
          </button>
        </div>
      </div>

      {/* Cache Settings */}
      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <Database size={24} />
            <div>
              <h3>Cache Sozlamalari</h3>
              <p>Namoz vaqtlari cache boshqaruvi</p>
            </div>
          </div>

          <div className="form-group">
            <label>⏱ Cache TTL (Time To Live)</label>
            <select
              value={cacheTtl}
              onChange={(e) => setCacheTtl(e.target.value)}
            >
              <option value="3600">1 soat</option>
              <option value="21600">6 soat</option>
              <option value="43200">12 soat</option>
              <option value="86400">24 soat (1 kun)</option>
              <option value="172800">48 soat (2 kun)</option>
              <option value="604800">7 kun</option>
            </select>
            <small className="help-text">
              💡 Cache qancha vaqt saqlanadiги (soniyalarda)
            </small>
          </div>

          <div className="form-group">
            <label>📊 Maximum Cache Size</label>
            <select
              value={cacheMaxSize}
              onChange={(e) => setCacheMaxSize(e.target.value)}
            >
              <option value="500">500 yozuv</option>
              <option value="1000">1000 yozuv</option>
              <option value="2000">2000 yozuv</option>
              <option value="5000">5000 yozuv</option>
              <option value="10000">10000 yozuv</option>
            </select>
            <small className="help-text">
              💡 Cache'da maksimal nechta yozuv saqlanadi
            </small>
          </div>

          <div className="toggle-group">
            <label className="toggle-label">
              <div>
                <strong>Avtomatik tozalash</strong>
                <p className="toggle-desc">
                  Muddati o'tgan cache'larni avtomatik o'chirish
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={cacheAutoClean}
                  onChange={(e) => setCacheAutoClean(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </label>
          </div>

          <button
            className="btn-primary"
            onClick={() => cacheMutation.mutate()}
            disabled={cacheMutation.isLoading}
          >
            <Save size={18} />
            {cacheMutation.isLoading ? "Saqlanmoqda..." : "Cache Sozlamalari"}
          </button>
        </div>
      </div>

      {/* Info Cards */}
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

      <div className="info-card">
        <h4>📡 Kanallar haqida:</h4>
        <ul>
          <li>
            <strong>Tabrik Kanali:</strong> Foydalanuvchilar yuborgan barcha
            tasdiqlangan tabriklar bu kanalga avtomatik chiqariladi
          </li>
          <li>
            <strong>Log Kanali:</strong> Bot ishlashidagi muhim eventlar,
            xatolar va statistika bu kanalga yuboriladi
          </li>
          <li>
            <strong>Bot Admin:</strong> Bot ikkala kanalda ham admin
            huquqlariga ega bo'lishi kerak
          </li>
        </ul>
      </div>

      <div className="info-card">
        <h4>💾 Cache haqida:</h4>
        <ul>
          <li>
            <strong>TTL:</strong> Namoz vaqtlari qancha vaqt cache'da
            saqlanadi, keyin qayta so'raladi
          </li>
          <li>
            <strong>Max Size:</strong> Cache'da maksimal nechta joylashuv uchun
            namoz vaqtlari saqlanadi
          </li>
          <li>
            <strong>Auto Clean:</strong> Muddati o'tgan cache'lar avtomatik
            o'chiriladi, server xotirasini tejaydi
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Settings;
