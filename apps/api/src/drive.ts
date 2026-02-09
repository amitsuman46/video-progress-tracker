import { google } from "googleapis";

const VIDEO_MIME_PREFIX = "video/";
const SUBSECTION_ORDER_REGEX = /^(\d+)[.\s\-]*(.*)$/;

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
}

function getDriveClient() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const json =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const key = JSON.parse(json) as Record<string, unknown>;
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    return google.drive({ version: "v3", auth });
  }
  if (path) {
    const auth = new google.auth.GoogleAuth({
      keyFile: path,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    return google.drive({ version: "v3", auth });
  }
  throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_SERVICE_ACCOUNT_JSON, or FIREBASE_SERVICE_ACCOUNT_JSON for Drive API");
}

export async function listFoldersInFolder(parentFolderId: string): Promise<DriveFolderInfo[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    orderBy: "name",
  });
  const files = res.data.files ?? [];
  return (files ?? [])
    .filter((f): f is { id: string; name: string } => !!f.id)
    .map((f) => ({ id: f.id, name: f.name ?? "Untitled" }));
}

export async function listFilesInFolder(parentFolderId: string): Promise<DriveFileInfo[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    orderBy: "name",
  });
  const files = res.data.files ?? [];
  return files
    .filter((f) => f.id && f.mimeType?.startsWith(VIDEO_MIME_PREFIX))
    .map((f) => ({ id: f.id!, name: f.name ?? "Untitled", mimeType: f.mimeType ?? "" }));
}

/** Stream file bytes from Drive (for proxy playback). Supports Range for seeking. */
export async function getFileStream(
  driveFileId: string,
  range?: { start: number; end?: number }
): Promise<{
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: number;
  totalLength?: number;
  isPartial: boolean;
}> {
  const drive = getDriveClient();
  const opts: { responseType: "stream"; headers?: Record<string, string> } = {
    responseType: "stream",
  };
  if (range) {
    const rangeHeader =
      range.end != null ? `bytes=${range.start}-${range.end}` : `bytes=${range.start}-`;
    opts.headers = { Range: rangeHeader };
  }
  const res = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    opts as { responseType: "stream" }
  );
  const stream = res.data as NodeJS.ReadableStream;
  const headers = res.headers;
  const contentType = (headers["content-type"] as string) || "video/mp4";
  const contentLength = headers["content-length"]
    ? parseInt(String(headers["content-length"]), 10)
    : undefined;
  const totalLength = range
    ? headers["content-range"]
      ? parseInt(String(headers["content-range"]).split("/")[1], 10)
      : contentLength
    : contentLength;
  const isPartial = res.status === 206;
  return { stream, contentType, contentLength, totalLength, isPartial };
}

/** Parse subsection folder name: "01.Networking" -> { order: 1, title: "Networking" } */
export function parseSubsectionName(name: string): { order: number; title: string } {
  const trimmed = name.trim();
  const match = trimmed.match(SUBSECTION_ORDER_REGEX);
  if (match) {
    return { order: parseInt(match[1], 10), title: (match[2] ?? "").trim() || trimmed };
  }
  return { order: 999, title: trimmed };
}

/** Parse video file name for order: "01 - Intro.mp4" -> { order: 1, title: "01 - Intro" } (or use name as-is) */
export function parseVideoFileName(name: string): { order: number; title: string } {
  const match = name.match(/^(\d+)[.\s\-]+(.*)$/);
  if (match) {
    const title = (match[2] ?? "").trim();
    return { order: parseInt(match[1], 10), title: title || name };
  }
  return { order: 0, title: name };
}
