"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /chat
    router.push("/chat");
  }, [router]);

  return null; // Render nothing as the user is being redirected
}




// "use client";

// import { Sidebar } from "@/components/sidebar";
// import { ChatInterface } from "@/components/chat-interface";

// export default function ChatPage() {
//   return (
//     <main className="flex h-screen bg-gray-50">
//       <Sidebar
//         conversations={[]}
//         onSelectConversation={() => {}}
//         onNewChat={() => {}}
//         onClearConversations={() => {}}
//         onDeleteConversation={() => {}}
//         selectedConversationId={null}
//       />
//       <ChatInterface
//         messages={[]}
//         onSendMessage={() => {}}
//         onRegenerateResponse={() => {}}
//         isGenerating={false}
//       />
//     </main>
//   );
// }