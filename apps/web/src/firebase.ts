import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

if (!apiKey || !authDomain || !projectId) {
  console.warn(
    "Missing Firebase env. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID (and optionally STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID)."
  );
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket: storageBucket ?? "",
  messagingSenderId: messagingSenderId ?? "",
  appId: appId ?? "",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
