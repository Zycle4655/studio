
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type Storage } from "firebase/storage"; // Importar Storage

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appIdEnv = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

let allCoreConfigPresent = true;
let firebaseConfigErrorMessage = "CRITICAL Firebase Error: One or more Firebase configuration values are missing or invalid. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env.local file and you have restarted your development server.\nDetailed missing variables:\n";

if (!apiKey) {
    firebaseConfigErrorMessage += " - Firebase Env Var Error: NEXT_PUBLIC_FIREBASE_API_KEY is not defined or is empty.\n";
    allCoreConfigPresent = false;
}
if (!authDomain) {
    firebaseConfigErrorMessage += " - Firebase Env Var Error: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not defined or is empty.\n";
    allCoreConfigPresent = false;
}
if (!projectId) {
    firebaseConfigErrorMessage += " - Firebase Env Var Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined or is empty.\n";
    allCoreConfigPresent = false;
}
if (!storageBucket) {
    firebaseConfigErrorMessage += " - Firebase Env Var Warning: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not defined. This is required for logo uploads.\n";
    // Consider making this critical for logo upload functionality
    // allCoreConfigPresent = false; 
}
if (!messagingSenderId) {
    firebaseConfigErrorMessage += " - Firebase Env Var Warning: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is not defined. (Optional for Auth, but check if other services need it)\n";
}
if (!appIdEnv) {
    firebaseConfigErrorMessage += " - Firebase Env Var Warning: NEXT_PUBLIC_FIREBASE_APP_ID is not defined. (Optional for Auth, but check if other services need it)\n";
}


const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appIdEnv,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: Storage | undefined; // Declarar storage

if (!allCoreConfigPresent) {
  console.error(firebaseConfigErrorMessage);
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log("Firebase Config Check: All required NEXT_PUBLIC_FIREBASE_... variables seem to be present.");
  }
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.log("Firebase app initialized successfully with Project ID:", firebaseConfig.projectId);
      }
    } catch (e: any) {
      console.error("Firebase app initialization failed:", e.message, "Config used:", { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? 'HIDDEN_FOR_LOG' : 'NOT_DEFINED' });
      app = undefined;
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      auth = getAuth(app);
      db = getFirestore(app); 
      storage = getStorage(app); // Inicializar Storage
      if (process.env.NODE_ENV === 'development' && auth && db && storage) {
        console.log("Firebase Auth, Firestore, and Storage initialized successfully.");
      }
    } catch (e: any) {
      console.error("Firebase getAuth(app), getFirestore(app) or getStorage(app) failed:", e.message);
      auth = undefined;
      db = undefined;
      storage = undefined;
    }
  } else {
    if (allCoreConfigPresent && process.env.NODE_ENV === 'development') {
        console.warn("Firebase Auth/Firestore/Storage initialization skipped because Firebase app initialization failed or app is undefined, despite core config being present.");
    }
    auth = undefined;
    db = undefined;
    storage = undefined;
  }
}

export { app, auth, db, storage, firebaseConfig }; // Exportar storage y firebaseConfig
