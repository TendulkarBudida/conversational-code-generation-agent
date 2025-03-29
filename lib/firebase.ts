// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, User } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

import { Auth } from "firebase/auth";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate required Firebase configuration
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error("Missing required Firebase configuration. Check your .env file.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  auth = getAuth(app);

  // Set persistence to LOCAL (persist even when browser is closed)
  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Error setting auth persistence:", error);
    });
  }

  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
  auth = null;
  db = null;
}

// Export Firebase services
export { auth, db };
export default app;

// Helpers to deal with user data
export function getUserPhotoWithFallback(user: any): string {
  if (user?.photoURL) {
    try {
      const url = new URL(user.photoURL);
      return url.toString();
    } catch {
      console.warn("Invalid photo URL, using fallback.");
    }
  }
  return "/default-profile.png"; // Return a default image if no valid photo URL is available
}
