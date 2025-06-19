
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Explicitly check each required environment variable
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appIdEnv = process.env.NEXT_PUBLIC_FIREBASE_APP_ID; // Renamed to avoid conflict

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
// Optional, but good to check if used by other services or for completeness
if (!storageBucket) {
    firebaseConfigErrorMessage += " - Firebase Env Var Warning: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not defined. (Optional for Auth, but check if other services need it)\n";
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

if (!allCoreConfigPresent) {
  console.error(firebaseConfigErrorMessage);
  // Throw an error to make it very clear in the console that Firebase can't initialize.
  // This helps prevent the app from partially running in a broken state.
  // However, for client-side rendering, throwing an error here might break the app entirely.
  // Logging heavily is often preferred on the client.
  // For server-side (which this file can be part of during build/SSR), an error might be okay.
  // Given the context, we will log extensively and let the app proceed to potentially show an error boundary.
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log("Firebase Config Check: All required NEXT_PUBLIC_FIREBASE_... variables seem to be present.");
    // console.log("Attempting to load Firebase API Key (first 5 chars):", apiKey ? apiKey.substring(0,5) + "..." : "NOT LOADED");
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
    if (process.env.NODE_ENV === 'development' && app) {
      // console.log("Firebase app already initialized, getting existing app for Project ID:", app.options.projectId);
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
    if (allCoreConfigPresent && process.env.NODE_ENV === 'development') { // only warn if config was present but app init failed
        console.warn("Firebase Auth initialization skipped because Firebase app initialization failed or app is undefined, despite core config being present.");
    }
    auth = undefined;
  }
}

export { app, auth };
