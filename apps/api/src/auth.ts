import * as fs from "node:fs";
import * as admin from "firebase-admin";
import { FastifyRequest, FastifyReply } from "fastify";
import { config } from "./config.js";

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    if (config.firebase.serviceAccountJson) {
      const cred = JSON.parse(config.firebase.serviceAccountJson) as admin.ServiceAccount;
      firebaseApp = admin.initializeApp({ credential: admin.credential.cert(cred) });
    } else if (config.firebase.serviceAccountPath) {
      const json = fs.readFileSync(config.firebase.serviceAccountPath, "utf-8");
      const cred = JSON.parse(json) as admin.ServiceAccount;
      firebaseApp = admin.initializeApp({ credential: admin.credential.cert(cred) });
    } else {
      throw new Error(
        "Set either FIREBASE_SERVICE_ACCOUNT_JSON (string) or path via env that contains it (e.g. GOOGLE_APPLICATION_CREDENTIALS)"
      );
    }
  }
  return firebaseApp;
}

export interface AuthUser {
  uid: string;
  email?: string;
}

export async function verifyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    reply.status(401).send({ error: "Missing or invalid Authorization header" });
    return null;
  }
  try {
    const app = getFirebaseAdmin();
    const decoded = await app.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
    };
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
    return null;
  }
}

export function isAdmin(uid: string): boolean {
  if (config.adminUids.length === 0) return false;
  return config.adminUids.includes(uid);
}
