import { useState, useEffect, useRef } from "react";
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
  X,
  FileText,
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
  const [sectionText, setSectionText] = useState({ uz: "", cr: "", ru: "" });

  const formRef = useRef(null);

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

  // Fetch section text
  useEffect(() => {
    const fetchSectionText = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const st = response.data.settings;
        const pts = st.find(s => s.key === "prayers_text");
        if (pts?.value) {
          setSectionText(pts.value);
        }
      } catch (err) {
        console.error("Fetch section text error:", err);
      }
    };
    fetchSectionText();
  }, []);

  // Update section text mutation
  const sectionTextMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/settings/prayers`, { prayers: sectionText }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      alert("Bo'lim matni saqlandi!");
    },
    onError: (err) => {
      alert("Xatolik: " + (err.response?.data?.error || err.message));
    }
  });

  // Create/Update prayer
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate form
      if (!editForm.title.uz || !editForm.content.uz) {
        throw new Error("O'zbek tilida nom va matn kiritish majburiy!");
      }
      if (!editForm.title.cr || !editForm.content.cr) {
        throw new Error("Kirill tilida nom va matn kiritish majburiy!");
      }
      if (!editForm.title.ru || !editForm.content.ru) {
        throw new Error("Rus tilida nom va matn kiritish majburiy!");
      }

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
      alert(
        editingId
          ? "Dua muvaffaqiyatli yangilandi!"
          : "Dua muvaffaqiyatli qo'shildi!"
      );
    },
    onError: (error) => {
      console.error("Save prayer error:", error);
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

    // Normalize old data format to new format
    const normalizedTitle =
      typeof prayer.title === "object"
        ? { ...prayer.title }
        : { uz: prayer.title || "", cr: "", ru: "" };

    const normalizedContent =
      typeof prayer.content === "object"
        ? { ...prayer.content }
        : { uz: prayer.content || "", cr: "", ru: "" };

    setEditForm({
      title: normalizedTitle,
      content: normalizedContent,
      order: prayer.order || 0,
      isActive: prayer.isActive !== undefined ? prayer.isActive : true,
    });

    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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

      {/* Section Text Editor */}
      <div className="card">
        <div className="setting-header">
          <FileText size={24} />
          <div>
            <h3>Duo Bo'limi Matni</h3>
            <p>Botdagi "Duolar" bo'limining boshida chiqadigan matn</p>
          </div>
        </div>

        <div className="form-group">
          <label>🇺🇿 Uzbek (Lotin)</label>
          <textarea
            value={sectionText.uz}
            onChange={(e) => setSectionText({ ...sectionText, uz: e.target.value })}
            placeholder="Duolar bo'limi uchun matn..."
          />
        </div>
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label>🇷🇺 Uzbek (Kirill)</label>
          <textarea
            value={sectionText.cr}
            onChange={(e) => setSectionText({ ...sectionText, cr: e.target.value })}
            placeholder="Дуолар бўлими учун матн..."
          />
        </div>
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label>🇷🇺 Rus tili</label>
          <textarea
            value={sectionText.ru}
            onChange={(e) => setSectionText({ ...sectionText, ru: e.target.value })}
            placeholder="Текст для раздела молитв..."
          />
        </div>

        <button
          className="btn-primary"
          style={{ marginTop: '15px' }}
          onClick={() => sectionTextMutation.mutate()}
          disabled={sectionTextMutation.isLoading}
        >
          <Save size={18} />
          {sectionTextMutation.isLoading ? "Saqlanmoqda..." : "Bo'lim matnini saqlash"}
        </button>
      </div>

      {/* Prayer Form */}
      <div className="card" ref={formRef}>
        <div className="setting-header">
          {editingId ? <Edit2 size={24} /> : <Plus size={24} />}
          <div>
            <h3>{editingId ? "Duani tahrirlash" : "Yangi dua qo'shish"}</h3>
            <p>Dua nomini va matnini 3 tilda kiriting</p>
          </div>
          {editingId && (
            <button
              className="btn-icon btn-close"
              onClick={resetForm}
              title="Bekor qilish"
            >
              <X size={20} />
            </button>
          )}
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
                      {prayer.title?.uz || prayer.title || "No'malum dua"}
                    </h4>
                    <span className="order-badge">#{prayer.order || 0}</span>
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
                  {prayer.content?.uz && (
                    <div className="prayer-lang">
                      <strong>🇺🇿 Lotin:</strong>
                      <p>{prayer.content.uz.substring(0, 100)}...</p>
                    </div>
                  )}
                  {prayer.content?.cr && (
                    <div className="prayer-lang">
                      <strong>🇺🇿 Кирилл:</strong>
                      <p>{prayer.content.cr.substring(0, 100)}...</p>
                    </div>
                  )}
                  {prayer.content?.ru && (
                    <div className="prayer-lang">
                      <strong>🇷🇺 Русский:</strong>
                      <p>{prayer.content.ru.substring(0, 100)}...</p>
                    </div>
                  )}
                  {typeof prayer.content === "string" && (
                    <div className="prayer-lang">
                      <p>{prayer.content.substring(0, 200)}...</p>
                    </div>
                  )}
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
