import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAuth, getFirebaseAdmin } from "../auth.js";
import * as db from "../db/index.js";

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return local[0] + "***" + domain;
  return local.slice(0, 2) + "***" + domain;
}

export default async function courseRoutes(app: FastifyInstance) {
  app.get("/courses", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await verifyAuth(request, reply);
    if (!user) return;
    const courses = await db.listCourses();
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      driveFolderId: c.driveFolderId,
      createdAt: c.createdAt,
      sectionCount: c.sectionCount,
    }));
  });

  app.get<{ Params: { courseId: string } }>(
    "/courses/:courseId",
    async (request, reply) => {
      const user = await verifyAuth(request, reply);
      if (!user) return;
      const { courseId } = request.params;
      const course = await db.getCourseWithTree(courseId);
      if (!course) {
        reply.status(404).send({ error: "Course not found" });
        return;
      }
      return {
        id: course.id,
        title: course.title,
        driveFolderId: course.driveFolderId,
        createdAt: course.createdAt,
        sections: course.sections,
      };
    }
  );

  app.get<{ Params: { courseId: string; videoId: string } }>(
    "/courses/:courseId/videos/:videoId",
    async (request, reply) => {
      const user = await verifyAuth(request, reply);
      if (!user) return;
      const { courseId, videoId } = request.params;
      const video = await db.getVideoByCourseAndVideoId(courseId, videoId);
      if (!video) {
        reply.status(404).send({ error: "Video not found" });
        return;
      }
      return {
        id: video.id,
        title: video.title,
        order: video.order,
        durationSeconds: video.durationSeconds,
        driveFileId: video.driveFileId,
        subsectionId: video.subsectionId,
        subsection: video.subsection,
        section: video.section,
      };
    }
  );

  app.get<{ Params: { courseId: string } }>(
    "/courses/:courseId/leaderboard",
    async (request, reply) => {
      const user = await verifyAuth(request, reply);
      if (!user) return;
      const { courseId } = request.params;
      const course = await db.getCourseWithTree(courseId);
      if (!course) {
        reply.status(404).send({ error: "Course not found" });
        return;
      }
      const videoIds = await db.getVideoIdsByCourseId(courseId);
      if (videoIds.length === 0) return { leaderboard: [], totalVideos: 0 };
      const rows = await db.getLeaderboardForCourse(courseId);
      const uids = rows.map((r) => r.userId);
      const displayByUid: Record<string, string> = {};
      try {
        const getUsersResult = await getFirebaseAdmin().auth().getUsers(uids.map((uid) => ({ uid })));
        getUsersResult.users.forEach((u) => {
          displayByUid[u.uid] = u.email ? maskEmail(u.email) : u.uid.slice(0, 8) + "…";
        });
      } catch {
        // ignore; we'll show fallback
      }
      const leaderboard = rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        displayLabel: displayByUid[r.userId] ?? "User",
        completedCount: r.completedCount,
        totalVideos: r.totalVideos,
      }));
      return { leaderboard, totalVideos: videoIds.length };
    }
  );
}
