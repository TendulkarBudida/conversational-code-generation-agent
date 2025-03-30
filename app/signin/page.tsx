"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare } from "lucide-react";

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
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      if (!auth) {
        throw new Error("Firebase authentication is not initialized.");
      }
      const result = await signInWithPopup(auth, provider);
      
      console.log("Signed in successfully. User object:", result.user);
      
      router.push("/chat");
    } catch (error: unknown) {
      console.error("Error signing in with Google:", error);
      
      if (error instanceof Error) {
        if ((error as { code?: string }).code === 'auth/configuration-not-found') {
          setError("Firebase Google authentication is not configured correctly.");
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-blue-500 p-3 animate-pulse">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't show the sign in page if already signed in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left column - Decorative banner */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-500 to-blue-600 p-8 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Mugen Code</h1>
          </div>
          
          <div className="mt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Code Generation <br />Made Conversational
            </h2>
            <p className="text-blue-100 text-lg max-w-md">
              Generate clean, functional code through natural language conversations. 
              Just describe what you need, and we&apos;ll do the rest.
            </p>
          </div>
        </div>
        
        <div className="text-blue-100 text-sm">
          © {new Date().getFullYear()} Mugen Code. All rights reserved.
        </div>
      </div>
      
      {/* Right column - Sign in form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="bg-blue-500 p-2 rounded-full">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Mugen Code</h1>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Welcome</h2>
            <p className="text-gray-500 text-center mb-8">Sign in to start coding with AI</p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <button 
              onClick={handleGoogleSignIn}
              disabled={isLoading || !firebaseReady}
              className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 border border-gray-300 rounded-xl transition-all duration-200 relative overflow-hidden shadow-sm"
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
              <span>Continue with Google</span>
            </button>
            
            <div className="mt-6 text-gray-400 text-xs text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </div>
          
          {/* Features preview */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="m4 17 6-6-6-6"></path>
                  <path d="m12 17 6-6-6-6"></path>
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-800">Code Generation</h3>
              <p className="text-xs text-gray-500 mt-1">
                Generate code in Python, JavaScript, and more
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M12 7.05A4.95 4.95 0 0 1 7.05 12"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="m12 12 4 4"></path>
                  <path d="M12 12v8"></path>
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-800">High Performance</h3>
              <p className="text-xs text-gray-500 mt-1">
                Optimized code for your specific needs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
