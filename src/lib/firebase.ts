
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

if (!firebaseConfig.apiKey) {
  console.error(
    "CRITICAL Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing or undefined. " +
    "Please ensure this variable is correctly set in your .env.local file " +
    "and that you have restarted your development server after any changes to .env.local."
  );
  console.error("Firebase initialization will be skipped due to missing API Key.");
}

if (!getApps().length) {
  if (firebaseConfig.apiKey) { // Only attempt to initialize if the API key is somewhat present
    try {
      app = initializeApp(firebaseConfig);
    } catch (e: any) {
      console.error("Firebase app initialization failed:", e.message);
      app = undefined; // Ensure app is undefined if initialization fails
    }
  } else {
    // Warning already logged above
    app = undefined;
  }
} else {
  app = getApp();
}

if (app) {
  try {
    auth = getAuth(app);
  } catch (e: any) {
    console.error("Firebase getAuth(app) failed:", e.message);
    auth = undefined; // Ensure auth is undefined if getAuth fails
  }
} else {
  if (firebaseConfig.apiKey) { // Only log this if an API key was present but app init still failed
      console.warn("Firebase Auth initialization skipped because Firebase app initialization failed or app is undefined.");
  }
  auth = undefined;
}

// Export them, but they might be undefined if initialization failed.
// Code using 'auth' or 'app' should be prepared for this, especially during startup.
export { app, auth };
