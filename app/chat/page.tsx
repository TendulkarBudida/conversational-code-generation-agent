"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/lib/AuthContext";
import { Sidebar } from "@/components/sidebar";
import { ChatInterface } from "@/components/chat-interface";
import { MessageSquare } from "lucide-react";
import { 
  getAllChats, 
  startNewChat, 
  addMessageToChat, 
  deleteChat, 
  clearAllChats,
  Conversation
} from "@/lib/firestore-service";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  // Load conversations from Firestore on mount
  useEffect(() => {
    async function loadConversations() {
      if (user) {
        setIsLoading(true);
        try {
          const loadedConversations = await getAllChats();
          setConversations(loadedConversations);

          // Select the most recent conversation if available
          if (loadedConversations.length > 0) {
            const mostRecent = loadedConversations.reduce((prev: Conversation, current: Conversation) => 
              current.timestamp > prev.timestamp ? current : prev, loadedConversations[0]
            );
            setSelectedConversationId(mostRecent.id);
          }
        } catch (error) {
          console.error("Error loading conversations:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      loadConversations();
    }
  }, [user]);

  // Create a new chat
  const handleNewChat = async () => {
    if (!user) return;

    try {
      const newConversation = await startNewChat(user.uid);
      if (newConversation) {
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversationId(newConversation.id);
      }
    } catch (error) {
      console.error("Error creating new conversation:", error);
    }
  };

  // Select a conversation
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  // Clear all conversations
  const handleClearConversations = async () => {
    if (!user) return;

    if (window.confirm("Are you sure you want to clear all conversations? This cannot be undone.")) {
      try {
        const success = await clearAllChats();
        if (success) {
          setConversations([]);
          setSelectedConversationId(null);
        }
      } catch (error) {
        console.error("Error clearing conversations:", error);
      }
    }
  };

  // Handle deleting a single conversation
  const handleDeleteConversation = async (id: string) => {
    if (!user) return;

    try {
      const success = await deleteChat(id); // Ensure the correct chat ID is passed
      if (success) {
        setConversations(prevConversations =>
          prevConversations.filter(conv => conv.id !== id)
        );

        // If we're deleting the currently selected conversation, select another one or null
        if (selectedConversationId === id) {
          const remainingConversations = conversations.filter(conv => conv.id !== id);
          if (remainingConversations.length > 0) {
            const mostRecent = remainingConversations.reduce((prev, current) =>
              current.timestamp > prev.timestamp ? current : prev
            );
            setSelectedConversationId(mostRecent.id);
          } else {
            setSelectedConversationId(null);
          }
        }
      } else {
        console.error("Failed to delete conversation in Firestore.");
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  // Send a new message
  const handleSendMessage = async (content: string) => {
    if (!user) return;

    const timestamp = Date.now();

    // If no conversation is selected, create a new one
    let currentConversationId = selectedConversationId;
    if (!currentConversationId) {
      try {
        const newConversation = await startNewChat(); // Create a new chat in Firestore
        if (!newConversation) return;

        setConversations(prev => [newConversation, ...prev]);
        currentConversationId = newConversation.id;
        setSelectedConversationId(newConversation.id);
      } catch (error) {
        console.error("Error creating new conversation:", error);
        return;
      }
    }

    // Create user message
    const userMessage = {
      id: uuidv4(),
      role: "user" as const,
      content,
      timestamp
    };

    // Optimistically update UI
    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              title: conv.messages.length === 0 ? content.substring(0, 30) + "..." : conv.title,
              timestamp
            }
          : conv
      )
    );

    // Add message to Firestore
    try {
      await addMessageToChat(currentConversationId, content, "user");
    } catch (error) {
      console.error("Error saving user message:", error);
    }

    // Generate AI response
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: content }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      // Extract the AI response
      const aiContent = data.code || "Sorry, I couldn't generate a response. Please try again.";

      // Create AI message
      const aiMessage = {
        id: uuidv4(),
        role: "assistant" as const,
        content: aiContent,
        timestamp: Date.now()
      };

      // Update UI optimistically
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === currentConversationId
            ? {
                ...conv,
                messages: [...conv.messages, aiMessage],
                timestamp: aiMessage.timestamp
              }
            : conv
        )
      );

      // Add AI message to Firestore
      await addMessageToChat(currentConversationId, aiContent, "assistant");
    } catch (error) {
      console.error("Error generating response:", error);

      // Add error message
      const errorMessage = {
        id: uuidv4(),
        role: "assistant" as const,
        content: "Sorry, I encountered an error while generating a response. Please try again.",
        timestamp: Date.now()
      };

      // Update UI with error message
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === currentConversationId
            ? {
                ...conv,
                messages: [...conv.messages, errorMessage],
                timestamp: errorMessage.timestamp
              }
            : conv
        )
      );

      // Save error message to Firestore
      await addMessageToChat(currentConversationId, errorMessage.content, "assistant");
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate the last AI response
  const handleRegenerateResponse = async (messageId: string) => {
    // Find the conversation and message to regenerate
    const conversation = conversations.find(c => c.id === selectedConversationId);
    if (!conversation || !user) return;

    // Find the message index and the previous user message
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex < 1) return;

    // Find the most recent user message before this assistant message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0) {
      if (conversation.messages[userMessageIndex].role === "user") {
        break;
      }
      userMessageIndex--;
    }

    if (userMessageIndex < 0) return;

    const userMessage = conversation.messages[userMessageIndex];

    // Remove this and all following messages from the UI
    const updatedMessages = conversation.messages.slice(0, messageIndex);
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === selectedConversationId
          ? {
              ...conv,
              messages: updatedMessages,
              timestamp: Date.now()
            }
          : conv
      )
    );

    // Generate a new response
    await handleSendMessage(userMessage.content);
  };

  // Get the selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Show loading states
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-blue-500 h-12 w-12 rounded-full flex items-center justify-center animate-pulse">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div className="text-gray-600">Loading your conversations...</div>
        </div>
      </div>
    );
  }

  // If not logged in and not loading, don't render content
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onClearConversations={handleClearConversations}
        onDeleteConversation={handleDeleteConversation}
        selectedConversationId={selectedConversationId}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatInterface
          messages={selectedConversation?.messages || []}
          onSendMessage={handleSendMessage}
          onRegenerateResponse={handleRegenerateResponse}
          isGenerating={isGenerating}
        />
      </main>
    </div>
  );
}