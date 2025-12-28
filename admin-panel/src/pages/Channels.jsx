import { useState, useEffect } from "react";
import axios from "axios";
import "./Channels.css";

const API_BASE = "http://localhost:3001";

function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannel, setNewChannel] = useState({
    id: "",
    username: "",
    title: "",
    isActive: true,
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChannels(response.data);
    } catch (error) {
      console.error("Error fetching channels:", error);
      alert("Kanallarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannel.id || !newChannel.username || !newChannel.title) {
      alert("Barcha maydonlarni to'ldiring");
      return;
    }

    // Validate channel ID format (must start with -100)
    if (!newChannel.id.startsWith("-100")) {
      alert("Kanal ID -100 bilan boshlanishi kerak");
      return;
    }

    // Validate username format (remove @ if present)
    const username = newChannel.username.replace("@", "");

    const channelToAdd = {
      id: newChannel.id,
      username,
      title: newChannel.title,
      isActive: newChannel.isActive,
    };

    const updatedChannels = [...channels, channelToAdd];
    await saveChannels(updatedChannels);

    setNewChannel({ id: "", username: "", title: "", isActive: true });
    setShowAddForm(false);
  };

  const handleToggleChannel = async (index) => {
    const updatedChannels = [...channels];
    updatedChannels[index].isActive = !updatedChannels[index].isActive;
    await saveChannels(updatedChannels);
  };

  const handleDeleteChannel = async (index) => {
    if (!confirm("Kanalni o'chirishni xohlaysizmi?")) return;

    const updatedChannels = channels.filter((_, i) => i !== index);
    await saveChannels(updatedChannels);
  };

  const saveChannels = async (updatedChannels) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/channels`,
        { channels: updatedChannels },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setChannels(updatedChannels);
      alert("Muvaffaqiyatli saqlandi");
    } catch (error) {
      console.error("Error saving channels:", error);
      alert("Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="channels-page">
      <div className="page-header">
        <h1>Majburiy A'zolik Kanallari</h1>
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "❌ Bekor qilish" : "➕ Kanal qo'shish"}
        </button>
      </div>

      {showAddForm && (
        <div className="add-channel-form">
          <h3>Yangi kanal qo'shish</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Kanal ID</label>
              <input
                type="text"
                placeholder="-1001234567890"
                value={newChannel.id}
                onChange={(e) =>
                  setNewChannel({ ...newChannel, id: e.target.value })
                }
              />
              <small>
                Bot kanal adminligida bo'lishi va kanal ID'sini @userinfobot
                orqali olishingiz mumkin
              </small>
            </div>

            <div className="form-group">
              <label>Kanal Username</label>
              <input
                type="text"
                placeholder="channel_username"
                value={newChannel.username}
                onChange={(e) =>
                  setNewChannel({ ...newChannel, username: e.target.value })
                }
              />
              <small>@ belgisisiz kiriting</small>
            </div>

            <div className="form-group">
              <label>Kanal Nomi</label>
              <input
                type="text"
                placeholder="Kanal nomi"
                value={newChannel.title}
                onChange={(e) =>
                  setNewChannel({ ...newChannel, title: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newChannel.isActive}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, isActive: e.target.checked })
                  }
                />
                <span>Faol holda qo'shish</span>
              </label>
            </div>
          </div>

          <button
            className="btn-success"
            onClick={handleAddChannel}
            disabled={saving}
          >
            {saving ? "Saqlanmoqda..." : "✅ Qo'shish"}
          </button>
        </div>
      )}

      <div className="channels-list">
        {channels.length === 0 ? (
          <div className="no-data">
            <p>Hozircha kanallar yo'q</p>
            <p>Majburiy a'zolik kanallari qo'shish uchun yuqoridagi tugmani bosing</p>
          </div>
        ) : (
          channels.map((channel, index) => (
            <div
              key={index}
              className={`channel-card ${!channel.isActive ? "inactive" : ""}`}
            >
              <div className="channel-info">
                <div className="channel-title">
                  <h3>{channel.title}</h3>
                  <span className={`status-badge ${channel.isActive ? "active" : "inactive"}`}>
                    {channel.isActive ? "✅ Faol" : "⏸️ Faol emas"}
                  </span>
                </div>
                <div className="channel-details">
                  <p>
                    <strong>Username:</strong> @{channel.username}
                  </p>
                  <p>
                    <strong>ID:</strong> <code>{channel.id}</code>
                  </p>
                </div>
              </div>

              <div className="channel-actions">
                <button
                  className="btn-toggle"
                  onClick={() => handleToggleChannel(index)}
                  disabled={saving}
                >
                  {channel.isActive ? "⏸️ O'chirish" : "▶️ Yoqish"}
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteChannel(index)}
                  disabled={saving}
                >
                  🗑️ O'chirish
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {channels.length > 0 && (
        <div className="info-box">
          <h4>💡 Eslatma:</h4>
          <ul>
            <li>Bot barcha kanallarda admin bo'lishi kerak</li>
            <li>Faqat faol kanallar tekshiriladi</li>
            <li>Foydalanuvchi barcha faol kanallarga a'zo bo'lishi kerak</li>
            <li>Kanallarni vaqtincha o'chirish uchun "O'chirish" tugmasini bosing</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Channels;
