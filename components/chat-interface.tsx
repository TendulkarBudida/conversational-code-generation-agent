"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  MoreVertical, 
  RefreshCw, 
  Send,
  Loader,
  MessageSquare,
  MenuIcon
} from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { getUserPhotoWithFallback } from "@/lib/firebase"
import { useForm } from "react-hook-form"
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSidebar } from "@/context/SidebarContext"

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onRegenerateResponse: (messageId: string) => void;
  isGenerating: boolean;
}

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  onRegenerateResponse,
  isGenerating,
}: ChatInterfaceProps) {
  const form = useForm({
    defaultValues: {
      message: ""
    }
  })
  const { user } = useAuth()
  const { toggleSidebar } = useSidebar()
  const endOfMessagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoLoading, setPhotoLoading] = useState(true)
  const [photoError, setPhotoError] = useState(false)
  
  // Get enhanced photo URL with proper size
  const enhancedPhotoUrl = useMemo(() => {
    return getUserPhotoWithFallback(user);
  }, [user]);
  
  // Check if the photo URL is valid when user data loads
  useEffect(() => {
    if (enhancedPhotoUrl) {
      setPhotoError(false);
      setPhotoLoading(true);
      
      const img = new Image();
      img.onload = () => {
        setPhotoLoading(false);
        setPhotoError(false);
      };
      img.onerror = () => {
        setPhotoLoading(false);
        setPhotoError(true);
      };
      img.src = enhancedPhotoUrl;
    }
  }, [enhancedPhotoUrl]);

  // Ensure light mode is the default mode
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = form.handleSubmit((data) => {
    if (data.message.trim() && !isGenerating) {
      onSendMessage(data.message.trim())
      form.reset()
      
      // Focus the input field after sending message
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  })

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        // Could add a small toast notification here
        console.log('Text copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy text: ', err)
      })
  }

  // Function to render message content with proper markdown and code highlighting
  const renderMessageContent = (content: string) => {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:p-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              if (!inline) {
                // Render code blocks as plain text
                return (
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                    <code {...props}>{String(children)}</code>
                  </pre>
                );
              }

              // Render inline code as plain text
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            // Ensure links open in new tab
            a: ({ node, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              />
            ),
            // Style lists properly
            ul: ({ node, ...props }) => (
              <ul className="list-disc pl-6 my-2" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal pl-6 my-2" {...props} />
            ),
            // Proper heading styles
            h1: ({ node, ...props }) => (
              <h1 className="text-xl font-bold mt-6 mb-2" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-lg font-bold mt-5 mb-2" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-base font-bold mt-4 mb-2" {...props} />
            ),
            // Fix paragraph component to prevent invalid nesting
            p: ({ node, children, ...props }) => {
              const childrenArray = Array.isArray(children) ? children : [children];
              const containsOnlyCodeBlock = childrenArray.some(
                (child) =>
                  typeof child === "object" &&
                  child !== null &&
                  "type" in child &&
                  (child.type === "pre" ||
                    (child.props &&
                      child.props.node &&
                      child.props.node.tagName === "pre"))
              );

              if (containsOnlyCodeBlock) {
                return <>{children}</>;
              }

              return <p className=" " {...props}>{children}</p>;
            },
            // Handle pre elements directly to avoid nesting issues
            pre: ({ node, ...props }) => {
              return <div className="not-prose" {...props}>{props.children}</div>;
            },
            // Style blockquotes
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic my-2"
                {...props}
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-2rem)]">
      <div className="border-b border-gray-100 px-3 md:px-6 py-3 bg-white shadow-sm flex items-center gap-2 md:gap-3">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all z-50"
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={18} />
        </button>
        <h1 className="text-base md:text-lg font-semibold text-gray-800 truncate">Mugen Code Session</h1>
      </div>
      
      <ScrollArea className="flex-1 px-2 md:px-6">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
            <div className="text-center max-w-md bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 mx-2">
              <div className="bg-blue-50 p-3 rounded-full w-12 h-12 md:w-14 md:h-14 mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 md:h-7 md:w-7 text-blue-500" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold mb-2 text-gray-800">Welcome to Mugen Code</h1>
              <p className="text-gray-500 text-sm md:text-base mb-4">
                Start a conversation by typing a message below. Ask for code examples, explanations, or help with programming challenges.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6 pb-4">
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                className={`fade-in animation-delay-${index % 5}`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="flex items-start gap-2 md:gap-3 mt-4">
                  <Avatar className="h-8 w-8 md:h-9 md:w-9 mt-1 flex-shrink-0">
                    {message.role === "user" ? (
                      enhancedPhotoUrl && !photoError ? (
                        <>
                          {photoLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                          <AvatarImage 
                            src={enhancedPhotoUrl} 
                            alt={user?.displayName || "User"} 
                            onLoad={() => setPhotoLoading(false)}
                            onError={() => setPhotoError(true)}
                          />
                        </>
                      ) : (
                        <AvatarFallback className="bg-blue-600 text-white">
                          {user?.displayName?.[0] || user?.email?.[0] || "U"}
                        </AvatarFallback>
                      )
                    ) : (
                      <div className="bg-white h-full w-full flex items-center justify-center border-2 border-blue-100 rounded-full text-xs font-semibold text-blue-600">
                        AI
                      </div>
                    )}
                  </Avatar>

                  <div className={`flex-1 ${message.role === "user" ? "pr-8 md:pr-12" : "pr-2 md:pr-4"}`}>
                    <div className="flex items-center text-xs text-gray-500 mb-1.5">
                      <span className="font-medium">
                        {message.role === "user" ? (user?.displayName || user?.email || "You") : "Mugen"}
                      </span>
                      <span className="mx-2">•</span>
                      <span className="hidden sm:inline">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    
                    <div className={`text-xs md:text-sm p-3 md:p-4 ${
                      message.role === "user" 
                        ? "bg-blue-50 message-bubble-user text-gray-800" 
                        : "bg-white border border-gray-100 shadow-sm message-bubble text-gray-700"
                    }`}>
                      {renderMessageContent(message.content)}
                    </div>

                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 md:h-8 md:w-8 rounded-full border-gray-200 hover:bg-gray-50 hover:text-blue-600"
                          onClick={() => handleCopyToClipboard(message.content)}
                        >
                          <Copy className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto gap-1 text-xs text-gray-500 hover:text-blue-600"
                          onClick={() => onRegenerateResponse(message.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          <span className="hidden sm:inline">Regenerate</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isGenerating && (
          <div className="flex items-center gap-2 md:gap-3 my-4 md:my-6 fade-in">
            <Avatar className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
              <div className="bg-white h-full w-full flex items-center justify-center border-2 border-blue-100 rounded-full text-xs font-semibold text-blue-600">
                AI
              </div>
            </Avatar>
            <div className="bg-white border border-gray-100 shadow-sm message-bubble py-2 md:py-3 px-3 md:px-4">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "600ms" }}></div>
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-500">Generating...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={endOfMessagesRef} />
      </ScrollArea>

      <div className="p-3 md:p-4 border-t border-gray-100 bg-white">
        <Form {...form}>
          <form onSubmit={handleSend} className="relative">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        ref={inputRef}
                        placeholder="Message Mugen..."
                        className="pr-12 py-5 md:py-6 rounded-full border-gray-200 focus:border-blue-300 shadow-sm pl-3 md:pl-4 bg-white text-gray-800 text-sm md:text-base"
                        disabled={isGenerating}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!field.value.trim() || isGenerating}
                        className="absolute right-1 md:right-1.5 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 h-8 w-8 md:h-9 md:w-9 rounded-full shadow-sm transition-all duration-200 ease-in-out"
                      >
                        {isGenerating ? (
                          <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 text-white animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <div className="text-[10px] md:text-xs text-center mt-2 text-gray-400">
          Connect with me on <a href="https://www.linkedin.com/in/tendulkarbudida" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">LinkedIn</a> or <a href="https://github.com/tendulkarbudida" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GitHub</a>.
        </div>
      </div>
    </div>
  );
}
