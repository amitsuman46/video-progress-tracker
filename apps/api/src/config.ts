import dotenv from "dotenv";
dotenv.config();

function env(key: string): string {
  const v = process.env[key];
  if (v == null || v === "") throw new Error(`Missing env: ${key}`);
  return v;
}

function envOptional(key: string): string | undefined {
  return process.env[key];
}

export const config = {
  port: parseInt(envOptional("PORT") ?? "3001", 10),
  nodeEnv: envOptional("NODE_ENV") ?? "development",

  // Firebase Admin (verify ID tokens from frontend)
  firebase: {
    projectId: envOptional("FIREBASE_PROJECT_ID"),
    // Option A: path to service account JSON (Firebase or Google Cloud key file)
    serviceAccountPath: envOptional("GOOGLE_APPLICATION_CREDENTIALS"),
    // Option B: inline JSON string (paste contents of the key file)
    serviceAccountJson: envOptional("FIREBASE_SERVICE_ACCOUNT_JSON"),
  },

  // Database: Prisma (SQLite) or Firestore when USE_FIRESTORE=true (e.g. production on Render)
  useFirestore: process.env.USE_FIRESTORE === "true",
  databaseUrl: envOptional("DATABASE_URL"), // required when useFirestore is false

  // Admin: comma-separated Firebase UIDs or emails that can call admin/sync
  adminUids: (envOptional("ADMIN_UIDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};

if (!config.useFirestore && !config.databaseUrl) {
  throw new Error("Missing env: DATABASE_URL (or set USE_FIRESTORE=true for Firestore)");
}
