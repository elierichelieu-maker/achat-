import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import rawConfig from '../firebase-applet-config.json';

// Permet la surcharge via variables d'environnement Netlify/Vercel (VITE_FIREBASE_*) ou utilise firebase-applet-config.json
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string>);
export const hasNetlifyEnvOverride = Boolean(
  env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_DATABASE_ID || env.VITE_FIREBASE_API_KEY
);

export const firebaseConfig = {
  projectId: (env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || '').trim(),
  appId: (env.VITE_FIREBASE_APP_ID || rawConfig.appId || '').trim(),
  apiKey: (env.VITE_FIREBASE_API_KEY || rawConfig.apiKey || '').trim(),
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || '').trim(),
  firestoreDatabaseId: (env.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId || '').trim(),
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || '').trim(),
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '').trim(),
  measurementId: (env.VITE_FIREBASE_MEASUREMENT_ID || rawConfig.measurementId || '').trim(),
};

const app = initializeApp(firebaseConfig);

// experimentalAutoDetectLongPolling garantit la connexion temps réel même derrière des proxys/réseaux mobiles ou Netlify Edge
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Background non-blocking connection check
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting.');
    }
  }
}

// Fire connection test in background without blocking main thread
setTimeout(() => {
  testConnection();
}, 1000);
