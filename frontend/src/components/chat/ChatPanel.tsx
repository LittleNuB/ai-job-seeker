"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { chat, streamChatMessage } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
  toolLabels?: Record<string, string>;
  streaming?: boolean;
}

interface ChatPanelProps {
  contextType?: "explore" | "jd" | "match";
  contextData?: any;
}

export default function ChatPanel({ contextType, contextData }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    // Add placeholder assistant message for streaming
    const assistantIdx = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true, toolCalls: [], toolLabels: {} },
    ]);

    let receivedAnyToken = false;
    let streamError = false;

    try {
      await streamChatMessage(
        {
          message: text,
          conversation_id: conversationId,
          context_type: contextType,
          context_data: contextData,
        },
        {
          onToken: (token) => {
            receivedAnyToken = true;
            setMessages((prev) => {
              const updated = [...prev];
              const msg = { ...updated[assistantIdx] };
              msg.content += token;
              updated[assistantIdx] = msg;
              return updated;
            });
          },
          onToolCalls: (tools, labels) => {
            setMessages((prev) => {
              const updated = [...prev];
              const msg = { ...updated[assistantIdx] };
              msg.toolCalls = tools;
              msg.toolLabels = labels;
              updated[assistantIdx] = msg;
              return updated;
            });
          },
          onDone: (convId) => {
            setConversationId(convId);
            setMessages((prev) => {
              const updated = [...prev];
              const msg = { ...updated[assistantIdx] };
              msg.streaming = false;
              msg.toolCalls = [];
              msg.toolLabels = {};
              updated[assistantIdx] = msg;
              return updated;
            });
          },
          onError: () => {
            streamError = true;
          },
        },
      );
    } catch {
      streamError = true;
    }

    // Fallback to non-streaming if no tokens received
    if (streamError && !receivedAnyToken) {
      setMessages((prev) => prev.slice(0, -1));
      try {
        const res = await chat.sendMessage({
          message: text,
          conversation_id: conversationId,
          context_type: contextType,
          context_data: contextData,
        });
        setConversationId(res.conversation_id);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.message?.content || "抱歉，我无法回答这个问题。",
          },
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `出错了：${err.message}` },
        ]);
      }
    } else if (streamError && receivedAnyToken) {
      // Partial response received — just mark as done
      setMessages((prev) => {
        const updated = [...prev];
        const msg = { ...updated[assistantIdx] };
        msg.streaming = false;
        msg.toolCalls = [];
        updated[assistantIdx] = msg;
        return updated;
      });
    }

    setLoading(false);
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-6 bottom-6 z-50 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-sm font-medium">AI追问</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed right-6 bottom-20 z-50 w-96 h-[520px] bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">AI 追问</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-400 mt-8">
                对当前页面内容有疑问？直接提问吧
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {/* Tool call indicators */}
                  {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {msg.toolCalls.map((tool) => (
                        <span key={tool}>
                          {msg.toolLabels?.[tool] || `正在调用 ${tool}...`}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Content */}
                  {msg.content}
                  {/* Streaming cursor */}
                  {msg.streaming && !msg.toolCalls?.length && (
                    <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="输入你的问题..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
