// Course tree (section → subsection → video)
export interface Course {
  id: string;
  title: string;
  driveFolderId: string | null;
  createdAt: string;
  sections?: Section[];
}

export interface Section {
  id: string;
  courseId: string;
  title: string;
  order: number;
  driveFolderId: string | null;
  createdAt: string;
  subsections?: Subsection[];
}

export interface Subsection {
  id: string;
  sectionId: string;
  title: string;
  order: number;
  driveFolderId: string | null;
  createdAt: string;
  videos?: Video[];
}

export interface Video {
  id: string;
  subsectionId: string;
  title: string;
  driveFileId: string;
  order: number;
  durationSeconds: number | null;
  createdAt: string;
}

export interface UserProgress {
  userId: string;
  videoId: string;
  progressSeconds: number;
  completed: boolean;
  updatedAt: string;
}

// API payloads
export interface StreamUrlResponse {
  url: string;
  expiresIn?: number;
}

export interface ProgressPayload {
  videoId: string;
  progressSeconds: number;
  completed: boolean;
}

export interface SyncPayload {
  driveFolderId: string;
  courseTitle?: string;
}
