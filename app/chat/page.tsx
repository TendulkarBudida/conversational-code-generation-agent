"use client";

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function ChatPage() {
  const [inputText, setInputText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputText.trim()) {
      try {
        setIsGenerating(true);
        setError("");
        setDebugInfo("Submitting request...");
        const savedInput = inputText;
        
        // Detect language from the input query
        detectLanguageFromQuery(inputText);
        
        // Call the API endpoint
        const response = await fetch('/api/generate-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: inputText }),
        });
        
        setDebugInfo(prev => prev + "\nGot response with status: " + response.status);
        
        const data = await response.json();
        console.log("API response:", data);
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate code');
        }
        
        // Check if code field exists and has content
        if (data.code) {
          console.log("Setting response text to:", data.code.substring(0, 50) + "...");
          setResponseText(data.code);
          detectLanguageFromCode(data.code);
          checkIfMarkdown(data.code);
        } else if (data.steps && data.steps.enhancedCode) {
          // ...existing fallback code...
          setResponseText(data.steps.enhancedCode);
          detectLanguageFromCode(data.steps.enhancedCode);
          checkIfMarkdown(data.steps.enhancedCode);
        } else if (data.steps && data.steps.generatedCode) {
          // ...existing fallback code...
          setResponseText(data.steps.generatedCode);
          detectLanguageFromCode(data.steps.generatedCode);
          checkIfMarkdown(data.steps.generatedCode);
        } else {
          setResponseText("Response received but no code was generated. Please try again.");
          setIsMarkdown(false);
        }
        
        // Only clear the input after successful processing
        setInputText('');
        
      } catch (err: any) {
        console.error('Error generating code:', err);
        setError(err.message || 'An error occurred while generating code');
        setDebugInfo(prev => prev + "\nError: " + (err.message || "Unknown error"));
        setResponseText(""); // Clear any previous response
      } finally {
        setIsGenerating(false);
      }
    }
  };
  
  // Function to detect language from user query
  const detectLanguageFromQuery = (query: string) => {
    const queryLower = query.toLowerCase();
    if (queryLower.includes("python")) {
      setLanguage("python");
    } else if (queryLower.includes("javascript")) {
      setLanguage("javascript");
    } else if (queryLower.includes("typescript")) {
      setLanguage("typescript");
    } else if (queryLower.includes("java ") || queryLower.includes("java.")) {
      setLanguage("java");
    } else if (queryLower.includes("c#")) {
      setLanguage("csharp");
    } else if (queryLower.includes("c++")) {
      setLanguage("cpp");
    }
  };
  
  // Function to detect language from generated code
  const detectLanguageFromCode = (code: string) => {
    if (!code) return;
    
    if (code.includes("def ") && code.includes(":")) {
      setLanguage("python");
    } else if (code.includes("function ") || code.includes("const ") || code.includes("let ")) {
      if (code.includes(": ") && code.includes("interface ")) {
        setLanguage("typescript");
      } else {
        setLanguage("javascript"); 
      }
    } else if (code.includes("class ") && code.includes("{") && code.includes("public static void main")) {
      setLanguage("java");
    } else if (code.includes("#include") && code.includes("int main(")) {
      setLanguage("cpp");
    } else if (code.includes("namespace") && code.includes("using System;")) {
      setLanguage("csharp");
    }
  };

  // Check if content is markdown
  const checkIfMarkdown = (text: string) => {
    // Check for common markdown patterns
    const markdownPatterns = [
      /^#\s+.+$/m, // Headers
      /\[.+\]\(.+\)/, // Links
      /\*\*.+\*\*/, // Bold
      /\*.+\*/, // Italic
      /^\s*[-*+]\s+.+$/m, // Lists
      /^\s*\d+\.\s+.+$/m, // Numbered lists
      /^\s*```[\s\S]+?```$/m, // Code blocks
      /^\s*>\s+.+$/m, // Blockquotes
      /\|.+\|.+\|/  // Tables
    ];
    
    const hasMarkdownFeatures = markdownPatterns.some(pattern => pattern.test(text));
    
    // If it has both code elements and markdown features, it's probably markdown with code blocks
    if (hasMarkdownFeatures) {
      setIsMarkdown(true);
    } else {
      setIsMarkdown(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If not logged in and not loading, don't render content
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-md p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-white">Code Generation</h1>
          
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md transition-colors"
          >
            Log Out
          </button>
        </div>
        
        {user && (
          <div className="mb-4 text-sm text-gray-300">
            Signed in as: {user.displayName || user.email}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe the code you want (e.g., 'Write a Python function to sort a list')"
            className="w-full h-32 p-3 border border-gray-700 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          />
          <button 
            type="submit" 
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors flex justify-center items-center"
            disabled={isGenerating || !inputText.trim()}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                Generating Code...
              </>
            ) : "Generate Code"}
          </button>
        </form>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium text-white">Generated Code</h2>
            {!isMarkdown && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="sql">SQL</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>
            )}
          </div>
          
          {responseText ? (
            isMarkdown ? (
              <div className="markdown-content bg-gray-700 border border-gray-600 rounded-md p-4 text-white overflow-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          language={match[1]}
                          style={vscDarkPlus}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={`${className} bg-gray-800 px-1 py-0.5 rounded`} {...props}>
                          {children}
                        </code>
                      );
                    },
                    // Style other markdown elements
                    p: ({children}) => <p className="mb-4">{children}</p>,
                    h1: ({children}) => <h1 className="text-xl font-bold my-4">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-bold my-3">{children}</h2>,
                    h3: ({children}) => <h3 className="text-md font-bold my-2">{children}</h3>,
                    ul: ({children}) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                    li: ({children}) => <li className="mb-1">{children}</li>,
                    a: ({children, href}) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-gray-500 pl-4 py-1 my-2 bg-gray-800/30">{children}</blockquote>,
                  }}
                >
                  {responseText}
                </ReactMarkdown>
              </div>
            ) : (
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                className="min-h-24 rounded-md overflow-auto"
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid rgb(75, 85, 99)', // border-gray-600
                }}
                showLineNumbers={true}
                wrapLongLines={false}
              >
                {responseText}
              </SyntaxHighlighter>
            )
          ) : (
            <div className="min-h-24 p-3 bg-gray-700 border border-gray-600 rounded-md whitespace-pre-wrap text-white overflow-auto font-mono text-sm">
              Your generated code will appear here...
            </div>
          )}
        </div>
        
        {/* Debug information section - only visible in development */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mt-4 p-2 border border-yellow-500 bg-yellow-500/10 rounded text-xs text-yellow-200 font-mono">
            <div className="font-bold mb-1">Debug Info:</div>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
}