"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [firebaseReady, setFirebaseReady] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Redirect to chat if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  // Check if Firebase is initialized properly
  useEffect(() => {
    if (auth) {
      setFirebaseReady(true);
    } else {
      setError("Firebase authentication is not available. Please check your configuration.");
    }
  }, []);
  
  const handleGoogleSignIn = async () => {
    if (!firebaseReady) {
      setError("Firebase authentication is not ready yet. Please try again later.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const provider = new GoogleAuthProvider();
      
      // Add standard scopes for better compatibility
      provider.addScope('email');
      provider.addScope('profile');
      
      // Ensure session persistence
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      if (!auth) {
        throw new Error("Firebase authentication is not initialized.");
      }
      const result = await signInWithPopup(auth, provider);
      
      // Log the user object to check for profile information
      console.log("Signed in successfully. User object:", result.user);
      console.log("Display Name:", result.user.displayName);
      console.log("Email:", result.user.email);
      console.log("Photo URL:", result.user.photoURL);
      
      router.push("/chat");
    } catch (error: unknown) {
      console.error("Error signing in with Google:", error);
      
      if (error instanceof Error) {
        if ((error as { code?: string }).code === 'auth/configuration-not-found') {
          setError("Firebase Google authentication is not configured correctly. Please make sure Google authentication is enabled in the Firebase Console.");
        } else {
          setError(`Failed to sign in: ${error.message || "Unknown error"}`);
        }
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't show the sign in page if already signed in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-6 text-white text-center">Sign In to Mugen Code</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex flex-col items-center">
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading || !firebaseReady}
            className="flex items-center justify-center gap-3 w-full bg-white text-gray-800 py-3 px-4 rounded-md transition-colors font-medium hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800"></span>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
          
          <div className="mt-4 text-gray-400 text-sm text-center">
            Make sure to enable pop-ups for this site
          </div>
        </div>
      </div>
    </div>
  );
}
