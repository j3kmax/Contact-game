import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { FirebaseConfig } from '../types/game';

const LOCAL_STORAGE_KEY = 'contact_custom_firebase_config';

export function getSavedFirebaseConfig(): FirebaseConfig | null {
  // 1. Check environment variables
  if (
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_DATABASE_URL
  ) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  // 2. Check localStorage
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.databaseURL) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseConfig) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearFirebaseConfig() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.location.reload();
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Database | null = null;

export function getFirebaseServices(): { app: FirebaseApp | null; db: Database | null } {
  if (cachedDb) {
    return { app: cachedApp, db: cachedDb };
  }

  const config = getSavedFirebaseConfig();
  if (!config || !config.databaseURL) {
    return { app: null, db: null };
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const db = getDatabase(app);
    cachedApp = app;
    cachedDb = db;
    return { app, db };
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
    return { app: null, db: null };
  }
}

export const isFirebaseConfigured = (): boolean => {
  return !!getSavedFirebaseConfig()?.databaseURL;
};
