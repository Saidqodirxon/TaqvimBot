import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { users } from "../api";
import {
  Search,
  Ban,
  CheckCircle,
  Shield,
  User,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../api";
import "./Users.css";

function Users() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [exportFilters, setExportFilters] = useState({});
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, searchQuery],
    queryFn: async () => {
      const response = await users.getAll(page, 20);
      return response.data;
    },
  });

  // Filter users based on search query
  const filteredUsers =
    data?.users?.filter((user) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const userId = user.userId?.toString() || "";
      const firstName = user.firstName?.toLowerCase() || "";
      const username = user.username?.toLowerCase() || "";
      const phone = user.phoneNumber || "";
      const location = user.location?.name?.toLowerCase() || "";

      return (
        userId.includes(query) ||
        firstName.includes(query) ||
        username.includes(query) ||
        phone.includes(query) ||
        location.includes(query)
      );
    }) || [];

  const blockMutation = useMutation({
    mutationFn: ({ userId, is_block }) => users.block(userId, is_block),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
    },
  });

  const adminMutation = useMutation({
    mutationFn: ({ userId, isAdmin, role }) =>
      users.makeAdmin(userId, isAdmin, role),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => users.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
    },
  });

  const handleBlock = (userId, currentlyBlocked) => {
    if (
      confirm(currentlyBlocked ? "Blokdan chiqarilsinmi?" : "Bloklansinmi?")
    ) {
      blockMutation.mutate({ userId, is_block: !currentlyBlocked });
    }
  };

  const handleMakeAdmin = (userId, currentlyAdmin) => {
    if (
      confirm(
        currentlyAdmin
          ? "Admin huquqini olib tashlansinmi?"
          : "Admin qilinsinmi?"
      )
    ) {
      adminMutation.mutate({
        userId,
        isAdmin: !currentlyAdmin,
        role: currentlyAdmin ? "user" : "admin",
      });
    }
  };

  const handleDelete = (userId, userName) => {
    if (
      confirm(
        `${userName} butunlay o'chirilsinmi?\n\n⚠️ Bu amalni bekor qilib bo'lmaydi!`
      )
    ) {
      deleteMutation.mutate(userId);
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/export/users`,
        {
          format: exportFormat,
          filters: exportFilters,
          fields: "all",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `users-${Date.now()}.${exportFormat === "csv" ? "csv" : "xlsx"}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      setExportModalOpen(false);
      alert("Foydalanuvchilar muvaffaqiyatli export qilindi!");
    } catch (error) {
      console.error("Export error:", error);
      alert("Export qilishda xatolik yuz berdi");
    }
  };

  const handleExportStats = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/export/stats`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `statistics-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert("Statistika muvaffaqiyatli export qilindi!");
    } catch (error) {
      console.error("Stats export error:", error);
      alert("Statistika export qilishda xatolik yuz berdi");
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
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>Foydalanuvchilar</h1>
          <p>Jami: {data?.pagination?.total || 0} ta</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExportStats}>
            <FileSpreadsheet size={20} />
            Statistika
          </button>
          <button
            className="btn-primary"
            onClick={() => setExportModalOpen(true)}
          >
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            className="input"
            placeholder="Ism, username yoki ID bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ism</th>
                <th>Username</th>
                <th>Telefon</th>
                <th>Joylashuv</th>
                <th>Til</th>
                <th>Holat</th>
                <th>Huquq</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    {searchQuery ? (
                      <div>
                        <Search
                          size={48}
                          style={{ opacity: 0.3, marginBottom: "10px" }}
                        />
                        <p style={{ opacity: 0.6 }}>Hech narsa topilmadi</p>
                      </div>
                    ) : (
                      <p style={{ opacity: 0.6 }}>Foydalanuvchilar yo'q</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.userId}>
                    <td>{user.userId}</td>
                    <td>
                      <div className="user-info">
                        <User size={16} />
                        {user.firstName}
                      </div>
                    </td>
                    <td>@{user.username || "-"}</td>
                    <td>
                      {user.phoneNumber ? (
                        <span className="badge badge-success">
                          📱 {user.phoneNumber}
                        </span>
                      ) : (
                        <span className="badge badge-secondary">-</span>
                      )}
                    </td>
                    <td>
                      {user.location?.name ? (
                        user.location.latitude && user.location.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${user.location.latitude},${user.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge badge-info"
                            style={{
                              cursor: "pointer",
                              textDecoration: "none",
                            }}
                          >
                            📍 {user.location.name}
                          </a>
                        ) : (
                          <span className="badge badge-info">
                            📍 {user.location.name}
                          </span>
                        )
                      ) : (
                        <span className="badge badge-secondary">-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {user.language === "uz"
                          ? "🇺🇿 UZ"
                          : user.language === "cr"
                            ? "🇺🇿 ЎЗ"
                            : "🇷🇺 RU"}
                      </span>
                    </td>
                    <td>
                      {user.is_block ? (
                        <span className="badge badge-danger">Bloklangan</span>
                      ) : (
                        <span className="badge badge-success">Faol</span>
                      )}
                    </td>
                    <td>
                      {user.isAdmin ? (
                        <span className="badge badge-warning">
                          <Shield size={12} /> Admin
                        </span>
                      ) : (
                        <span className="badge badge-info">User</span>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className={
                            user.is_block
                              ? "btn-icon success"
                              : "btn-icon danger"
                          }
                          onClick={() =>
                            handleBlock(user.userId, user.is_block)
                          }
                          title={
                            user.is_block ? "Blokdan chiqarish" : "Bloklash"
                          }
                        >
                          {user.is_block ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Ban size={16} />
                          )}
                        </button>

                        <button
                          className="btn-icon primary"
                          onClick={() =>
                            handleMakeAdmin(user.userId, user.isAdmin)
                          }
                          title={
                            user.isAdmin ? "Adminlikdan olish" : "Admin qilish"
                          }
                        >
                          <Shield size={16} />
                        </button>

                        <button
                          className="btn-icon danger"
                          onClick={() =>
                            handleDelete(
                              user.userId,
                              user.firstName || user.username || "User"
                            )
                          }
                          title="O'chirish"
                          disabled={deleteMutation.isPending}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && (
          <div className="pagination">
            <button
              className="btn btn-primary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Oldingi
            </button>
            <span>
              {page} / {data.pagination.pages}
            </span>
            <button
              className="btn btn-primary"
              disabled={page === data.pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Keyingi
            </button>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {exportModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setExportModalOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Foydalanuvchilarni Export Qilish</h2>
              <button
                className="close-btn"
                onClick={() => setExportModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="input"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Filterlar (ixtiyoriy)</label>
                <div className="filter-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={exportFilters.isActive === true}
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          isActive: e.target.checked ? true : undefined,
                        })
                      }
                    />
                    Faqat faol foydalanuvchilar
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={exportFilters.isAdmin === true}
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          isAdmin: e.target.checked ? true : undefined,
                        })
                      }
                    />
                    Faqat adminlar
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={exportFilters.isBlocked === true}
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          isBlocked: e.target.checked ? true : undefined,
                        })
                      }
                    />
                    Faqat bloklangan foydalanuvchilar
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Til</label>
                <select
                  value={exportFilters.language || ""}
                  onChange={(e) =>
                    setExportFilters({
                      ...exportFilters,
                      language: e.target.value || undefined,
                    })
                  }
                  className="input"
                >
                  <option value="">Barchasi</option>
                  <option value="uz">O'zbekcha (Lotin)</option>
                  <option value="cr">Ўзбекча (Кирилл)</option>
                  <option value="ru">Русский</option>
                </select>
              </div>

              <div className="form-group">
                <label>Sanadan</label>
                <input
                  type="date"
                  value={exportFilters.dateFrom || ""}
                  onChange={(e) =>
                    setExportFilters({
                      ...exportFilters,
                      dateFrom: e.target.value || undefined,
                    })
                  }
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Sanagacha</label>
                <input
                  type="date"
                  value={exportFilters.dateTo || ""}
                  onChange={(e) =>
                    setExportFilters({
                      ...exportFilters,
                      dateTo: e.target.value || undefined,
                    })
                  }
                  className="input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setExportModalOpen(false)}
              >
                Bekor qilish
              </button>
              <button className="btn-primary" onClick={handleExportUsers}>
                <Download size={20} />
                Export Qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
