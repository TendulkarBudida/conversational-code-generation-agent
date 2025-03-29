// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, User } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

import { Auth } from "firebase/auth";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCWZ1hMygl2iTNQhe88dNq01GJliUxJSyg",
  authDomain: "conv-code-generation-agent.firebaseapp.com",
  projectId: "conv-code-generation-agent",
  storageBucket: "conv-code-generation-agent",
  messagingSenderId: "388167119588",
  appId: "1:388167119588:web:45eb17a98caabc3b7b72f1",
  measurementId: "G-V96LP8WM3Y"
};

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
