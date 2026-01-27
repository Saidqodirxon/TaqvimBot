import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settings } from "../api";
import { Database, Trash2, RefreshCw, Activity } from "lucide-react";
import "./Cache.css";

function RedisManagement() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);

  // Fetch Redis settings
  const { data: redisSettings, isLoading } = useQuery({
    queryKey: ["redis-settings"],
    queryFn: async () => {
      const [enabled, host, port, prayerTtl, locationTtl, userTtl] =
        await Promise.all([
          settings.get("redis_enabled"),
          settings.get("redis_host"),
          settings.get("redis_port"),
          settings.get("redis_prayer_times_ttl_hours"),
          settings.get("redis_location_ttl_days"),
          settings.get("redis_user_data_ttl_hours"),
        ]);
      return {
        enabled: enabled?.data?.value ?? true,
        host: host?.data?.value ?? "localhost",
        port: port?.data?.value ?? 6379,
        prayerTtl: prayerTtl?.data?.value ?? 24,
        locationTtl: locationTtl?.data?.value ?? 7,
        userTtl: userTtl?.data?.value ?? 1,
      };
    },
  });

  // Toggle Redis
  const toggleRedisMutation = useMutation({
    mutationFn: async () => {
      await settings.update("redis_enabled", {
        value: !redisSettings.enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["redis-settings"]);
      setMessage({
        type: "success",
        text: redisSettings.enabled ? "Redis o'chirildi" : "Redis yoqildi",
      });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  // Update Redis settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      await Promise.all([
        settings.update("redis_host", { value: data.host }),
        settings.update("redis_port", { value: parseInt(data.port) }),
        settings.update("redis_prayer_times_ttl_hours", {
          value: parseInt(data.prayerTtl),
        }),
        settings.update("redis_location_ttl_days", {
          value: parseInt(data.locationTtl),
        }),
        settings.update("redis_user_data_ttl_hours", {
          value: parseInt(data.userTtl),
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["redis-settings"]);
      setMessage({ type: "success", text: "Sozlamalar saqlandi" });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateSettingsMutation.mutate({
      host: formData.get("host"),
      port: formData.get("port"),
      prayerTtl: formData.get("prayerTtl"),
      locationTtl: formData.get("locationTtl"),
      userTtl: formData.get("userTtl"),
    });
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="cache-page">
      <div className="page-header">
        <div>
          <h1>
            <Database size={32} /> Redis Boshqaruvi
          </h1>
          <p>Cache tizimini boshqaring va sozlang</p>
        </div>
        <button
          className={`toggle-btn ${redisSettings?.enabled ? "active" : ""}`}
          onClick={() => toggleRedisMutation.mutate()}
          disabled={toggleRedisMutation.isLoading}
        >
          {redisSettings?.enabled ? (
            <>
              <Activity size={20} /> Redis Faol
            </>
          ) : (
            <>
              <Activity size={20} /> Redis O'chiq
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="redis-grid">
        <div className="card">
          <h3>
            <Database size={24} /> Redis Sozlamalari
          </h3>
          <form onSubmit={handleSubmit} className="redis-form">
            <div className="form-group">
              <label>Host</label>
              <input
                type="text"
                name="host"
                defaultValue={redisSettings?.host}
                placeholder="localhost"
                disabled={!redisSettings?.enabled}
              />
            </div>

            <div className="form-group">
              <label>Port</label>
              <input
                type="number"
                name="port"
                defaultValue={redisSettings?.port}
                placeholder="6379"
                disabled={!redisSettings?.enabled}
              />
            </div>

            <div className="form-group">
              <label>Namoz vaqtlari TTL (soat)</label>
              <input
                type="number"
                name="prayerTtl"
                defaultValue={redisSettings?.prayerTtl}
                min="1"
                max="168"
                disabled={!redisSettings?.enabled}
              />
              <small>Namoz vaqtlari cache davomiyligi</small>
            </div>

            <div className="form-group">
              <label>Joylashuv TTL (kun)</label>
              <input
                type="number"
                name="locationTtl"
                defaultValue={redisSettings?.locationTtl}
                min="1"
                max="365"
                disabled={!redisSettings?.enabled}
              />
              <small>Joylashuv ma'lumotlari cache davomiyligi</small>
            </div>

            <div className="form-group">
              <label>User ma'lumotlari TTL (soat)</label>
              <input
                type="number"
                name="userTtl"
                defaultValue={redisSettings?.userTtl}
                min="1"
                max="72"
                disabled={!redisSettings?.enabled}
              />
              <small>Foydalanuvchi ma'lumotlari cache davomiyligi</small>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                !redisSettings?.enabled || updateSettingsMutation.isLoading
              }
            >
              {updateSettingsMutation.isLoading ? (
                "Saqlanmoqda..."
              ) : (
                <>
                  <RefreshCw size={18} /> Sozlamalarni Saqlash
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>
            <Activity size={24} /> Redis Haqida
          </h3>
          <div className="redis-info">
            <div className="info-item">
              <strong>Status:</strong>
              <span
                className={`status ${redisSettings?.enabled ? "active" : "inactive"}`}
              >
                {redisSettings?.enabled ? "🟢 Faol" : "🔴 O'chiq"}
              </span>
            </div>

            <div className="info-item">
              <strong>Manzil:</strong>
              <code>
                {redisSettings?.host}:{redisSettings?.port}
              </code>
            </div>

            <div className="info-section">
              <h4>📊 Cache Turlari</h4>
              <ul>
                <li>
                  <strong>Namoz vaqtlari:</strong> {redisSettings?.prayerTtl}{" "}
                  soat
                </li>
                <li>
                  <strong>Joylashuv:</strong> {redisSettings?.locationTtl} kun
                </li>
                <li>
                  <strong>User ma'lumotlari:</strong> {redisSettings?.userTtl}{" "}
                  soat
                </li>
              </ul>
            </div>

            <div className="info-section">
              <h4>⚡ Afzalliklar</h4>
              <ul>
                <li>90-99% tezlik oshishi</li>
                <li>API so'rovlarini kamaytirish</li>
                <li>Server yukini pasaytirish</li>
                <li>Foydalanuvchi tajribasini yaxshilash</li>
              </ul>
            </div>

            <div className="warning-box">
              <strong>⚠️ Eslatma:</strong>
              <p>
                Redis o'chirilsa, barcha so'rovlar to'g'ridan-to'g'ri
                ma'lumotlar bazasiga yuboriladi va bot sekinroq ishlaydi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RedisManagement;
