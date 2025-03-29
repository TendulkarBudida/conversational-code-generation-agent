"use client";

import { Sidebar } from "@/components/sidebar";
import { ChatInterface } from "@/components/chat-interface";

export default function ChatPage() {
  return (
    <main className="flex h-screen bg-gray-50">
      <Sidebar
        conversations={[]}
        onSelectConversation={() => {}}
        onNewChat={() => {}}
        onClearConversations={() => {}}
        onDeleteConversation={() => {}}
        selectedConversationId={null}
      />
      <ChatInterface
        messages={[]}
        onSendMessage={() => {}}
        onRegenerateResponse={() => {}}
        isGenerating={false}
      />
    </main>
  );
}
