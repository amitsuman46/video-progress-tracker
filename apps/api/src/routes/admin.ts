import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAuth, isAdmin } from "../auth.js";
import * as db from "../db/index.js";
import {
  listFoldersInFolder,
  listFilesInFolder,
  parseSubsectionName,
  parseVideoFileName,
} from "../drive.js";

export default async function adminRoutes(app: FastifyInstance) {
  async function requireAdmin(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ uid: string } | null> {
    const user = await verifyAuth(request, reply);
    if (!user) return null;
    if (!isAdmin(user.uid)) {
      reply.status(403).send({ error: "Admin only" });
      return null;
    }
    return { uid: user.uid };
  }

  // Sync from root Drive folder: create/update course and full tree
  app.post<{
    Body: { driveFolderId: string; courseTitle?: string };
  }>("/admin/sync", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { driveFolderId, courseTitle } = request.body ?? {};
    if (!driveFolderId) {
      reply.status(400).send({ error: "driveFolderId required" });
      return;
    }

    let course = await db.findCourseByDriveFolderId(driveFolderId);

    const sectionFolders = await listFoldersInFolder(driveFolderId);
    const firstFolderName = sectionFolders[0]?.name ?? "Course";
    const title = courseTitle ?? firstFolderName;

    if (!course) {
      const created = await db.createCourse({ title, driveFolderId });
      course = { id: created.id, title, driveFolderId };
    } else {
      await db.updateCourse(course.id, { title });
      course = { ...course, title };
    }

    let sectionOrder = 0;
    for (const sectionFolder of sectionFolders) {
      const existingSection = await db.findSectionByCourseAndDriveFolderId(course!.id, sectionFolder.id);
      let sectionId: string;
      if (existingSection) {
        await db.updateSection(existingSection.id, { title: sectionFolder.name, order: sectionOrder });
        sectionId = existingSection.id;
      } else {
        const created = await db.createSection({
          courseId: course!.id,
          title: sectionFolder.name,
          order: sectionOrder,
          driveFolderId: sectionFolder.id,
        });
        sectionId = created.id;
      }

      const subsectionFolders = await listFoldersInFolder(sectionFolder.id);
      subsectionFolders.sort((a, b) => {
        const pa = parseSubsectionName(a.name);
        const pb = parseSubsectionName(b.name);
        return pa.order - pb.order;
      });

      const foldersToProcess =
        subsectionFolders.length > 0
          ? subsectionFolders.map((f) => ({ folderId: f.id, order: parseSubsectionName(f.name).order, title: parseSubsectionName(f.name).title, driveFolderId: f.id }))
          : [{ folderId: sectionFolder.id, order: 0, title: sectionFolder.name, driveFolderId: null as string | null }];

      foldersToProcess.sort((a, b) => a.order - b.order);
      let subsectionOrder = 0;
      for (const item of foldersToProcess) {
        const existingSub = await db.findSubsection(sectionId, { driveFolderId: item.driveFolderId, title: item.title });
        let subId: string;
        if (existingSub) {
          await db.updateSubsection(existingSub.id, { title: item.title, order: subsectionOrder });
          subId = existingSub.id;
        } else {
          const created = await db.createSubsection({
            sectionId,
            title: item.title,
            order: subsectionOrder,
            driveFolderId: item.driveFolderId,
          });
          subId = created.id;
        }

        const files = await listFilesInFolder(item.folderId);
        files.sort((a, b) => {
          const pa = parseVideoFileName(a.name);
          const pb = parseVideoFileName(b.name);
          return pa.order - pb.order;
        });
        for (const file of files) {
          const { order: vOrder, title: vTitle } = parseVideoFileName(file.name);
          const existingVideo = await db.findVideoBySubsectionAndDriveFileId(subId, file.id);
          if (existingVideo) {
            await db.updateVideo(existingVideo.id, { title: vTitle, order: vOrder });
          } else {
            await db.createVideo({
              subsectionId: subId,
              title: vTitle,
              driveFileId: file.id,
              order: vOrder,
            });
          }
        }
        subsectionOrder++;
      }
      sectionOrder++;
    }

    return {
      ok: true,
      courseId: course!.id,
      title: course!.title,
      sectionsSynced: sectionFolders.length,
    };
  });

  // Sync one existing course by its driveFolderId
  app.post<{ Params: { courseId: string } }>(
    "/admin/courses/:courseId/sync",
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;
      const { courseId } = request.params;
      const course = await db.getCourseById(courseId);
      if (!course?.driveFolderId) {
        reply.status(404).send({ error: "Course not found or has no driveFolderId" });
        return;
      }
      const sectionFolders = await listFoldersInFolder(course.driveFolderId);
      let sectionOrder = 0;
      for (const sectionFolder of sectionFolders) {
        const existingSection = await db.findSectionByCourseAndDriveFolderId(courseId, sectionFolder.id);
        let sectionId: string;
        if (existingSection) {
          await db.updateSection(existingSection.id, { title: sectionFolder.name, order: sectionOrder });
          sectionId = existingSection.id;
        } else {
          const created = await db.createSection({
            courseId,
            title: sectionFolder.name,
            order: sectionOrder,
            driveFolderId: sectionFolder.id,
          });
          sectionId = created.id;
        }

        const subsectionFolders = await listFoldersInFolder(sectionFolder.id);
        subsectionFolders.sort((a, b) => {
          const pa = parseSubsectionName(a.name);
          const pb = parseSubsectionName(b.name);
          return pa.order - pb.order;
        });

        const foldersToProcess =
          subsectionFolders.length > 0
            ? subsectionFolders.map((f) => ({
                folderId: f.id,
                order: parseSubsectionName(f.name).order,
                title: parseSubsectionName(f.name).title,
                driveFolderId: f.id as string,
              }))
            : [
                {
                  folderId: sectionFolder.id,
                  order: 0,
                  title: sectionFolder.name,
                  driveFolderId: null as string | null,
                },
              ];
        foldersToProcess.sort((a, b) => a.order - b.order);
        let subsectionOrder = 0;
        for (const item of foldersToProcess) {
          const existingSub = await db.findSubsection(sectionId, {
            driveFolderId: item.driveFolderId,
            title: item.title,
          });
          let subId: string;
          if (existingSub) {
            await db.updateSubsection(existingSub.id, { title: item.title, order: subsectionOrder });
            subId = existingSub.id;
          } else {
            const created = await db.createSubsection({
              sectionId,
              title: item.title,
              order: subsectionOrder,
              driveFolderId: item.driveFolderId,
            });
            subId = created.id;
          }

          const files = await listFilesInFolder(item.folderId);
          files.sort((a, b) => {
            const pa = parseVideoFileName(a.name);
            const pb = parseVideoFileName(b.name);
            return pa.order - pb.order;
          });
          for (const file of files) {
            const { order: vOrder, title: vTitle } = parseVideoFileName(file.name);
            const existingVideo = await db.findVideoBySubsectionAndDriveFileId(subId, file.id);
            if (existingVideo) {
              await db.updateVideo(existingVideo.id, { title: vTitle, order: vOrder });
            } else {
              await db.createVideo({
                subsectionId: subId,
                title: vTitle,
                driveFileId: file.id,
                order: vOrder,
              });
            }
          }
          subsectionOrder++;
        }
        sectionOrder++;
      }

      return { ok: true, courseId, sectionsSynced: sectionFolders.length };
    }
  );
}
