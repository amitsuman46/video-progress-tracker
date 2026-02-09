import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type CourseDetail, type StreamUrlResponse, type CourseProgressMap } from "../api";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const PROGRESS_SAVE_INTERVAL_MS = 5000;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPage() {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<CourseProgressMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [openSidebarSectionIds, setOpenSidebarSectionIds] = useState<Set<string>>(new Set());
  const [videoReady, setVideoReady] = useState(false);
  const lastSavedRef = useRef(0);

  // Load course tree (for sidebar) and progress
  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      api<CourseDetail>(`/api/courses/${courseId}`),
      api<CourseProgressMap>(`/api/courses/${courseId}/progress`),
    ])
      .then(([c, p]) => {
        setCourse(c);
        setProgress(p);
        if (videoId && c) {
          const sectionWithVideo = c.sections.find((s) =>
            s.subsections.some((ss) => ss.videos.some((v) => v.id === videoId))
          );
          if (sectionWithVideo) {
            setOpenSidebarSectionIds((prev) => new Set(prev).add(sectionWithVideo.id));
          }
        }
      })
      .catch((e) => setError(e.message));
  }, [courseId]);

  // Load stream URL and resume position for this video
  useEffect(() => {
    if (!courseId || !videoId) return;
    setVideoReady(false);
    setLoading(true);
    api<StreamUrlResponse>(`/api/courses/${courseId}/videos/${videoId}/stream-url`)
      .then((r) => {
        const url = r.url;
        setStreamUrl(url.startsWith("/") && API_BASE ? `${API_BASE}${url}` : url);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, videoId]);

  // Keep the section containing the current video expanded when switching videos
  useEffect(() => {
    if (!course || !videoId) return;
    const sectionWithVideo = course.sections.find((s) =>
      s.subsections.some((ss) => ss.videos.some((v) => v.id === videoId))
    );
    if (sectionWithVideo && !openSidebarSectionIds.has(sectionWithVideo.id)) {
      setOpenSidebarSectionIds((prev) => new Set(prev).add(sectionWithVideo.id));
    }
  }, [course, videoId]);

  // Resume from saved position: seek once the video can play (so the seek isn't lost)
  const resumeAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!progress || !videoId) return;
    const p = progress[videoId];
    if (p && p.progressSeconds > 0) {
      resumeAtRef.current = p.progressSeconds;
    } else {
      resumeAtRef.current = null;
    }
  }, [progress, videoId]);

  const handleVideoCanPlay = () => {
    setVideoReady(true);
    if (videoRef.current && resumeAtRef.current != null) {
      const seekTo = resumeAtRef.current;
      resumeAtRef.current = null; // only resume once
      if (seekTo > 0) {
        videoRef.current.currentTime = seekTo;
        setCurrentTime(seekTo);
      }
    }
  };

  // Save progress periodically and on pause/leave (run when video element is ready)
  useEffect(() => {
    if (!videoId || !videoReady || !videoRef.current) return;
    const video = videoRef.current;

    const save = () => {
      if (!videoRef.current) return;
      const currentTime = Math.floor(videoRef.current.currentTime);
      const duration = videoRef.current.duration;
      const completed = Number.isFinite(duration) && currentTime >= Math.max(0, duration - 5);
      if (Date.now() - lastSavedRef.current < PROGRESS_SAVE_INTERVAL_MS && !completed) return;
      lastSavedRef.current = Date.now();
      api("/api/progress", {
        method: "POST",
        body: JSON.stringify({
          videoId,
          progressSeconds: currentTime,
          completed,
        }),
      }).catch(console.error);
    };

    const onTimeUpdate = () => save();
    const onPause = () => save();
    const onBeforeUnload = () => save();

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);
    window.addEventListener("beforeunload", onBeforeUnload);

    const interval = setInterval(save, PROGRESS_SAVE_INTERVAL_MS);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", onPause);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearInterval(interval);
    };
  }, [videoId, videoReady]);

  const currentVideo = course?.sections
    .flatMap((s) => s.subsections)
    .flatMap((ss) => ss.videos)
    .find((v) => v.id === videoId);

  const currentProgress = videoId ? progress?.[videoId] : null;
  const isCompleted = Boolean(currentProgress?.completed);
  const percent =
    duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : currentProgress && currentVideo?.durationSeconds
      ? Math.min(100, Math.round((currentProgress.progressSeconds / (currentVideo!.durationSeconds ?? 1)) * 100))
      : 0;

  const refreshProgress = () => {
    if (!courseId) return;
    api<CourseProgressMap>(`/api/courses/${courseId}/progress`)
      .then(setProgress)
      .catch(console.error);
  };

  async function handleMarkComplete() {
    if (!videoId || !videoRef.current) return;
    setMarkingComplete(true);
    try {
      await api("/api/progress", {
        method: "POST",
        body: JSON.stringify({
          videoId,
          progressSeconds: Math.floor(videoRef.current.currentTime),
          completed: true,
        }),
      });
      refreshProgress();
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingComplete(false);
    }
  }

  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;
  if (loading && !streamUrl) return <p>Loading video…</p>;

  return (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 640px", minWidth: 0 }}>
        <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000", borderRadius: "8px", overflow: "hidden" }}>
          {streamUrl ? (
            <video
              ref={videoRef}
              src={streamUrl}
              controls
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              crossOrigin="anonymous"
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
              onCanPlay={handleVideoCanPlay}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a" }}>
              No stream URL
            </div>
          )}
        </div>

        {/* Progress bar and Mark complete */}
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1", minWidth: "120px" }}>
              <div style={{ height: "6px", background: "#27272a", borderRadius: "3px", overflow: "hidden", marginBottom: "0.25rem" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${percent}%`,
                    background: isCompleted ? "#22c55e" : "#7c3aed",
                    borderRadius: "3px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: "0.8rem", color: "#71717a" }}>
                {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : "—"} · {percent}%
              </span>
            </div>
            {!isCompleted && (
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={markingComplete}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: "#22c55e",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {markingComplete ? "…" : "Mark as complete"}
              </button>
            )}
            {isCompleted && (
              <span style={{ fontSize: "0.875rem", color: "#22c55e", fontWeight: 500 }}>✓ Completed</span>
            )}
          </div>
        </div>

        <h2 style={{ marginTop: "1rem" }}>{currentVideo?.title ?? "Video"}</h2>
        <Link to={`/courses/${courseId}`} style={{ display: "inline-block", marginTop: "0.5rem" }}>
          ← Back to course
        </Link>
      </div>
      <aside
        style={{
          width: "280px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 8rem)",
          minHeight: 0,
        }}
      >
        <h3 style={{ fontSize: "0.9rem", color: "#a1a1aa", marginBottom: "0.75rem", flexShrink: 0 }}>
          Videos
        </h3>
        <div
          style={{
            overflowY: "auto",
            overflowX: "hidden",
            flex: "1 1 0",
            minHeight: 0,
            paddingRight: "0.25rem",
          }}
        >
          {course?.sections.map((section) => {
            const isOpen = openSidebarSectionIds.has(section.id);
            const videoCount = section.subsections.reduce((n, ss) => n + ss.videos.length, 0);
            return (
              <div
                key={section.id}
                style={{
                  border: "1px solid #27272a",
                  borderRadius: "6px",
                  marginBottom: "0.5rem",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenSidebarSectionIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#18181b",
                    border: "none",
                    color: "#e4e4e7",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {section.title}
                  </span>
                  <span style={{ flexShrink: 0, marginLeft: "0.5rem", color: "#71717a", fontSize: "0.75rem" }}>
                    {videoCount}
                  </span>
                  <span style={{ flexShrink: 0, marginLeft: "0.25rem", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: "1px solid #27272a", padding: "0.5rem 0.75rem" }}>
                    {section.subsections.map((sub) =>
                      sub.videos.map((v) => {
                        const p = progress?.[v.id];
                        const pct =
                          v.durationSeconds != null && p
                            ? Math.min(100, Math.round((p.progressSeconds / v.durationSeconds) * 100))
                            : 0;
                        return (
                          <div key={v.id} style={{ marginBottom: "0.5rem" }}>
                            <Link
                              to={`/courses/${courseId}/videos/${v.id}`}
                              style={{
                                display: "block",
                                padding: "0.4rem 0",
                                fontSize: "0.9rem",
                                color: v.id === videoId ? "#a78bfa" : "#e4e4e7",
                                fontWeight: v.id === videoId ? 600 : 400,
                              }}
                            >
                              {p?.completed ? "✓ " : ""}
                              {v.title}
                            </Link>
                            {!p?.completed && (p?.progressSeconds ?? 0) > 0 && (
                              <div style={{ height: "3px", background: "#27272a", borderRadius: "2px", overflow: "hidden", marginTop: "0.2rem" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: "#7c3aed", borderRadius: "2px" }} />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
