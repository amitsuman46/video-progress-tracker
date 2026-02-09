import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type CourseDetail, type SectionSummary, type CourseProgressMap } from "../api";

export default function Course() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<CourseProgressMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      api<CourseDetail>(`/api/courses/${courseId}`),
      api<CourseProgressMap>(`/api/courses/${courseId}/progress`),
    ])
      .then(([c, p]) => {
        setCourse(c);
        setProgress(p);
        if (c.sections.length > 0 && !openSectionId) {
          setOpenSectionId(c.sections[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;
  if (!course) return null;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>{course.title}</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {course.sections.map((section) => (
          <SectionAccordion
            key={section.id}
            section={section}
            courseId={courseId!}
            progress={progress}
            isOpen={openSectionId === section.id}
            onToggle={() =>
              setOpenSectionId((id) => (id === section.id ? null : section.id))
            }
          />
        ))}
      </div>
    </div>
  );
}

function SectionAccordion({
  section,
  courseId,
  progress,
  isOpen,
  onToggle,
}: {
  section: SectionSummary;
  courseId: string;
  progress: CourseProgressMap | null;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const videoCount = section.subsections.reduce((n, ss) => n + ss.videos.length, 0);
  const completedCount = section.subsections.reduce(
    (n, ss) => n + ss.videos.filter((v) => progress?.[v.id]?.completed).length,
    0
  );
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          color: "#e4e4e7",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{section.title}</span>
        <span style={{ color: "#71717a", fontSize: "0.875rem", fontWeight: 400 }}>
          {completedCount}/{videoCount} complete
        </span>
        <span style={{ marginLeft: "0.5rem", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div style={{ borderTop: "1px solid #27272a", padding: "0.75rem 1.25rem 1rem" }}>
          {section.subsections.map((sub) => (
            <div key={sub.id} style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "0.95rem", color: "#a1a1aa", marginBottom: "0.5rem" }}>
                {sub.title}
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {sub.videos.map((v) => {
                  const p = progress?.[v.id];
                  const pct =
                    v.durationSeconds != null && p
                      ? Math.min(100, Math.round((p.progressSeconds / v.durationSeconds) * 100))
                      : 0;
                  return (
                    <li key={v.id} style={{ marginBottom: "0.5rem" }}>
                      <Link
                        to={`/courses/${courseId}/videos/${v.id}`}
                        style={{
                          color: "#a78bfa",
                          display: "block",
                          padding: "0.35rem 0",
                          fontSize: "0.9rem",
                        }}
                      >
                        {p?.completed && "✓ "}
                        {v.title}
                        {v.durationSeconds != null && (
                          <span style={{ color: "#71717a", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                            {formatDuration(v.durationSeconds)}
                          </span>
                        )}
                      </Link>
                      {!p?.completed && (p?.progressSeconds ?? 0) > 0 && (
                        <div style={{ height: "3px", background: "#27272a", borderRadius: "2px", overflow: "hidden", marginTop: "0.2rem" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#7c3aed", borderRadius: "2px" }} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
