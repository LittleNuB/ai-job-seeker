const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "请求失败");
  }
  return res.json();
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ access_token: string; user_id: string; email: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user_id: string; email: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Positions
export const positions = {
  getCategories: () =>
    request<{ id: string; name: string; description: string; icon: string }[]>("/api/positions/categories"),
  getPositions: (params?: { category_id?: string; query?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category_id) searchParams.set("category_id", params.category_id);
    if (params?.query) searchParams.set("query", params.query);
    const qs = searchParams.toString();
    return request<any[]>(`/api/positions/positions${qs ? `?${qs}` : ""}`);
  },
  getPosition: (id: string) =>
    request<any>(`/api/positions/positions/${id}`),
  semanticSearch: (query: string, topK?: number) =>
    request<{ id: string; name: string; name_en: string; summary: string; score: number }[]>(
      `/api/positions/search?query=${encodeURIComponent(query)}&top_k=${topK || 10}`
    ),
};

// JD
export const jd = {
  analyze: (data: { jd_text: string; position_id?: string }) =>
    request<{ record_id: string; result: any }>("/api/jd/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Match
export const matchApi = {
  analyze: (data: { resume_text: string; position_id: string; jd_text?: string }) =>
    request<{ record_id: string; match_score: number; result: any }>("/api/match/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Export
export const exportApi = {
  getReportUrl: (recordId: string) => `${API_BASE}/api/export/${recordId}`,
};

// Chat
export const chat = {
  sendMessage: (data: {
    message: string;
    conversation_id?: string;
    context_type?: string;
    context_data?: any;
  }) =>
    request<{ conversation_id: string; message: any }>("/api/chat/message", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMessages: (conversationId: string) =>
    request<{ role: string; content: string; tool_calls: any; created_at: string }[]>(
      `/api/chat/conversations/${conversationId}/messages`
    ),
};

// Streaming Chat
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCalls: (tools: string[], labels: Record<string, string>) => void;
  onDone: (conversationId: string) => void;
  onError: (message: string) => void;
}

export async function streamChatMessage(
  data: {
    message: string;
    conversation_id?: string;
    context_type?: string;
    context_data?: any;
  },
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    callbacks.onError(errorBody.detail || "请求失败");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("无法建立流式连接");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        let eventType = "message";
        let eventData = "";

        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6);
          }
        }

        if (!eventData) continue;

        try {
          const parsed = JSON.parse(eventData);
          switch (eventType) {
            case "token":
              callbacks.onToken(parsed.content || "");
              break;
            case "tool_calls":
              callbacks.onToolCalls(parsed.tools || [], parsed.labels || {});
              break;
            case "done":
              callbacks.onDone(parsed.conversation_id);
              break;
            case "error":
              callbacks.onError(parsed.message || "未知错误");
              break;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (err: any) {
    callbacks.onError(err.message || "连接中断");
  }
}
