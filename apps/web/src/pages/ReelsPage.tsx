import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  getStreamUrl,
  type CourseChunkProgressMap,
  type CourseDetail,
} from "../api";
import { sortByTitleNumber } from "../utils/sortByTitleNumber";

const CHUNK_SECONDS = 120;
const SPEED_STORAGE_KEY = "vpt:reelsPlaybackRate";
const DEFAULT_SPEED = 1.5;
const SPEED_OPTIONS = [1, 1.25, 1.5, 2] as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getStoredSpeed(): number {
  const raw = localStorage.getItem(SPEED_STORAGE_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : DEFAULT_SPEED;
}

function setStoredSpeed(speed: number) {
  localStorage.setItem(SPEED_STORAGE_KEY, String(speed));
}

function getNextUncompletedChunkIndex(progress: CourseChunkProgressMap, videoId: string): number {
  // Use "contiguous completion" from chunk 0..k to decide resume point.
  // This avoids skipping to the end if user watched chunk 10 but not chunk 2.
  const completed = new Set<number>();
  const prefix = `${videoId}:`;
  Object.entries(progress).forEach(([key, value]) => {
    if (!key.startsWith(prefix)) return;
    if (!value?.completed) return;
    const idxStr = key.slice(prefix.length);
    const idx = Number(idxStr);
    if (Number.isInteger(idx) && idx >= 0) completed.add(idx);
  });
  let i = 0;
  while (completed.has(i)) i += 1;
  return i;
}

export default function ReelsPage() {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [chunkProgress, setChunkProgress] = useState<CourseChunkProgressMap>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState<number>(() => getStoredSpeed());
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!courseId || !videoId) return;
    setLoading(true);
    setError("");
    setMediaDuration(null);
    Promise.all([
      api<CourseDetail>(`/api/courses/${courseId}`),
      api<CourseChunkProgressMap>(`/api/courses/${courseId}/chunk-progress`),
      getStreamUrl(`/api/courses/${courseId}/videos/${videoId}/stream-url`),
    ])
      .then(([c, cp, url]) => {
        setCourse(c);
        const nextChunk = cp && videoId ? getNextUncompletedChunkIndex(cp, videoId) : 0;
        setChunkProgress(cp ?? {});
        setStreamUrl(url);
        setActiveIndex(nextChunk);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, videoId]);

  const currentVideo = useMemo(() => {
    if (!course || !videoId) return null;
    return course.sections
      .flatMap((s) => s.subsections)
      .flatMap((ss) => ss.videos)
      .find((v) => v.id === videoId) ?? null;
  }, [course, videoId]);

  const effectiveDurationSeconds = useMemo(() => {
    const fromDb = currentVideo?.durationSeconds ?? null;
    if (fromDb != null && fromDb > 0) return fromDb;
    return mediaDuration != null && mediaDuration > 0 ? Math.floor(mediaDuration) : null;
  }, [currentVideo, mediaDuration]);

  const totalChunks = useMemo(() => {
    const duration = effectiveDurationSeconds;
    if (duration == null || duration <= 0) return 0;
    return Math.max(1, Math.ceil(duration / CHUNK_SECONDS));
  }, [effectiveDurationSeconds]);

  const chunkStart = useMemo(() => activeIndex * CHUNK_SECONDS, [activeIndex]);
  const chunkEnd = useMemo(
    () => Math.min((activeIndex + 1) * CHUNK_SECONDS, effectiveDurationSeconds ?? Infinity),
    [activeIndex, effectiveDurationSeconds]
  );

  const keyFor = (idx: number) => `${videoId}:${idx}`;
  const isChunkCompleted = (idx: number) => Boolean(chunkProgress[keyFor(idx)]?.completed);

  const refreshChunkProgress = () => {
    if (!courseId) return;
    api<CourseChunkProgressMap>(`/api/courses/${courseId}/chunk-progress`)
      .then((cp) => setChunkProgress(cp ?? {}))
      .catch(console.error);
  };

  const markChunkCompleted = async (idx: number) => {
    if (!videoId) return;
    try {
      await api("/api/chunk-progress", {
        method: "POST",
        body: JSON.stringify({ videoId, chunkIndex: idx, completed: true }),
      });
      setChunkProgress((prev) => ({
        ...prev,
        [keyFor(idx)]: { completed: true, updatedAt: new Date().toISOString() },
      }));
    } catch (e) {
      console.error(e);
    }
  };

  // Seek active video to chunk start when it becomes active or when streamUrl changes
  useEffect(() => {
    const v = activeVideoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.playbackRate = speed;
    // Seek to chunk start; keep within video bounds
    const t = clamp(chunkStart, 0, Math.max(0, (effectiveDurationSeconds ?? v.duration) - 0.01));
    if (Math.abs(v.currentTime - t) > 0.5) v.currentTime = t;
  }, [chunkStart, streamUrl, speed, effectiveDurationSeconds]);

  // Scroll-snap tracking: set active index based on scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (!el || totalChunks <= 0) return;
    const onScroll = () => {
      const h = el.clientHeight || 1;
      const idx = Math.round(el.scrollTop / h);
      setActiveIndex(clamp(idx, 0, totalChunks - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    return () => el.removeEventListener("scroll", onScroll as any);
  }, [totalChunks]);

  const scrollToIndex = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight || 1;
    el.scrollTo({ top: idx * h, behavior: "smooth" });
  };

  // Once we know how many chunks exist, snap/scroll to the current active chunk (resume).
  useEffect(() => {
    if (totalChunks <= 0) return;
    const idx = clamp(activeIndex, 0, totalChunks - 1);
    // Use instant scroll so it doesn't feel like it "animates away" on load.
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight || 1;
    el.scrollTo({ top: idx * h, behavior: "auto" });
    if (idx !== activeIndex) setActiveIndex(idx);
  }, [totalChunks]);

  const handleEnded = async () => {
    if (totalChunks <= 0) return;
    const idx = activeIndex;
    if (!isChunkCompleted(idx)) await markChunkCompleted(idx);
    const next = idx + 1;
    if (next < totalChunks) scrollToIndex(next);
    else refreshChunkProgress();
  };

  if (loading) return <p>Loading reels…</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;
  if (!courseId || !videoId) return null;
  if (!currentVideo) return <p style={{ color: "#f87171" }}>Video not found</p>;
  if (!streamUrl) return <p style={{ color: "#71717a" }}>No stream URL</p>;

  // Minimal header area; main feed is scroll-snapped
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Reels · {currentVideo.title}
          </h2>
          <div style={{ marginTop: "0.25rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link to={`/courses/${courseId}/videos/${videoId}`}>← Back to video</Link>
            <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
              Chunk {activeIndex + 1}/{Math.max(1, totalChunks)} · {Math.floor(chunkStart / 60)}:{String(chunkStart % 60).padStart(2, "0")}–{Math.floor(chunkEnd / 60)}:{String(Math.floor(chunkEnd % 60)).padStart(2, "0")}
            </span>
            <span style={{ color: isChunkCompleted(activeIndex) ? "#22c55e" : "#a1a1aa", fontSize: "0.85rem", fontWeight: 600 }}>
              {isChunkCompleted(activeIndex) ? "✓ Completed" : "Not completed"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>Speed</span>
          <select
            value={speed}
            onChange={(e) => {
              const next = Number(e.target.value);
              setSpeed(next);
              setStoredSpeed(next);
              if (activeVideoRef.current) activeVideoRef.current.playbackRate = next;
            }}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#e4e4e7",
              padding: "0.35rem 0.5rem",
            }}
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          height: "calc(100vh - 210px)",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          borderRadius: "12px",
          border: "1px solid #27272a",
          background: "#0f0f12",
        }}
      >
        {Array.from({ length: Math.max(1, totalChunks) }).map((_, idx) => {
            const completed = isChunkCompleted(idx);
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                style={{
                  height: "calc(100vh - 210px)",
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "0.75rem",
                  borderBottom: idx < Math.max(1, totalChunks) - 1 ? "1px solid #27272a" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <div style={{ color: "#a1a1aa", fontSize: "0.9rem", fontWeight: 600 }}>
                    Chunk {idx + 1}{totalChunks > 0 ? ` / ${totalChunks}` : ""}
                  </div>
                  <div style={{ color: completed ? "#22c55e" : "#71717a", fontSize: "0.85rem", fontWeight: 600 }}>
                    {completed ? "✓" : ""}
                  </div>
                </div>

                <div style={{ position: "relative", flex: 1, minHeight: 0, background: "#000", borderRadius: "12px", overflow: "hidden" }}>
                  {isActive ? (
                    <video
                      ref={activeVideoRef}
                      src={streamUrl}
                      controls
                      playsInline
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                      onLoadedMetadata={() => {
                        const v = activeVideoRef.current;
                        if (!v) return;
                        if (Number.isFinite(v.duration) && v.duration > 0) setMediaDuration(v.duration);
                        v.playbackRate = speed;
                        const t = clamp(chunkStart, 0, Math.max(0, v.duration - 0.01));
                        v.currentTime = t;
                      }}
                      onTimeUpdate={() => {
                        const v = activeVideoRef.current;
                        if (!v) return;
                        // If user scrubs near end of chunk, auto-advance mark logic will still happen on ended; but we can soft-stop at chunkEnd
                        if (Number.isFinite(chunkEnd) && v.currentTime >= chunkEnd - 0.25 && idx === activeIndex) {
                          v.pause();
                          v.currentTime = chunkEnd;
                          handleEnded();
                        }
                      }}
                      onEnded={handleEnded}
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a" }}>
                      Scroll to play
                    </div>
                  )}
                </div>

                {idx === 0 && totalChunks <= 0 && (
                  <div style={{ marginTop: "0.5rem", color: "#71717a", fontSize: "0.85rem" }}>
                    Loading video duration…
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Optional: quick links to other videos for this course (sorted) */}
      <div style={{ marginTop: "0.25rem" }}>
        <details>
          <summary style={{ cursor: "pointer", color: "#a1a1aa" }}>Switch video</summary>
          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {sortByTitleNumber(
              (course?.sections ?? []).flatMap((s) => s.subsections).flatMap((ss) => ss.videos)
            ).map((v) => (
              <Link
                key={v.id}
                to={`/courses/${courseId}/videos/${v.id}/reels`}
                style={{ color: v.id === videoId ? "#a78bfa" : "#e4e4e7" }}
              >
                {v.title}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

