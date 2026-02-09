import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAuth } from "../auth.js";
import * as db from "../db/index.js";

interface ProgressBody {
  videoId: string;
  progressSeconds: number;
  completed: boolean;
}

export default async function progressRoutes(app: FastifyInstance) {
  // Get all progress for current user
  app.get("/progress", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await verifyAuth(request, reply);
    if (!user) return;
    const list = await db.getProgressForUser(user.uid);
    return list.map((p) => ({
      videoId: p.videoId,
      progressSeconds: p.progressSeconds,
      completed: p.completed,
      updatedAt: p.updatedAt,
    }));
  });

  // Get progress for one video (for resume)
  app.get<{ Querystring: { videoId?: string } }>(
    "/progress/one",
    async (request, reply) => {
      const user = await verifyAuth(request, reply);
      if (!user) return;
      const videoId = request.query.videoId;
      if (!videoId) {
        reply.status(400).send({ error: "videoId required" });
        return;
      }
      const p = await db.getProgressOne(user.uid, videoId);
      if (!p) return { progressSeconds: 0, completed: false };
      return {
        videoId,
        progressSeconds: p.progressSeconds,
        completed: p.completed,
        updatedAt: p.updatedAt,
      };
    }
  );

  // Get progress for a course (all videos in that course)
  app.get<{ Params: { courseId: string } }>(
    "/courses/:courseId/progress",
    async (request, reply) => {
      const user = await verifyAuth(request, reply);
      if (!user) return;
      const { courseId } = request.params;
      const map = await db.getProgressForCourse(user.uid, courseId);
      return map;
    }
  );

  // Save progress (upsert)
  app.post<{ Body: ProgressBody }>("/progress", async (request, reply) => {
    const user = await verifyAuth(request, reply);
    if (!user) return;
    const { videoId, progressSeconds, completed } = request.body ?? {};
    if (typeof videoId !== "string" || typeof progressSeconds !== "number") {
      reply.status(400).send({ error: "videoId and progressSeconds required" });
      return;
    }
    await db.upsertProgress(user.uid, videoId, progressSeconds ?? 0, Boolean(completed));
    return { ok: true };
  });
}
