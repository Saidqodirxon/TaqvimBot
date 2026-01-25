import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../api";
import {
  Save,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
} from "lucide-react";
import "./Prayers.css";

// using global API_URL from src/api.js

function Prayers() {
  const [prayers, setPrayers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: { uz: "", cr: "", ru: "" },
    content: { uz: "", cr: "", ru: "" },
    order: 0,
    isActive: true,
  });

  const queryClient = useQueryClient();

  // Fetch prayers
  const { data, isLoading } = useQuery({
    queryKey: ["prayers"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/prayers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.prayers;
    },
  });

  useEffect(() => {
    if (data) {
      setPrayers(data);
    }
  }, [data]);

  // Create/Update prayer
  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");

      if (editingId) {
        // Update
        await axios.put(`${API_URL}/prayers/${editingId}`, editForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
        await axios.post(`${API_URL}/prayers`, editForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["prayers"]);
      resetForm();
      alert(editingId ? "Dua yangilandi!" : "Dua qo'shildi!");
    },
    onError: (error) => {
      alert("Xatolik: " + (error.response?.data?.error || error.message));
    },
  });

  // Delete prayer
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/prayers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["prayers"]);
      alert("Dua o'chirildi!");
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setEditForm({
      title: { uz: "", cr: "", ru: "" },
      content: { uz: "", cr: "", ru: "" },
      order: prayers.length,
      isActive: true,
    });
  };

  const handleEdit = (prayer) => {
    setEditingId(prayer._id);
    setEditForm({
      title: prayer.title,
      content: prayer.content,
      order: prayer.order,
      isActive: prayer.isActive,
    });
  };

  const handleDelete = (id) => {
    if (confirm("Duani o'chirishni xohlaysizmi?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="prayers-page">
      <div className="page-header">
        <h1>
          <BookOpen size={32} />
          Duolar Boshqaruvi
        </h1>
        <p>Botdagi duolarni qo'shish, tahrirlash va boshqarish</p>
      </div>

      {/* Prayer Form */}
      <div className="card">
        <div className="setting-header">
          <Plus size={24} />
          <div>
            <h3>{editingId ? "Duani tahrirlash" : "Yangi dua qo'shish"}</h3>
            <p>Dua nomini va matnini 3 tilda kiriting</p>
          </div>
        </div>

        <div className="prayer-form">
          {/* Uzbek Latin */}
          <div className="form-group">
            <label>🇺🇿 Dua nomi (O'zbek lotin)</label>
            <input
              type="text"
              value={editForm.title.uz}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  title: { ...editForm.title, uz: e.target.value },
                })
              }
              placeholder="Masalan: Subhonalloh tasbih"
            />
          </div>

          <div className="form-group">
            <label>Dua matni (O'zbek lotin)</label>
            <textarea
              value={editForm.content.uz}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  content: { ...editForm.content, uz: e.target.value },
                })
              }
              placeholder="Duaning to'liq matni..."
              rows="6"
            />
          </div>

          {/* Uzbek Cyrillic */}
          <div className="form-group">
            <label>🇺🇿 Дуо номи (Ўзбек кирилл)</label>
            <input
              type="text"
              value={editForm.title.cr}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  title: { ...editForm.title, cr: e.target.value },
                })
              }
              placeholder="Масалан: Субҳоноллоҳ тасбеҳ"
            />
          </div>

          <div className="form-group">
            <label>Дуо матни (Ўзбек кирилл)</label>
            <textarea
              value={editForm.content.cr}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  content: { ...editForm.content, cr: e.target.value },
                })
              }
              placeholder="Дуонинг тўлиқ матни..."
              rows="6"
            />
          </div>

          {/* Russian */}
          <div className="form-group">
            <label>🇷🇺 Название молитвы (Русский)</label>
            <input
              type="text"
              value={editForm.title.ru}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  title: { ...editForm.title, ru: e.target.value },
                })
              }
              placeholder="Например: Субханаллах тасбих"
            />
          </div>

          <div className="form-group">
            <label>Текст молитвы (Русский)</label>
            <textarea
              value={editForm.content.ru}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  content: { ...editForm.content, ru: e.target.value },
                })
              }
              placeholder="Полный текст молитвы..."
              rows="6"
            />
          </div>

          {/* Settings */}
          <div className="form-row">
            <div className="form-group">
              <label>Tartib raqami</label>
              <input
                type="number"
                value={editForm.order}
                onChange={(e) =>
                  setEditForm({ ...editForm, order: parseInt(e.target.value) })
                }
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isActive: e.target.checked })
                  }
                />
                Faol
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading}
            >
              <Save size={18} />
              {saveMutation.isLoading
                ? "Saqlanmoqda..."
                : editingId
                  ? "Yangilash"
                  : "Qo'shish"}
            </button>

            {editingId && (
              <button className="btn-secondary" onClick={resetForm}>
                Bekor qilish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prayers List */}
      <div className="card">
        <div className="setting-header">
          <BookOpen size={24} />
          <div>
            <h3>Duolar ro'yxati</h3>
            <p>Jami: {prayers.length} ta dua</p>
          </div>
        </div>

        {prayers.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <p>Hozircha duolar yo'q</p>
            <small>Yuqorida yangi dua qo'shing</small>
          </div>
        ) : (
          <div className="prayers-list">
            {prayers.map((prayer) => (
              <div
                key={prayer._id}
                className={`prayer-card ${!prayer.isActive ? "inactive" : ""}`}
              >
                <div className="prayer-header">
                  <div className="prayer-info">
                    <h4>
                      {prayer.isActive ? (
                        <Eye size={18} className="icon-success" />
                      ) : (
                        <EyeOff size={18} className="icon-muted" />
                      )}
                      {prayer.title.uz}
                    </h4>
                    <span className="order-badge">#{prayer.order}</span>
                  </div>
                  <div className="prayer-actions">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(prayer)}
                      title="Tahrirlash"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(prayer._id)}
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="prayer-content">
                  <div className="prayer-lang">
                    <strong>🇺🇿 Lotin:</strong>
                    <p>{prayer.content.uz.substring(0, 100)}...</p>
                  </div>
                  <div className="prayer-lang">
                    <strong>🇺🇿 Кирилл:</strong>
                    <p>{prayer.content.cr.substring(0, 100)}...</p>
                  </div>
                  <div className="prayer-lang">
                    <strong>🇷🇺 Русский:</strong>
                    <p>{prayer.content.ru.substring(0, 100)}...</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="info-card">
        <h4>📋 Duolar haqida:</h4>
        <ul>
          <li>
            <strong>Dinamik:</strong> Duolarni istalgan vaqt qo'shish,
            tahrirlash va o'chirishingiz mumkin
          </li>
          <li>
            <strong>3 tilda:</strong> Har bir dua uchun 3 tilda nom va matn
            kiriting
          </li>
          <li>
            <strong>Tartib:</strong> Order raqami bilan duolar tartibini
            belgilang
          </li>
          <li>
            <strong>Faol/Nofaol:</strong> Duani vaqtincha yashirish uchun nofaol
            qiling
          </li>
          <li>
            <strong>HTML format:</strong> Matnda &lt;b&gt;, &lt;i&gt;,
            &lt;code&gt; taglaridan foydalanishingiz mumkin
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Prayers;
