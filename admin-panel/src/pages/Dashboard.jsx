import { useQuery } from "@tanstack/react-query";
import { stats } from "../api";
import {
  Users,
  UserCheck,
  UserX,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import "./Dashboard.css";

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await stats.getDashboard();
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Jami Foydalanuvchilar",
      value: data?.users?.total || 0,
      icon: <Users size={24} />,
      color: "#5b7cfa",
      bg: "#e3f2fd",
    },
    {
      title: "Faol Foydalanuvchilar",
      value: data?.users?.active || 0,
      icon: <UserCheck size={24} />,
      color: "#4caf50",
      bg: "#e8f5e9",
    },
    {
      title: "Bugun Aktiv",
      value: data?.users?.activeToday || 0,
      icon: <TrendingUp size={24} />,
      color: "#2196f3",
      bg: "#e1f5fe",
    },
    {
      title: "7 Kun Aktiv",
      value: data?.users?.activeLast7d || 0,
      icon: <Users size={24} />,
      color: "#9c27b0",
      bg: "#f3e5f5",
    },
    {
      title: "Yangi (Bugun)",
      value: data?.users?.newUsersToday || 0,
      icon: <TrendingUp size={24} />,
      color: "#ff9800",
      bg: "#fff3e0",
    },
    {
      title: "Yangi (7 kun)",
      value: data?.users?.newUsersLast7d || 0,
      icon: <TrendingUp size={24} />,
      color: "#ff5722",
      bg: "#fbe9e7",
    },
    {
      title: "Bloklangan",
      value: data?.users?.blocked || 0,
      icon: <UserX size={24} />,
      color: "#f44336",
      bg: "#ffebee",
    },
    {
      title: "Nofaol (Botni to'xtatgan)",
      value: data?.users?.inactive || 0,
      icon: <UserX size={24} />,
      color: "#9e9e9e",
      bg: "#f5f5f5",
    },
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Bot statistikasi va ma'lumotlar</p>
      </div>

      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="stat-card"
            style={{ borderLeftColor: stat.color }}
          >
            <div
              className="stat-icon"
              style={{ background: stat.bg, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="stat-info">
              <p className="stat-label">{stat.title}</p>
              <h2 className="stat-value">{stat.value.toLocaleString()}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-row">
        <div className="card">
          <h3>Tillar bo'yicha</h3>
          <div className="lang-stats">
            <div className="lang-item">
              <span className="lang-label">🇺🇿 O'zbekcha (Lotin)</span>
              <span className="lang-value">{data?.languages?.uz || 0}</span>
            </div>
            <div className="lang-item">
              <span className="lang-label">🇺🇿 Ўзбекча (Кирилл)</span>
              <span className="lang-value">{data?.languages?.cr || 0}</span>
            </div>
            <div className="lang-item">
              <span className="lang-label">🇷🇺 Русский</span>
              <span className="lang-value">{data?.languages?.ru || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Tabriklar</h3>
          <div className="greetings-stats">
            <div className="greeting-item">
              <MessageSquare size={20} color="#ff9800" />
              <div>
                <p className="greeting-label">Kutilmoqda</p>
                <p className="greeting-value">
                  {data?.greetings?.pending || 0}
                </p>
              </div>
            </div>
            <div className="greeting-item">
              <MessageSquare size={20} color="#4caf50" />
              <div>
                <p className="greeting-label">Tasdiqlangan</p>
                <p className="greeting-value">
                  {data?.greetings?.approved || 0}
                </p>
              </div>
            </div>
            <div className="greeting-item">
              <MessageSquare size={20} color="#f44336" />
              <div>
                <p className="greeting-label">Rad etilgan</p>
                <p className="greeting-value">
                  {data?.greetings?.rejected || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
