import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db.js";

const client: PrismaClient = prisma!;

export async function listCourses(): Promise<{ id: string; title: string; driveFolderId: string | null; createdAt: string; sectionCount: number }[]> {
  const courses = await client.course.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { sections: true } } },
  });
  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    driveFolderId: c.driveFolderId,
    createdAt: c.createdAt.toISOString(),
    sectionCount: c._count.sections,
  }));
}

export async function getCourseWithTree(courseId: string): Promise<{
  id: string;
  title: string;
  driveFolderId: string | null;
  createdAt: string;
  sections: Array<{
    id: string;
    title: string;
    order: number;
    subsections: Array<{
      id: string;
      title: string;
      order: number;
      videos: Array<{ id: string; title: string; order: number; durationSeconds: number | null; driveFileId: string }>;
    }>;
  }>;
} | null> {
  const course = await client.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          subsections: {
            orderBy: { order: "asc" },
            include: {
              videos: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!course) return null;
  return {
    id: course.id,
    title: course.title,
    driveFolderId: course.driveFolderId,
    createdAt: course.createdAt.toISOString(),
    sections: course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      order: s.order,
      subsections: s.subsections.map((ss) => ({
        id: ss.id,
        title: ss.title,
        order: ss.order,
        videos: ss.videos.map((v) => ({
          id: v.id,
          title: v.title,
          order: v.order,
          durationSeconds: v.durationSeconds,
          driveFileId: v.driveFileId,
        })),
      })),
    })),
  };
}

export async function getVideoByCourseAndVideoId(
  courseId: string,
  videoId: string
): Promise<{
  id: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  driveFileId: string;
  subsectionId: string;
  subsection: { id: string; title: string };
  section: { id: string; title: string };
} | null> {
  const video = await client.video.findFirst({
    where: { id: videoId, subsection: { section: { courseId } } },
    include: { subsection: { include: { section: true } } },
  });
  if (!video) return null;
  return {
    id: video.id,
    title: video.title,
    order: video.order,
    durationSeconds: video.durationSeconds,
    driveFileId: video.driveFileId,
    subsectionId: video.subsectionId,
    subsection: { id: video.subsection.id, title: video.subsection.title },
    section: { id: video.subsection.section.id, title: video.subsection.section.title },
  };
}

export async function getVideoDriveFileId(courseId: string, videoId: string): Promise<string | null> {
  const v = await getVideoByCourseAndVideoId(courseId, videoId);
  return v?.driveFileId ?? null;
}

export async function getVideoIdsByCourseId(courseId: string): Promise<string[]> {
  const videos = await client.video.findMany({
    where: { subsection: { section: { courseId } } },
    select: { id: true },
  });
  return videos.map((v) => v.id);
}

export async function getProgressForUser(userId: string): Promise<Array<{ videoId: string; progressSeconds: number; completed: boolean; updatedAt: string }>> {
  const list = await client.userProgress.findMany({
    where: { userId },
  });
  return list.map((p) => ({
    videoId: p.videoId,
    progressSeconds: p.progressSeconds,
    completed: p.completed,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getProgressOne(userId: string, videoId: string): Promise<{ progressSeconds: number; completed: boolean; updatedAt: string } | null> {
  const p = await client.userProgress.findUnique({
    where: { userId_videoId: { userId, videoId } },
  });
  if (!p) return null;
  return {
    progressSeconds: p.progressSeconds,
    completed: p.completed,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getProgressForCourse(userId: string, courseId: string): Promise<Record<string, { progressSeconds: number; completed: boolean }>> {
  const videoIds = await getVideoIdsByCourseId(courseId);
  const list = await client.userProgress.findMany({
    where: { userId, videoId: { in: videoIds } },
  });
  const map: Record<string, { progressSeconds: number; completed: boolean }> = {};
  for (const p of list) {
    map[p.videoId] = { progressSeconds: p.progressSeconds, completed: p.completed };
  }
  return map;
}

export async function upsertProgress(userId: string, videoId: string, progressSeconds: number, completed: boolean): Promise<void> {
  await client.userProgress.upsert({
    where: { userId_videoId: { userId, videoId } },
    create: { userId, videoId, progressSeconds, completed },
    update: { progressSeconds, completed },
  });
}

export async function findCourseByDriveFolderId(driveFolderId: string): Promise<{ id: string; title: string; driveFolderId: string | null } | null> {
  const course = await client.course.findFirst({ where: { driveFolderId } });
  return course ? { id: course.id, title: course.title, driveFolderId: course.driveFolderId } : null;
}

export async function createCourse(data: { title: string; driveFolderId: string }): Promise<{ id: string }> {
  const course = await client.course.create({ data });
  return { id: course.id };
}

export async function updateCourse(courseId: string, data: { title: string }): Promise<void> {
  await client.course.update({ where: { id: courseId }, data });
}

export async function findSectionByCourseAndDriveFolderId(courseId: string, driveFolderId: string): Promise<{ id: string } | null> {
  const section = await client.section.findFirst({
    where: { courseId, driveFolderId },
  });
  return section ? { id: section.id } : null;
}

export async function createSection(data: { courseId: string; title: string; order: number; driveFolderId: string | null }): Promise<{ id: string }> {
  const section = await client.section.create({ data });
  return { id: section.id };
}

export async function updateSection(sectionId: string, data: { title: string; order: number }): Promise<void> {
  await client.section.update({ where: { id: sectionId }, data });
}

export async function findSubsection(sectionId: string, opts: { driveFolderId: string | null; title: string }): Promise<{ id: string } | null> {
  const subsection = await client.subsection.findFirst({
    where: {
      sectionId,
      ...(opts.driveFolderId ? { driveFolderId: opts.driveFolderId } : { title: opts.title, driveFolderId: null }),
    },
  });
  return subsection ? { id: subsection.id } : null;
}

export async function createSubsection(data: { sectionId: string; title: string; order: number; driveFolderId: string | null }): Promise<{ id: string }> {
  const subsection = await client.subsection.create({ data });
  return { id: subsection.id };
}

export async function updateSubsection(subsectionId: string, data: { title: string; order: number }): Promise<void> {
  await client.subsection.update({ where: { id: subsectionId }, data });
}

export async function findVideoBySubsectionAndDriveFileId(subsectionId: string, driveFileId: string): Promise<{ id: string } | null> {
  const video = await client.video.findFirst({
    where: { subsectionId, driveFileId },
  });
  return video ? { id: video.id } : null;
}

export async function createVideo(data: { subsectionId: string; title: string; driveFileId: string; order: number }): Promise<{ id: string }> {
  const video = await client.video.create({ data });
  return { id: video.id };
}

export async function updateVideo(videoId: string, data: { title: string; order: number }): Promise<void> {
  await client.video.update({ where: { id: videoId }, data });
}

export async function getCourseById(courseId: string): Promise<{ id: string; title: string; driveFolderId: string | null } | null> {
  const course = await client.course.findUnique({ where: { id: courseId } });
  return course ? { id: course.id, title: course.title, driveFolderId: course.driveFolderId } : null;
}
