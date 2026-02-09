import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  type CourseSummary,
  type MeResponse,
  type AdminSyncResponse,
} from "../api";

export default function Courses() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [syncFolderId, setSyncFolderId] = useState("");
  const [syncTitle, setSyncTitle] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const loadCourses = () => {
    api<CourseSummary[]>("/api/courses")
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourses();
    api<MeResponse>("/api/me").then(setMe).catch(() => setMe(null));
  }, []);

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    if (!syncFolderId.trim()) return;
    setSyncing(true);
    setSyncError("");
    try {
      await api<AdminSyncResponse>("/api/admin/sync", {
        method: "POST",
        body: JSON.stringify({
          driveFolderId: syncFolderId.trim(),
          courseTitle: syncTitle.trim() || undefined,
        }),
      });
      setSyncFolderId("");
      setSyncTitle("");
      loadCourses();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <p>Loading courses…</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Courses</h1>

      {me?.isAdmin && (
        <details
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "8px",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Admin: Sync course from Google Drive
          </summary>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.9rem", color: "#a1a1aa" }}>
            Paste the Drive folder ID of your course root (e.g. the folder that contains section
            folders). Get it from the folder URL: drive.google.com/.../folders/<strong>FOLDER_ID</strong>
          </p>
          <form onSubmit={handleSync} style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end" }}>
            <input
              type="text"
              placeholder="Drive folder ID"
              value={syncFolderId}
              onChange={(e) => setSyncFolderId(e.target.value)}
              required
              style={{
                padding: "0.5rem 0.75rem",
                background: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                color: "#e4e4e7",
                minWidth: "280px",
              }}
            />
            <input
              type="text"
              placeholder="Course title (optional)"
              value={syncTitle}
              onChange={(e) => setSyncTitle(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                background: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                color: "#e4e4e7",
                minWidth: "200px",
              }}
            />
            <button
              type="submit"
              disabled={syncing}
              style={{
                padding: "0.5rem 1rem",
                background: "#7c3aed",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                fontWeight: 500,
              }}
            >
              {syncing ? "Syncing…" : "Sync"}
            </button>
          </form>
          {syncError && (
            <p style={{ marginTop: "0.5rem", color: "#f87171", fontSize: "0.875rem" }}>
              {syncError}
            </p>
          )}
        </details>
      )}

      {courses.length === 0 ? (
        <p style={{ color: "#a1a1aa" }}>
          No courses yet.
          {me?.isAdmin
            ? " Use “Admin: Sync course from Google Drive” above and paste your Drive folder ID."
            : " Ask an admin to sync a course from Google Drive."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {courses.map((c) => (
            <li key={c.id}>
              <Link
                to={`/courses/${c.id}`}
                style={{
                  display: "block",
                  padding: "1rem 1.25rem",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  color: "#e4e4e7",
                }}
              >
                <strong>{c.title}</strong>
                <span style={{ marginLeft: "0.5rem", color: "#71717a", fontSize: "0.875rem" }}>
                  {c.sectionCount} section{c.sectionCount !== 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
