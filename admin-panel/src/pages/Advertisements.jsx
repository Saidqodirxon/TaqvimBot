import { useState, useEffect } from "react";
import { advertisements, locations } from "../api"; // Assuming locations API exists
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";

function Advertisements() {
  const [ads, setAds] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [regionOptions, setRegionOptions] = useState([]); // For location dropdown

  const [formData, setFormData] = useState({
    title: "",
    type: "notification", // notification, menu
    content: "",
    image: "",
    targetRegion: "", // name of region
    isActive: true,
  });

  useEffect(() => {
    fetchAds();
    fetchLocations();
  }, []);

  const fetchAds = async (page = 1) => {
    try {
      setLoading(true);
      const res = await advertisements.getAll(page);
      setAds(res.data.ads);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await locations.getAll();
      // Extract unique region names if available, or just city names
      // Assuming location structure has name or region
      if (res.data) {
        const locs = res.data.map(l => l.name); // Using city name as region target for now
        setRegionOptions(locs);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.targetRegion === "") payload.targetRegion = null;

      if (editingAd) {
        await advertisements.update(editingAd._id, payload);
      } else {
        await advertisements.create(payload);
      }

      closeModal();
      fetchAds(pagination.page);
    } catch (error) {
      console.error("Error saving ad:", error);
      alert("Xatolik yuz berdi");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await advertisements.delete(id);
      fetchAds(pagination.page);
    } catch (error) {
      console.error("Error deleting ad:", error);
    }
  };

  const openModal = (ad = null) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        title: ad.title,
        type: ad.type,
        content: ad.content,
        image: ad.image || "",
        targetRegion: ad.targetRegion || "",
        isActive: ad.isActive,
      });
    } else {
      setEditingAd(null);
      setFormData({
        title: "",
        type: "notification",
        content: "",
        image: "",
        targetRegion: "",
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAd(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <Megaphone className="icon" /> Reklamalar
        </h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Yangi reklama
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner">Yuklanmoqda...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Sarlavha</th>
                  <th>Tur</th>
                  <th>Rasm</th>
                  <th>Hudud</th>
                  <th>Ko'rishlar</th>
                  <th>Holat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {ads.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">
                      Reklamalar yo'q
                    </td>
                  </tr>
                ) : (
                  ads.map((ad) => (
                    <tr key={ad._id}>
                      <td>
                        <strong>{ad.title}</strong>
                        <div className="text-muted small text-truncate" style={{ maxWidth: "200px" }}>
                          {ad.content}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ad.type === "menu" ? "badge-info" : "badge-primary"}`}>
                          {ad.type === "menu" ? "Menyu" : "Eslatma"}
                        </span>
                      </td>
                      <td>
                        {ad.image ? (
                          <a href={ad.image} target="_blank" rel="noopener noreferrer">
                            <ImageIcon size={18} />
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{ad.targetRegion || "Barchaga"}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <Eye size={14} /> {ad.views}
                        </div>
                      </td>
                      <td>
                        {ad.isActive ? (
                          <span className="badge badge-success">Faol</span>
                        ) : (
                          <span className="badge badge-danger">Nofaol</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-icon text-primary"
                          onClick={() => openModal(ad)}
                          title="Tahrirlash"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="btn-icon text-danger"
                          onClick={() => handleDelete(ad._id)}
                          title="O'chirish"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination logic here if needed */}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingAd ? "Reklamani tahrirlash" : "Yangi reklama"}</h3>
              <button className="btn-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Sarlavha</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tur</label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                  >
                    <option value="notification">Eslatma ostida</option>
                    <option value="menu">Menyu (Rasm bilan)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Matn</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Rasm URL (ixtiyoriy)</label>
                  <input
                    type="url"
                    className="form-control"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label>Hudud (bo'sh qolsa barchaga)</label>
                  <select
                    className="form-control"
                    value={formData.targetRegion}
                    onChange={(e) =>
                      setFormData({ ...formData, targetRegion: e.target.value })
                    }
                  >
                    <option value="">Barchaga</option>
                    {regionOptions.map((region, idx) => (
                      <option key={idx} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                <div className="form-check">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                  <label htmlFor="isActive">Faol</label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Advertisements;
