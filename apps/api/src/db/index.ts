import { config } from "../config.js";

type FirestoreDb = typeof import("./firestore.js");
type PrismaDb = typeof import("./prisma.js");
let _db: Promise<FirestoreDb | PrismaDb> | null = null;

function getDb(): Promise<FirestoreDb | PrismaDb> {
  if (!_db) {
    _db = config.useFirestore ? import("./firestore.js") : import("./prisma.js");
  }
  return _db;
}

export async function listCourses(
  ...args: Parameters<FirestoreDb["listCourses"]>
): Promise<ReturnType<FirestoreDb["listCourses"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).listCourses(...args);
}

export async function getCourseWithTree(
  ...args: Parameters<FirestoreDb["getCourseWithTree"]>
): Promise<ReturnType<FirestoreDb["getCourseWithTree"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getCourseWithTree(...args);
}

export async function getVideoByCourseAndVideoId(
  ...args: Parameters<FirestoreDb["getVideoByCourseAndVideoId"]>
): Promise<ReturnType<FirestoreDb["getVideoByCourseAndVideoId"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getVideoByCourseAndVideoId(...args);
}

export async function getVideoDriveFileId(
  ...args: Parameters<FirestoreDb["getVideoDriveFileId"]>
): Promise<ReturnType<FirestoreDb["getVideoDriveFileId"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getVideoDriveFileId(...args);
}

export async function getVideoIdsByCourseId(
  ...args: Parameters<FirestoreDb["getVideoIdsByCourseId"]>
): Promise<ReturnType<FirestoreDb["getVideoIdsByCourseId"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getVideoIdsByCourseId(...args);
}

export async function getProgressForUser(
  ...args: Parameters<FirestoreDb["getProgressForUser"]>
): Promise<ReturnType<FirestoreDb["getProgressForUser"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getProgressForUser(...args);
}

export async function getProgressOne(
  ...args: Parameters<FirestoreDb["getProgressOne"]>
): Promise<ReturnType<FirestoreDb["getProgressOne"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getProgressOne(...args);
}

export async function getProgressForCourse(
  ...args: Parameters<FirestoreDb["getProgressForCourse"]>
): Promise<ReturnType<FirestoreDb["getProgressForCourse"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getProgressForCourse(...args);
}

export async function upsertProgress(
  ...args: Parameters<FirestoreDb["upsertProgress"]>
): Promise<ReturnType<FirestoreDb["upsertProgress"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).upsertProgress(...args);
}

export async function getLeaderboardForCourse(
  ...args: Parameters<FirestoreDb["getLeaderboardForCourse"]>
): Promise<ReturnType<FirestoreDb["getLeaderboardForCourse"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getLeaderboardForCourse(...args);
}

export async function findCourseByDriveFolderId(
  ...args: Parameters<FirestoreDb["findCourseByDriveFolderId"]>
): Promise<ReturnType<FirestoreDb["findCourseByDriveFolderId"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).findCourseByDriveFolderId(...args);
}

export async function createCourse(
  ...args: Parameters<FirestoreDb["createCourse"]>
): Promise<ReturnType<FirestoreDb["createCourse"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).createCourse(...args);
}

export async function updateCourse(
  ...args: Parameters<FirestoreDb["updateCourse"]>
): Promise<ReturnType<FirestoreDb["updateCourse"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).updateCourse(...args);
}

export async function findSectionByCourseAndDriveFolderId(
  ...args: Parameters<FirestoreDb["findSectionByCourseAndDriveFolderId"]>
): Promise<ReturnType<FirestoreDb["findSectionByCourseAndDriveFolderId"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).findSectionByCourseAndDriveFolderId(...args);
}

export async function createSection(
  ...args: Parameters<FirestoreDb["createSection"]>
): Promise<ReturnType<FirestoreDb["createSection"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).createSection(...args);
}

export async function updateSection(
  ...args: Parameters<FirestoreDb["updateSection"]>
): Promise<ReturnType<FirestoreDb["updateSection"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).updateSection(...args);
}

export async function findSubsection(
  ...args: Parameters<FirestoreDb["findSubsection"]>
): Promise<ReturnType<FirestoreDb["findSubsection"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).findSubsection(...args);
}

export async function createSubsection(
  ...args: Parameters<FirestoreDb["createSubsection"]>
): Promise<ReturnType<FirestoreDb["createSubsection"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).createSubsection(...args);
}

export async function updateSubsection(
  ...args: Parameters<FirestoreDb["updateSubsection"]>
): Promise<ReturnType<FirestoreDb["updateSubsection"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).updateSubsection(...args);
}

export async function findVideoBySubsectionAndDriveFileId(
  ...args: Parameters<FirestoreDb["findVideoBySubsectionAndDriveFileId"]>
): Promise<ReturnType<FirestoreDb["findVideoBySubsectionAndDriveFileId"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).findVideoBySubsectionAndDriveFileId(...args);
}

export async function createVideo(
  ...args: Parameters<FirestoreDb["createVideo"]>
): Promise<ReturnType<FirestoreDb["createVideo"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).createVideo(...args);
}

export async function updateVideo(
  ...args: Parameters<FirestoreDb["updateVideo"]>
): Promise<ReturnType<FirestoreDb["updateVideo"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).updateVideo(...args);
}

export async function getCourseById(
  ...args: Parameters<FirestoreDb["getCourseById"]>
): Promise<ReturnType<FirestoreDb["getCourseById"]> extends Promise<infer R> ? R : never> {
  const db = await getDb();
  return (db as FirestoreDb).getCourseById(...args);
}
