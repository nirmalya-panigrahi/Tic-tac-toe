import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getDatabase,
  Database,
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
} from 'firebase/database';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  onSnapshot,
  serverTimestamp as firestoreServerTimestamp,
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
};

const firestoreDatabaseId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId;

const CORE_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

export const missingFirebaseEnvVars: string[] = CORE_CONFIG_KEYS.filter(
  (key) => !firebaseConfig[key] || firebaseConfig[key].trim() === ''
).map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

export type FirebaseTransport = 'rtdb' | 'firestore' | null;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;
let firestore: Firestore | null = null;
let transport: FirebaseTransport = null;
let firebaseInitError: string | null = null;

if (missingFirebaseEnvVars.length === 0) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    if (firebaseConfig.databaseURL && firebaseConfig.databaseURL.trim() !== '') {
      db = getDatabase(app);
      transport = 'rtdb';
    } else {
      firestore = firestoreDatabaseId
        ? getFirestore(app, firestoreDatabaseId)
        : getFirestore(app);
      transport = 'firestore';
    }
  } catch (err) {
    firebaseInitError = err instanceof Error ? err.message : 'Failed to initialize Firebase.';
    app = null;
    auth = null;
    db = null;
    firestore = null;
    transport = null;
  }
}

export const googleProvider = new GoogleAuthProvider();

export const isFirebaseConfigured = Boolean(
  app && (db || firestore) && missingFirebaseEnvVars.length === 0
);

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId ?? null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
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

async function testConnection() {
  if (!firestore) return;
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (firestore) {
  void testConnection();
}

export {
  app,
  auth,
  db,
  firestore,
  transport,
  firebaseInitError,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  rtdbServerTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  firestoreServerTimestamp,
};
export type { User };
