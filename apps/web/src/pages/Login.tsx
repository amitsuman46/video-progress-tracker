import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

const disableSignUp = import.meta.env.VITE_DISABLE_SIGNUP === "true";
const disableGoogleLogin = import.meta.env.VITE_DISABLE_GOOGLE_LOGIN === "true";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code === "auth/user-not-found"
          ? "No account found. Sign up with the same email/password."
          : String(err)
        : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setError("");
    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f12",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "2rem",
          background: "#18181b",
          borderRadius: "12px",
          border: "1px solid #27272a",
        }}
      >
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem" }}>Sign in</h1>
        {error && (
          <p style={{ color: "#f87171", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              marginBottom: "0.75rem",
              background: "#27272a",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              color: "#e4e4e7",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              marginBottom: "1rem",
              background: "#27272a",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              color: "#e4e4e7",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "0.6rem",
                background: "#7c3aed",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
              }}
            >
              {loading ? "…" : "Log in"}
            </button>
            {!disableSignUp && (
              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                style={{
                  padding: "0.6rem 1rem",
                  background: "#27272a",
                  border: "1px solid #3f3f46",
                  borderRadius: "6px",
                  color: "#e4e4e7",
                }}
              >
                Sign up
              </button>
            )}
          </div>
        </form>
        {!disableGoogleLogin && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                color: "#a78bfa",
              }}
            >
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
