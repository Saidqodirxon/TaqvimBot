import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../api";
import {
  Database,
  Download,
  Trash2,
  Calendar,
  Clock,
  HardDrive,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import "./Backups.css";

function Backups() {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState({
    enabled: true,
    cronTime: "0 3 * * *",
    keepDays: 7,
  });
  const [scheduleHour, setScheduleHour] = useState(3);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState("*");

  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  // Convert cron to readable format
  const cronToReadable = (cronTime) => {
    const [minute, hour, dayOfMonth] = cronTime.split(" ");
    const h = parseInt(hour);
    const m = parseInt(minute);
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    
    if (dayOfMonth === "*") {
      return `Har kuni soat ${timeStr} da`;
    } else {
      return `Har oyning ${dayOfMonth}-kuni soat ${timeStr} da`;
    }
  };

  // Convert hour/minute to cron
  const toCronTime = (hour, minute, dayOfMonth) => {
    return `${minute} ${hour} ${dayOfMonth} * *`;
  };

  // Get all backups
  const { data: backupsData, isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/backups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get schedule settings
  const { data: scheduleData } = useQuery({
    queryKey: ["backupSchedule"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/backups/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_URL}/backups/create`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      alert(data.message);
      setTimeout(() => {
        queryClient.invalidateQueries(["backups"]);
      }, 5000); // Refresh after 5 seconds
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Backup yaratishda xatolik");
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (filename) => {
      const response = await axios.delete(`${API_URL}/backups/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["backups"]);
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Backup o'chirishda xatolik");
    },
  });

  // Send backup to Telegram mutation
  const sendBackupMutation = useMutation({
    mutationFn: async (filename) => {
      const response = await axios.post(
        `${API_URL}/backups/send/${filename}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      alert(data.message);
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Backup yuborishda xatolik");
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await axios.put(
        `${API_URL}/backups/schedule`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      alert(data.message);
      queryClient.invalidateQueries(["backupSchedule"]);
      setShowScheduleModal(false);
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Schedule yangilashda xatolik");
    },
  });

  const handleDownload = (filename) => {
    const token = localStorage.getItem("token");
    const link = document.createElement("a");
    link.href = `${API_URL}/backups/download/${filename}?token=${token}`;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (filename) => {
    if (confirm(`${filename} faylini o'chirmoqchimisiz?`)) {
      deleteBackupMutation.mutate(filename);
    }
  };

  const handleSendToGroup = (filename) => {
    if (confirm(`${filename} faylini log kanalga yubormoqchimisiz?`)) {
      sendBackupMutation.mutate(filename);
    }
  };

  const handleOpenSchedule = () => {
    if (scheduleData?.schedule) {
      setScheduleSettings(scheduleData.schedule);
      // Parse cron time
      const [minute, hour, dayOfMonth] = scheduleData.schedule.cronTime.split(" ");
      setScheduleHour(parseInt(hour));
      setScheduleMinute(parseInt(minute));
      setScheduleDayOfMonth(dayOfMonth);
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = () => {
    const cronTime = toCronTime(scheduleHour, scheduleMinute, scheduleDayOfMonth);
    updateScheduleMutation.mutate({
      ...scheduleSettings,
      cronTime,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseCronTime = (cronTime) => {
    return cronToReadable(cronTime);
  };

  if (isLoading) {
    return (
      <div className="backups-page">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="backups-page">
      <div className="page-header">
        <div>
          <h1>
            <Database size={32} />
            MongoDB Backuplar
          </h1>
          <p>Ma'lumotlar bazasi zaxira nusxalari</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleOpenSchedule}>
            <Settings size={20} />
            Schedule
          </button>
          <button
            className="btn-primary"
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
          >
            <Plus size={20} />
            {createBackupMutation.isPending
              ? "Yaratilmoqda..."
              : "Yangi Backup"}
          </button>
        </div>
      </div>

      {/* Schedule Info */}
      {scheduleData?.schedule && (
        <div className="schedule-info">
          <div className="schedule-item">
            <Clock size={20} />
            <span>
              {scheduleData.schedule.enabled ? (
                <>
                  <CheckCircle size={16} color="#4caf50" />
                  Avtomatik backup faol:{" "}
                  {parseCronTime(scheduleData.schedule.cronTime)}
                </>
              ) : (
                <>
                  <XCircle size={16} color="#f44336" />
                  Avtomatik backup o'chirilgan
                </>
              )}
            </span>
          </div>
          <div className="schedule-item">
            <Calendar size={20} />
            <span>Saqlash muddati: {scheduleData.schedule.keepDays} kun</span>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="backup-stats">
        <div className="stat-card">
          <Database size={24} />
          <div>
            <h3>{backupsData?.totalBackups || 0}</h3>
            <p>Jami Backuplar</p>
          </div>
        </div>
        <div className="stat-card">
          <HardDrive size={24} />
          <div>
            <h3>{backupsData?.totalSizeFormatted || "0 MB"}</h3>
            <p>Jami Hajm</p>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="backups-list">
        {backupsData?.backups?.length === 0 ? (
          <div className="empty-state">
            <Database size={48} />
            <p>Hozircha backuplar yo'q</p>
            <button
              className="btn-primary"
              onClick={() => createBackupMutation.mutate()}
            >
              <Plus size={20} />
              Birinchi Backupni Yaratish
            </button>
          </div>
        ) : (
          backupsData?.backups?.map((backup) => (
            <div key={backup.filename} className="backup-card">
              <div className="backup-icon">
                <Database size={32} />
              </div>
              <div className="backup-info">
                <h3>{backup.filename}</h3>
                <div className="backup-meta">
                  <span>
                    <Calendar size={16} />
                    {formatDate(backup.createdAt)}
                  </span>
                  <span>
                    <HardDrive size={16} />
                    {backup.sizeFormatted}
                  </span>
                </div>
              </div>
              <div className="backup-actions">
                <button
                  className="btn-icon download"
                  onClick={() => handleDownload(backup.filename)}
                  title="Yuklab olish"
                >
                  <Download size={20} />
                </button>
                <button
                  className="btn-icon send"
                  onClick={() => handleSendToGroup(backup.filename)}
                  disabled={sendBackupMutation.isPending}
                  title="Telegram guruhga yuborish"
                >
                  <Send size={20} />
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => handleDelete(backup.filename)}
                  disabled={deleteBackupMutation.isPending}
                  title="O'chirish"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowScheduleModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Backup Schedule Sozlamalari</h2>
              <button
                className="close-btn"
                onClick={() => setShowScheduleModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={scheduleSettings.enabled}
                    onChange={(e) =>
                      setScheduleSettings({
                        ...scheduleSettings,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  Avtomatik backup yoqilgan
                </label>
              </div>

              <div className="form-group">
                <label>Backup vaqti</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#666" }}>Soat</label>
                    <select
                      value={scheduleHour}
                      onChange={(e) => setScheduleHour(parseInt(e.target.value))}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span style={{ fontSize: "20px", fontWeight: "bold" }}>:</span>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#666" }}>Daqiqa</label>
                    <select
                      value={scheduleMinute}
                      onChange={(e) => setScheduleMinute(parseInt(e.target.value))}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Backup qilish kuni (oylik)</label>
                <select
                  value={scheduleDayOfMonth}
                  onChange={(e) => setScheduleDayOfMonth(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                  <option value="*">Har kuni</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Har oyning {day}-kuni
                    </option>
                  ))}
                </select>
                <small style={{ color: "#666", marginTop: "5px", display: "block" }}>
                  ✅ {cronToReadable(toCronTime(scheduleHour, scheduleMinute, scheduleDayOfMonth))}
                </small>
              </div>

              <div className="form-group">
                <label>Saqlash muddati (kunlarda)</label>
                <input
                  type="number"
                  value={scheduleSettings.keepDays}
                  onChange={(e) =>
                    setScheduleSettings({
                      ...scheduleSettings,
                      keepDays: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  max="90"
                />
                <small>Eski backuplar avtomatik o'chiriladi</small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowScheduleModal(false)}
              >
                Bekor qilish
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveSchedule}
                disabled={updateScheduleMutation.isPending}
              >
                {updateScheduleMutation.isPending
                  ? "Saqlanmoqda..."
                  : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Backups;
