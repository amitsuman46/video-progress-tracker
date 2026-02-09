import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAuth } from "../auth.js";
import * as db from "../db/index.js";

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
}
