"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to signin page since we only use Google auth
    router.push("/signin");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Redirecting to Mugen Code sign in...</div>
    </div>
  );
}
