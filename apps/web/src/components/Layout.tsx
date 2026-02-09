import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #27272a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#18181b",
        }}
      >
        <Link to="/" style={{ fontWeight: 600, color: "#e4e4e7", textDecoration: "none" }}>
          Video Progress Tracker
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#a1a1aa" }}>
            {user?.email ?? user?.uid}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "0.35rem 0.75rem",
              background: "#27272a",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              color: "#e4e4e7",
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: "1.5rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
