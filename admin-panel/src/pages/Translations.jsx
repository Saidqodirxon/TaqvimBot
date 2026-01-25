import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { translations } from "../api";
import { Save, Plus, Edit2, Trash2, Languages } from "lucide-react";
import "./Translations.css";

const CATEGORIES = [
  { value: "buttons", label: "Tugmalar" },
  { value: "messages", label: "Xabarlar" },
  { value: "errors", label: "Xatolar" },
  { value: "admin", label: "Admin" },
  { value: "prayers", label: "Namozlar" },
  { value: "settings", label: "Sozlamalar" },
  { value: "location", label: "Joylashuv" },
  { value: "greeting", label: "Tabriklar" },
  { value: "calendar", label: "Kalendar" },
  { value: "other", label: "Boshqa" },
];

function Translations() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formData, setFormData] = useState({
    key: "",
    uz: "",
    cr: "",
    ru: "",
    description: "",
    category: "other",
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["translations", categoryFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.append("category", categoryFilter);
      if (searchQuery) params.append("search", searchQuery);
      const response = await translations.getAll(params.toString());
      return response.data.translations;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => translations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["translations"]);
      setShowAddForm(false);
      resetForm();
      alert("Tarjima qo'shildi!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }) => translations.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["translations"]);
      setEditingKey(null);
      resetForm();
      alert("Tarjima yangilandi!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key) => translations.delete(key),
    onSuccess: () => {
      queryClient.invalidateQueries(["translations"]);
      alert("Tarjima o'chirildi!");
    },
  });

  const resetForm = () => {
    setFormData({
      key: "",
      uz: "",
      cr: "",
      ru: "",
      description: "",
      category: "other",
    });
  };

  const handleEdit = (translation) => {
    setFormData({
      key: translation.key,
      uz: translation.uz,
      cr: translation.cr,
      ru: translation.ru,
      description: translation.description || "",
      category: translation.category,
    });
    setEditingKey(translation.key);
    setShowAddForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingKey) {
      updateMutation.mutate({ key: editingKey, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (key) => {
    if (confirm(`${key} tarjimasini o'chirishni xohlaysizmi?`)) {
      deleteMutation.mutate(key);
    }
  };

  if (isLoading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="translations-page">
      <div className="page-header">
        <div>
          <h1>
            <Languages size={32} />
            Tarjimalar
          </h1>
          <p>Bot textlarini boshqarish</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingKey(null);
            resetForm();
          }}
        >
          {showAddForm ? (
            "❌ Bekor qilish"
          ) : (
            <>
              <Plus size={18} /> Qo'shish
            </>
          )}
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Qidirish (key, text, izoh)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="filter-search"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">Barcha kategoriyalar</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {showAddForm && (
        <div className="card add-form">
          <h3>
            {editingKey ? "Tarjimani tahrirlash" : "Yangi tarjima qo'shish"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Key *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingKey}
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  placeholder="btn_start"
                />
              </div>

              <div className="form-group">
                <label>Kategoriya</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>O'zbekcha (Lotin) *</label>
                <textarea
                  required
                  rows="3"
                  value={formData.uz}
                  onChange={(e) =>
                    setFormData({ ...formData, uz: e.target.value })
                  }
                  placeholder="Boshlash"
                />
              </div>

              <div className="form-group full-width">
                <label>Ўзбекча (Кирилл) *</label>
                <textarea
                  required
                  rows="3"
                  value={formData.cr}
                  onChange={(e) =>
                    setFormData({ ...formData, cr: e.target.value })
                  }
                  placeholder="Бошлаш"
                />
              </div>

              <div className="form-group full-width">
                <label>Русский *</label>
                <textarea
                  required
                  rows="3"
                  value={formData.ru}
                  onChange={(e) =>
                    setFormData({ ...formData, ru: e.target.value })
                  }
                  placeholder="Начать"
                />
              </div>

              <div className="form-group full-width">
                <label>Izoh</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Bu tugma haqida qisqacha ma'lumot"
                />
              </div>
            </div>

            <button type="submit" className="btn-success">
              <Save size={18} />
              {editingKey ? "Yangilash" : "Qo'shish"}
            </button>
          </form>
        </div>
      )}

      <div className="translations-list">
        {data?.length === 0 ? (
          <div className="no-data">Tarjimalar topilmadi</div>
        ) : (
          data?.map((translation) => (
            <div key={translation.key} className="translation-card">
              <div className="translation-header">
                <div>
                  <h4>{translation.key}</h4>
                  <span className="category-badge">
                    {CATEGORIES.find((c) => c.value === translation.category)
                      ?.label || translation.category}
                  </span>
                </div>
                <div className="actions">
                  <button
                    className="btn-icon primary"
                    onClick={() => handleEdit(translation)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon danger"
                    onClick={() => handleDelete(translation.key)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {translation.description && (
                <p className="description">{translation.description}</p>
              )}

              <div className="translations-content">
                <div className="lang-item">
                  <strong>🇺🇿 UZ:</strong>
                  <span>{translation.uz}</span>
                </div>
                <div className="lang-item">
                  <strong>🇺🇿 ЎЗ:</strong>
                  <span>{translation.cr}</span>
                </div>
                <div className="lang-item">
                  <strong>🇷🇺 RU:</strong>
                  <span>{translation.ru}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Translations;
