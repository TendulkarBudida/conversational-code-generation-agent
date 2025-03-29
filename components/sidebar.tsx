"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusIcon, LogOut, MessageSquare, Trash2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, getUserPhotoWithFallback } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useSidebar } from "@/context/SidebarContext";

type Conversation = {
  id: string;
  title: string;
  timestamp: number;
  selected?: boolean;
};

interface SidebarProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onClearConversations: () => void;
  onDeleteConversation: (id: string) => void;
  selectedConversationId: string | null;
}

export function Sidebar({
  conversations,
  onSelectConversation,
  onNewChat,
  onClearConversations,
  onDeleteConversation,
  selectedConversationId,
}: SidebarProps) {
  const { isSidebarCollapsed } = useSidebar();
  const { user } = useAuth();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const enhancedPhotoUrl = useMemo(() => {
    return getUserPhotoWithFallback(user);
  }, [user]);

  useEffect(() => {
    if (enhancedPhotoUrl) {
      const img = new Image();
      img.onload = () => {
        setPhotoError(false);
        setIsPageReady(true);
      };
      img.onerror = () => {
        setPhotoError(true);
        setIsPageReady(true);
      };
      img.src = enhancedPhotoUrl;
    } else {
      setIsPageReady(true);
    }
  }, [enhancedPhotoUrl]);

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      } else {
        console.error("Auth instance is null");
      }
      router.push("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const renderConversationGroup = (title: string, convos: Conversation[]) => {
    if (convos.length === 0) return null;
    return (
      <div className="py-2">
        <div className="text-xs font-medium text-gray-500 py-2 px-2">{title}</div>
        <div className="space-y-1">
          {convos.map((conversation) => (
            <div key={conversation.id} className="group relative">
              <Button
                variant="ghost"
                className={`w-full justify-start text-gray-700 font-normal px-2 py-2 h-auto transition-all duration-200 ${
                  selectedConversationId === conversation.id 
                    ? "bg-blue-50 text-blue-700" 
                    : "hover:bg-gray-50"
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-center gap-2 w-full overflow-hidden">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {selectedConversationId === conversation.id ? (
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300" />
                    )}
                  </div>
                  <span className={`truncate ${
                    selectedConversationId === conversation.id ? "font-medium" : ""
                  }`}>
                    {conversation.title || "New conversation"}
                  </span>
                </div>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this conversation?")) {
                    onDeleteConversation(conversation.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Group conversations by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const todayConversations = conversations.filter((c) => {
    const date = new Date(c.timestamp);
    return date.toDateString() === today.toDateString();
  });

  const yesterdayConversations = conversations.filter((c) => {
    const date = new Date(c.timestamp);
    return date.toDateString() === yesterday.toDateString();
  });

  const lastWeekConversations = conversations.filter((c) => {
    const date = new Date(c.timestamp);
    return date > lastWeek && date < new Date(yesterday.setHours(0, 0, 0, 0));
  });

  const olderConversations = conversations.filter((c) => {
    const date = new Date(c.timestamp);
    return date <= lastWeek;
  });

  if (!isPageReady) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className={`relative flex h-full transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[250px]"}`}>
      <div className="border-r border-gray-100 flex flex-col h-full bg-white w-[250px]">
        <div className="p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 h-8 w-8 rounded-full flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <h1 className="font-bold text-xl text-gray-800">Mugen Code</h1>
            </div>
          </div>
          <Button 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center gap-2 py-6 shadow-sm transition-all duration-200"
            onClick={onNewChat}
          >
            <PlusIcon size={16} />
            <span>New chat</span>
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2 pb-4">
          {renderConversationGroup("Today", todayConversations)}
          {renderConversationGroup("Yesterday", yesterdayConversations)}
          {renderConversationGroup("Last 7 Days", lastWeekConversations)}
          {renderConversationGroup("Older", olderConversations)}
        </ScrollArea>
        <div className="mt-auto p-4 border-t border-gray-100 relative">
          <div
            className="flex items-center gap-2 w-full cursor-pointer"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          >
            <Avatar className="h-8 w-8 border-2 border-gray-100 relative">
              {photoError ? (
                <AvatarFallback className="bg-blue-600 text-white">
                  {user?.displayName?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              ) : (
                <AvatarImage src={enhancedPhotoUrl} alt={user?.displayName || "User"} />
              )}
            </Avatar>
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.displayName || "User"}</span>
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
            </div>
          </div>
          {isProfileMenuOpen && (
            <div className="absolute right-4 bottom-14 bg-white shadow-md rounded-md border border-gray-100 py-2 w-40 z-50">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:bg-gray-50 py-2 px-4"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2 text-red" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}