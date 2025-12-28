import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  Info,
  Radio,
  Bell,
  BookOpen,
  Send,
  LogOut,
  Clock,
  Shield,
  MapPin,
} from "lucide-react";
import "./Layout.css";

function Layout({ children, setAuth }) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuth(false);
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🕌 Ramazon Bot</h2>
          <p>Admin Panel</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <Users size={20} />
            <span>Foydalanuvchilar</span>
          </NavLink>

          <NavLink
            to="/greetings"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <MessageSquare size={20} />
            <span>Tabriklar</span>
          </NavLink>

          <NavLink
            to="/prayers"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <BookOpen size={20} />
            <span>Duolar</span>
          </NavLink>

          <NavLink
            to="/prayer-defaults"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <Clock size={20} />
            <span>Namoz Sozlamalari</span>
          </NavLink>

          <NavLink
            to="/bot-info"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <Info size={20} />
            <span>Bot Ma'lumotlari</span>
          </NavLink>

          <NavLink
            to="/channels"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <Radio size={20} />
            <span>Kanallar</span>
          </NavLink>

          <NavLink
            to="/admins"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <Shield size={20} />
            <span>Adminlar</span>
          </NavLink>

          <NavLink
            to="/locations"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <MapPin size={20} />
            <span>Joylashuvlar</span>
          </NavLink>

          <NavLink
            to="/broadcast"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <Send size={20} />
            <span>Xabar Yuborish</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <Bell size={20} />
            <span>Eslatmalar</span>
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Chiqish</span>
        </button>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}

export default Layout;
