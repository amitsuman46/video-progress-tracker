import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

/** Fetches stream URL and uses X-API-Base from API when present; otherwise infers API base from response URL so the video loads from the API origin (avoids same-origin 404 when frontend and API are on different domains). */
export async function getStreamUrl(path: string): Promise<string> {
  const token = await getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  const apiBaseFromHeader = res.headers.get("X-API-Base")?.replace(/\/$/, "");
  const body = (await res.json()) as StreamUrlResponse;
  const url = body.url;
  if (url.startsWith("http")) return url;
  // Prefer API base from header; else infer from the request URL (so when stream-url was fetched from the API, the video loads from the API, not the frontend origin)
  const inferredBase =
    res.url && url.startsWith("/") ? new URL(res.url).origin.replace(/\/$/, "") : "";
  const base = apiBaseFromHeader || inferredBase || API_BASE?.replace(/\/$/, "") || "";
  return base ? `${base}${url}` : url;
}

export interface CourseSummary {
  id: string;
  title: string;
  driveFolderId: string | null;
  createdAt: string;
  sectionCount: number;
}

export interface VideoSummary {
  id: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  driveFileId: string;
}

export interface SubsectionSummary {
  id: string;
  title: string;
  order: number;
  videos: VideoSummary[];
}

export interface SectionSummary {
  id: string;
  title: string;
  order: number;
  subsections: SubsectionSummary[];
}

export interface CourseDetail {
  id: string;
  title: string;
  driveFolderId: string | null;
  createdAt: string;
  sections: SectionSummary[];
}

export interface StreamUrlResponse {
  url: string;
}

export interface ProgressItem {
  videoId: string;
  progressSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export interface CourseProgressMap {
  [videoId: string]: { progressSeconds: number; completed: boolean };
}

export interface MeResponse {
  uid: string;
  email: string | null;
  isAdmin: boolean;
}

export interface AdminSyncResponse {
  ok: boolean;
  courseId: string;
  title: string;
  sectionsSynced: number;
}
