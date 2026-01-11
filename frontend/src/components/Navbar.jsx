import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Navbar({ active }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPhotographer, setIsPhotographer] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [Open, setOpen] = useState(false);

  const fetchRole = async () => {
    try {
      const res = await api.get("/accounts/role/");
      setIsAdmin(res.data.roles?.includes("Admin"));
      setIsPhotographer(res.data.roles?.includes("Photographer"));
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const resp = await api.get("notifications/");
      setNotifications(resp.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchRole();
    fetchNotifications();

    const token = localStorage.getItem("access");
    let socket;
    if (token) {
      socket = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/?token=${token}`);
      socket.onopen = () => console.log(" Notifications WS connected");
      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setNotifications((prev) => [data, ...prev]);
        } catch (err) {
          console.error("Invalid notification message", err);
        }
      };
      socket.onerror = (err) => console.error("Notifications WS error", err);
      socket.onclose = () => console.log(" Notifications WS closed");
    }

    return () => {
      if (socket) socket.close();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const toggleNotif = async () => {
    const next = !Open;
    setOpen(next);
    if (next && unreadCount > 0) {
      try {
        await api.post("notifications/mark_all_read/");
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch (err) {
        console.error("Failed to mark all read", err);
      }
    }
  };

  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (Open && !e.target.closest("[aria-label='Notifications']")) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [Open]);

  const markRead = async (id) => {
    try {
      await api.post(`notifications/${id}/mark_read/`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1 className="navbar-logo">Smart Event Photos</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <button onClick={toggleNotif} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} aria-label="Notifications">
              <span style={{ fontSize: 18 }}>🔔</span>
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "#ff4444",
                  color: "white",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: "bold",
                }}>{unreadCount}</span>
              )}
            </button>

            {Open && (
              <div style={{ position: "absolute", right: 0, top: 28, width: 360, maxHeight: 420, overflow: "auto", background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: 6, zIndex: 1000 }}>
                <div style={{ padding: 8, borderBottom: "1px solid #eee", fontWeight: 600 }}>Notifications</div>
                {notifications.length === 0 && <div style={{ padding: 12 }}>No notifications</div>}
                {notifications.map((n) => (
                  <div key={n.id} style={{ padding: 10, borderBottom: "1px solid #f5f5f5", background: n.is_read ? "#fff" : "#f8f9fb", cursor: "pointer" }} onClick={() => markRead(n.id)}>
                    <div style={{ fontSize: 14, color: "#111", fontWeight: n.is_read ? "normal" : "bold" }}>{n.message}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="navbar-links">
            <button className={`navbar-btn ${active === "gallery" ? "active" : ""}`} onClick={() => navigate("/gallery")}>
              Gallery
            </button>
            {(isAdmin || isPhotographer) && (
              <button className={`navbar-btn ${active === "upload" ? "active" : ""}`} onClick={() => navigate("/upload")}>
                Photographer Dashboard
              </button>
            )}
            <button className={`navbar-btn ${active === "profile" ? "active" : ""}`} onClick={() => navigate("/profile")}>
              Profile
            </button>
            <button className="navbar-btn logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
