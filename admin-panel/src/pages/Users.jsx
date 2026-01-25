import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { users } from "../api";
import { Search, Ban, CheckCircle, Shield, User } from "lucide-react";
import "./Users.css";

function Users() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: async () => {
      const response = await users.getAll(page, 20);
      return response.data;
    },
  });

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
              {data?.users?.map((user) => (
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
                      <span className="badge badge-success">📱 {user.phoneNumber}</span>
                    ) : (
                      <span className="badge badge-secondary">-</span>
                    )}
                  </td>
                  <td>
                    {user.location?.name ? (
                      <span className="badge badge-info">📍 {user.location.name}</span>
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
                          user.is_block ? "btn-icon success" : "btn-icon danger"
                        }
                        onClick={() => handleBlock(user.userId, user.is_block)}
                        title={user.is_block ? "Blokdan chiqarish" : "Bloklash"}
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
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}

export default Users;
