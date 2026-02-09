import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../auth.js";

let _db: Firestore | null = null;

function getDb(): Firestore {
  if (!_db) {
    _db = getFirebaseAdmin().firestore();
  }
  return _db;
}

function serverTimestamp(): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date());
}

const COLL = {
  courses: "courses",
  sections: "sections",
  subsections: "subsections",
  videos: "videos",
  userProgress: "userProgress",
} as const;

export async function listCourses(): Promise<{ id: string; title: string; driveFolderId: string | null; createdAt: string; sectionCount: number }[]> {
  const snap = await getDb().collection(COLL.courses).orderBy("createdAt", "asc").get();
  const out: { id: string; title: string; driveFolderId: string | null; createdAt: string; sectionCount: number }[] = [];
  for (const doc of snap.docs) {
    const sectionsSnap = await getDb().collection(COLL.sections).where("courseId", "==", doc.id).get();
    out.push({
      id: doc.id,
      title: doc.get("title") ?? "",
      driveFolderId: doc.get("driveFolderId") ?? null,
      createdAt: (doc.get("createdAt") as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      sectionCount: sectionsSnap.size,
    });
  }
  return out;
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
  const courseDoc = await getDb().collection(COLL.courses).doc(courseId).get();
  if (!courseDoc.exists) return null;
  const sectionsSnap = await getDb().collection(COLL.sections).where("courseId", "==", courseId).orderBy("order", "asc").get();
  const sections: Array<{
    id: string;
    title: string;
    order: number;
    subsections: Array<{
      id: string;
      title: string;
      order: number;
      videos: Array<{ id: string; title: string; order: number; durationSeconds: number | null; driveFileId: string }>;
    }>;
  }> = [];
  for (const sDoc of sectionsSnap.docs) {
    const subSnap = await getDb().collection(COLL.subsections).where("sectionId", "==", sDoc.id).orderBy("order", "asc").get();
    const subsections: Array<{ id: string; title: string; order: number; videos: Array<{ id: string; title: string; order: number; durationSeconds: number | null; driveFileId: string }> }> = [];
    for (const ssDoc of subSnap.docs) {
      const videosSnap = await getDb().collection(COLL.videos).where("subsectionId", "==", ssDoc.id).orderBy("order", "asc").get();
      subsections.push({
        id: ssDoc.id,
        title: ssDoc.get("title") ?? "",
        order: ssDoc.get("order") ?? 0,
        videos: videosSnap.docs.map((v) => ({
          id: v.id,
          title: v.get("title") ?? "",
          order: v.get("order") ?? 0,
          durationSeconds: v.get("durationSeconds") ?? null,
          driveFileId: v.get("driveFileId") ?? "",
        })),
      });
    }
    sections.push({
      id: sDoc.id,
      title: sDoc.get("title") ?? "",
      order: sDoc.get("order") ?? 0,
      subsections,
    });
  }
  const createdAt = (courseDoc.get("createdAt") as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? new Date().toISOString();
  return {
    id: courseDoc.id,
    title: courseDoc.get("title") ?? "",
    driveFolderId: courseDoc.get("driveFolderId") ?? null,
    createdAt,
    sections,
  };
}

export async function getVideoByCourseAndVideoId(courseId: string, videoId: string): Promise<{
  id: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  driveFileId: string;
  subsectionId: string;
  subsection: { id: string; title: string };
  section: { id: string; title: string };
} | null> {
  const videoDoc = await getDb().collection(COLL.videos).doc(videoId).get();
  if (!videoDoc.exists) return null;
  const subsectionId = videoDoc.get("subsectionId");
  const subDoc = await getDb().collection(COLL.subsections).doc(subsectionId).get();
  if (!subDoc.exists) return null;
  const sectionId = subDoc.get("sectionId");
  const sectionDoc = await getDb().collection(COLL.sections).doc(sectionId).get();
  if (!sectionDoc.exists || sectionDoc.get("courseId") !== courseId) return null;
  return {
    id: videoDoc.id,
    title: videoDoc.get("title") ?? "",
    order: videoDoc.get("order") ?? 0,
    durationSeconds: videoDoc.get("durationSeconds") ?? null,
    driveFileId: videoDoc.get("driveFileId") ?? "",
    subsectionId: subDoc.id,
    subsection: { id: subDoc.id, title: subDoc.get("title") ?? "" },
    section: { id: sectionDoc.id, title: sectionDoc.get("title") ?? "" },
  };
}

export async function getVideoDriveFileId(courseId: string, videoId: string): Promise<string | null> {
  const v = await getVideoByCourseAndVideoId(courseId, videoId);
  return v?.driveFileId ?? null;
}

export async function getVideoIdsByCourseId(courseId: string): Promise<string[]> {
  const sectionsSnap = await getDb().collection(COLL.sections).where("courseId", "==", courseId).get();
  const ids: string[] = [];
  for (const sDoc of sectionsSnap.docs) {
    const subSnap = await getDb().collection(COLL.subsections).where("sectionId", "==", sDoc.id).get();
    for (const ssDoc of subSnap.docs) {
      const videosSnap = await getDb().collection(COLL.videos).where("subsectionId", "==", ssDoc.id).get();
      videosSnap.docs.forEach((v) => ids.push(v.id));
    }
  }
  return ids;
}

// Progress
export async function getProgressForUser(userId: string): Promise<Array<{ videoId: string; progressSeconds: number; completed: boolean; updatedAt: string }>> {
  const snap = await getDb().collection(COLL.userProgress).where("userId", "==", userId).get();
  return snap.docs.map((d) => ({
    videoId: d.get("videoId"),
    progressSeconds: d.get("progressSeconds") ?? 0,
    completed: d.get("completed") ?? false,
    updatedAt: (d.get("updatedAt") as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? "",
  }));
}

export async function getProgressOne(userId: string, videoId: string): Promise<{ progressSeconds: number; completed: boolean; updatedAt: string } | null> {
  const docId = `${userId}_${videoId}`;
  const d = await getDb().collection(COLL.userProgress).doc(docId).get();
  if (!d.exists) return null;
  return {
    progressSeconds: d.get("progressSeconds") ?? 0,
    completed: d.get("completed") ?? false,
    updatedAt: (d.get("updatedAt") as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? "",
  };
}

export async function getProgressForCourse(userId: string, courseId: string): Promise<Record<string, { progressSeconds: number; completed: boolean }>> {
  const videoIds = await getVideoIdsByCourseId(courseId);
  const snap = await getDb().collection(COLL.userProgress).where("userId", "==", userId).where("videoId", "in", videoIds.length ? videoIds.slice(0, 10) : ["__none__"]).get();
  if (videoIds.length > 10) {
    const batches: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 10) {
      batches.push(videoIds.slice(i, i + 10));
    }
    const all: Record<string, { progressSeconds: number; completed: boolean }> = {};
    for (const batch of batches) {
      const s = await getDb().collection(COLL.userProgress).where("userId", "==", userId).where("videoId", "in", batch).get();
      s.docs.forEach((d) => {
        all[d.get("videoId")] = { progressSeconds: d.get("progressSeconds") ?? 0, completed: d.get("completed") ?? false };
      });
    }
    return all;
  }
  const map: Record<string, { progressSeconds: number; completed: boolean }> = {};
  snap.docs.forEach((d) => {
    map[d.get("videoId")] = { progressSeconds: d.get("progressSeconds") ?? 0, completed: d.get("completed") ?? false };
  });
  return map;
}

export async function upsertProgress(userId: string, videoId: string, progressSeconds: number, completed: boolean): Promise<void> {
  const docId = `${userId}_${videoId}`;
  await getDb().collection(COLL.userProgress).doc(docId).set({
    userId,
    videoId,
    progressSeconds,
    completed,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// Admin / sync
export async function findCourseByDriveFolderId(driveFolderId: string): Promise<{ id: string; title: string; driveFolderId: string | null } | null> {
  const snap = await getDb().collection(COLL.courses).where("driveFolderId", "==", driveFolderId).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, title: d.get("title") ?? "", driveFolderId: d.get("driveFolderId") ?? null };
}

export async function createCourse(data: { title: string; driveFolderId: string }): Promise<{ id: string }> {
  const ref = await getDb().collection(COLL.courses).add({
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updateCourse(courseId: string, data: { title: string }): Promise<void> {
  await getDb().collection(COLL.courses).doc(courseId).update(data);
}

export async function findSectionByCourseAndDriveFolderId(courseId: string, driveFolderId: string): Promise<{ id: string } | null> {
  const snap = await getDb().collection(COLL.sections).where("courseId", "==", courseId).where("driveFolderId", "==", driveFolderId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id };
}

export async function createSection(data: { courseId: string; title: string; order: number; driveFolderId: string | null }): Promise<{ id: string }> {
  const ref = await getDb().collection(COLL.sections).add({
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updateSection(sectionId: string, data: { title: string; order: number }): Promise<void> {
  await getDb().collection(COLL.sections).doc(sectionId).update(data);
}

export async function findSubsection(sectionId: string, opts: { driveFolderId: string | null; title: string }): Promise<{ id: string } | null> {
  if (opts.driveFolderId) {
    const snap = await getDb().collection(COLL.subsections).where("sectionId", "==", sectionId).where("driveFolderId", "==", opts.driveFolderId).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id };
    return null;
  }
  const snap = await getDb().collection(COLL.subsections).where("sectionId", "==", sectionId).where("title", "==", opts.title).limit(1).get();
  const doc = snap.docs.find((d) => d.get("driveFolderId") == null);
  return doc ? { id: doc.id } : null;
}

export async function createSubsection(data: { sectionId: string; title: string; order: number; driveFolderId: string | null }): Promise<{ id: string }> {
  const ref = await getDb().collection(COLL.subsections).add({
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updateSubsection(subsectionId: string, data: { title: string; order: number }): Promise<void> {
  await getDb().collection(COLL.subsections).doc(subsectionId).update(data);
}

export async function findVideoBySubsectionAndDriveFileId(subsectionId: string, driveFileId: string): Promise<{ id: string } | null> {
  const snap = await getDb().collection(COLL.videos).where("subsectionId", "==", subsectionId).where("driveFileId", "==", driveFileId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id };
}

export async function createVideo(data: { subsectionId: string; title: string; driveFileId: string; order: number }): Promise<{ id: string }> {
  const ref = await getDb().collection(COLL.videos).add({
    ...data,
    durationSeconds: null,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updateVideo(videoId: string, data: { title: string; order: number }): Promise<void> {
  await getDb().collection(COLL.videos).doc(videoId).update(data);
}

export async function getCourseById(courseId: string): Promise<{ id: string; title: string; driveFolderId: string | null } | null> {
  const d = await getDb().collection(COLL.courses).doc(courseId).get();
  if (!d.exists) return null;
  return { id: d.id, title: d.get("title") ?? "", driveFolderId: d.get("driveFolderId") ?? null };
}
