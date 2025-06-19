
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Explicitly check each required environment variable
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appIdEnv = process.env.NEXT_PUBLIC_FIREBASE_APP_ID; // Renamed to avoid conflict with FirebaseApp type

let allCoreConfigPresent = true;
let firebaseConfigErrorMessage = "CRITICAL Firebase Error: One or more Firebase configuration values are missing or invalid. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env.local file and you have restarted your development server.\n";

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
// You can add checks for optional ones like storageBucket, messagingSenderId, appIdEnv if needed for other services

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

if (!allCoreConfigPresent) {
  console.error(firebaseConfigErrorMessage);
  console.error("Firebase initialization will be skipped due to missing core configuration.");
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.log("Firebase app initialized successfully with Project ID:", firebaseConfig.projectId);
      }
    } catch (e: any) {
      console.error("Firebase app initialization failed:", e.message, "Config used:", firebaseConfig);
      app = undefined; 
    }
  } else {
    app = getApp();
    if (process.env.NODE_ENV === 'development' && app) {
      console.log("Firebase app already initialized, getting existing app for Project ID:", app.options.projectId);
    }
  }

  if (app) {
    try {
      auth = getAuth(app);
      if (process.env.NODE_ENV === 'development' && auth) {
        console.log("Firebase Auth initialized successfully.");
      }
    } catch (e: any) {
      console.error("Firebase getAuth(app) failed:", e.message);
      auth = undefined; 
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.warn("Firebase Auth initialization skipped because Firebase app initialization failed or app is undefined.");
    }
    auth = undefined;
  }
}

export { app, auth };
