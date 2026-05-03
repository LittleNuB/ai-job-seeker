"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { chat, streamChatMessage } from "@/lib/api";
import { AuthRequiredError, redirectToLogin, requireAuth } from "@/lib/auth";

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

  function handleToggle() {
    if (!open && !requireAuth()) return;
    setOpen((current) => !current);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    if (!requireAuth()) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true, toolCalls: [], toolLabels: {} },
    ]);

    let receivedAnyToken = false;
    let streamError = false;
    let authRequired = false;

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
          onAuthRequired: () => {
            authRequired = true;
          },
        },
      );
    } catch {
      streamError = true;
    }

    if (authRequired) {
      setMessages((prev) => prev.slice(0, -1));
      setLoading(false);
      redirectToLogin();
      return;
    }

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
            content: res.message?.content || "抱歉，我暂时无法回答这个问题。",
          },
        ]);
      } catch (err: unknown) {
        if (err instanceof AuthRequiredError) {
          redirectToLogin();
          setLoading(false);
          return;
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `出错了：${err instanceof Error ? err.message : "请求失败"}` },
        ]);
      }
    } else if (streamError && receivedAnyToken) {
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
      <button
        type="button"
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg transition-colors hover:bg-blue-700"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="text-sm font-medium">AI 追问</span>
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[520px] w-96 flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">AI 追问</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="mt-8 text-center text-sm text-gray-400">
                对当前页面内容有疑问？可以直接提问。
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {msg.toolCalls.map((tool) => (
                        <span key={tool}>{msg.toolLabels?.[tool] || `正在调用 ${tool}...`}</span>
                      ))}
                    </div>
                  )}
                  {msg.content}
                  {msg.streaming && !msg.toolCalls?.length && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gray-400 align-text-bottom" />
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSend()}
                placeholder="输入你的问题..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
