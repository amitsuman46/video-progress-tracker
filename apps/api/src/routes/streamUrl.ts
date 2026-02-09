import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";
import { verifyAuth } from "../auth.js";
import * as db from "../db/index.js";
import { getFileStream } from "../drive.js";
import { createStreamToken, getDriveFileIdByToken } from "../streamTokens.js";

function parseRange(rangeHeader: string | undefined): { start: number; end?: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;
  const parts = rangeHeader.slice(6).trim().split("-");
  const start = parseInt(parts[0], 10);
  if (Number.isNaN(start)) return null;
  const end = parts[1] ? parseInt(parts[1], 10) : undefined;
  if (parts[1] && Number.isNaN(end!)) return null;
  return { start, end };
}

export default async function streamUrlRoutes(app: FastifyInstance) {
  // Returns a URL that proxies the video through our API (plays in Chrome)
  app.get<{ Params: { courseId: string; videoId: string } }>(
    "/courses/:courseId/videos/:videoId/stream-url",
    async (request, reply) => {
      const user = await verifyAuth(request, reply);
      if (!user) return;
      const { courseId, videoId } = request.params;
      const driveFileId = await db.getVideoDriveFileId(courseId, videoId);
      if (!driveFileId) {
        reply.status(404).send({ error: "Video not found" });
        return;
      }
      const token = createStreamToken(driveFileId);
      const path = `/api/courses/${courseId}/videos/${videoId}/stream?t=${token}`;
      const base = config.publicApiUrl?.replace(/\/$/, "");
      const url = base ? `${base}${path}` : path;
      if (base) reply.header("X-API-Base", base);
      return { url };
    }
  );

  // Proxy stream (no auth; token in URL). Supports Range for seeking.
  app.get<{
    Params: { courseId: string; videoId: string };
    Querystring: { t?: string };
  }>("/courses/:courseId/videos/:videoId/stream", async (request, reply) => {
    const { courseId, videoId } = request.params;
    const token = request.query.t;
    if (!token) {
      reply.status(400).send({ error: "Missing token" });
      return;
    }
    const driveFileId = getDriveFileIdByToken(token);
    if (!driveFileId) {
      reply.status(403).send({ error: "Invalid or expired token" });
      return;
    }
    const storedDriveFileId = await db.getVideoDriveFileId(courseId, videoId);
    if (!storedDriveFileId || storedDriveFileId !== driveFileId) {
      reply.status(404).send({ error: "Video not found" });
      return;
    }
    const range = parseRange(request.headers.range);
    try {
      const { stream, contentType, contentLength, totalLength, isPartial } =
        await getFileStream(driveFileId, range ?? undefined);
      reply.header("Content-Type", contentType);
      reply.header("Accept-Ranges", "bytes");
      if (isPartial && totalLength != null) {
        reply.header("Content-Range", `bytes ${range!.start}-${range!.end ?? totalLength - 1}/${totalLength}`);
        reply.status(206);
      }
      if (contentLength != null) reply.header("Content-Length", contentLength);
      return reply.send(stream);
    } catch (e) {
      request.log.error(e);
      reply.status(502).send({ error: "Failed to stream from Drive" });
    }
  });
}
