import { getApp, getApps, initializeApp } from "@firebase/app";
import type { Auth } from "@firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigReady = Object.values(config).every((value) => typeof value === "string" && value.length > 0);

let firebaseAuthPromise: Promise<Auth | null> | null = null;

export function getFirebaseAuth(): Promise<Auth | null> {
  if (!firebaseConfigReady) return Promise.resolve(null);
  if (!firebaseAuthPromise) {
    firebaseAuthPromise = import("@firebase/auth").then(({ getAuth }) =>
      getAuth(getApps().length ? getApp() : initializeApp(config)),
    );
  }
  return firebaseAuthPromise;
}
