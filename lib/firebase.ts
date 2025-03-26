// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWZ1hMygl2iTNQhe88dNq01GJliUxJSyg",
  authDomain: "conv-code-generation-agent.firebaseapp.com",
  projectId: "conv-code-generation-agent",
  storageBucket: "conv-code-generation-agent.appspot.com",
  messagingSenderId: "388167119588",
  appId: "1:388167119588:web:45eb17a98caabc3b7b72f1",
  measurementId: "G-V96LP8WM3Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services - with better error handling
let auth;
let db;

try {
  auth = getAuth(app);
  
  // Set persistence to LOCAL (persist even when browser is closed)
  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.error("Error setting auth persistence:", error);
      });
  }
  
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Provide fallbacks if needed
  auth = null;
  db = null;
}

export { auth, db };

// Initialize Analytics only on the client side and when it's needed
export const getAnalyticsInstance = () => {
  if (typeof window !== 'undefined') {
    return import('firebase/analytics').then(({ getAnalytics }) => getAnalytics(app));
  }
  return null;
};

export default app;
