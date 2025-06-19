
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Log the API key status to help debug if it's being loaded from .env.local.
// This log will appear in your server-side development console.
if (process.env.NODE_ENV === 'development') {
  console.log(
    "Firebase Service: Attempting to load Firebase API Key from environment variables. Status: ",
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "LOADED" : "NOT LOADED or Undefined"
  );
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    // console.log("Firebase Service: API Key starts with: ", process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0,5) + "..."); // Uncomment for more detailed debugging if needed
  } else {
    console.error(
        "Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is not defined. " +
        "Please ensure this variable is set in your .env.local file and you have restarted the development server."
    );
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

// Check if all required config values are present
const requiredConfigValues = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  // storageBucket is not strictly required for Auth alone but good to check
  // messagingSenderId is not strictly required for Auth alone
  // appId is not strictly required for Auth alone
];

const allCoreConfigPresent = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

if (!allCoreConfigPresent) {
  console.error(
    "CRITICAL Firebase Error: One or more core Firebase configuration values (apiKey, authDomain, projectId) are missing from environment variables (.env.local). " +
    "Please ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set and you have restarted your development server."
  );
  console.error("Firebase initialization will be skipped due to missing core configuration.");
}

if (allCoreConfigPresent) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.log("Firebase app initialized successfully.");
      }
    } catch (e: any) {
      console.error("Firebase app initialization failed:", e.message);
      app = undefined; 
    }
  } else {
    app = getApp();
    if (process.env.NODE_ENV === 'development' && app) {
      console.log("Firebase app already initialized, getting existing app.");
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
} else {
    // Ensure app and auth are undefined if config is missing
    app = undefined;
    auth = undefined;
}


export { app, auth };
