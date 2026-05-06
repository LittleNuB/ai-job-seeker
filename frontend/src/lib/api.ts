import { AuthRequiredError, clearAuthSession, getAuthHeaders } from "./auth";

export { getAuthHeaders, getAuthToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function normalizeError(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return "提交内容格式不正确，请检查后再试";
  }
  return fallback;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options?.headers,
      },
      ...options,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      const reason = options?.signal instanceof AbortSignal ? options.signal.reason : undefined;
      if (reason === "timeout") {
        throw new Error("请求超时");
      }
      throw new Error("请求已取消");
    }
    throw new Error("无法连接服务器，请确认后端已启动");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    if (res.status === 401) {
      clearAuthSession();
      throw new AuthRequiredError(normalizeError(error.detail, "请先登录后再继续操作"));
    }
    throw new Error(normalizeError(error.detail, "请求失败，请稍后重试"));
  }
  return res.json();
}

async function downloadFile(path: string, fallbackFilename: string, fallbackError: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    if (res.status === 401) {
      clearAuthSession();
      throw new AuthRequiredError(normalizeError(error.detail, "请先登录后再继续操作"));
    }
    throw new Error(normalizeError(error.detail, fallbackError));
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch?.[1] || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ access_token: string; user_id: string; email: string; name?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user_id: string; email: string; name?: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  profile: () =>
    request<{
      user_id: string;
      email: string;
      name?: string | null;
      created_at?: string | null;
      stats: {
        total_records: number;
        jd_records: number;
        match_records: number;
        chat_conversations: number;
      };
    }>("/api/auth/profile"),
  downloadDataExport: () =>
    downloadFile("/api/auth/export-data", "ai-job-copilot-data.json", "数据导出失败，请稍后重试"),
  deleteAccount: () => request<{ ok: boolean }>("/api/auth/account", { method: "DELETE" }),
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
  getPosition: (id: string) => request<any>(`/api/positions/positions/${id}`),
  semanticSearch: (query: string, topK?: number) =>
    request<{ id: string; name: string; name_en: string; summary: string; score: number }[]>(
      `/api/positions/search?query=${encodeURIComponent(query)}&top_k=${topK || 10}`,
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
  analyze: (data: { resume_text: string; position_id: string; jd_text?: string }, options?: RequestInit) =>
    request<{ record_id: string; match_score: number; result: any }>("/api/match/analyze", {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    }),
};

// Export
export const exportApi = {
  getReportUrl: (recordId: string) => `${API_BASE}/api/export/${recordId}`,
  async downloadReport(recordId: string): Promise<void> {
    await downloadFile(`/api/export/${recordId}`, `analysis-${recordId}.md`, "导出失败，请稍后重试");
  },
};

// Chat
export const chat = {
  getConversations: () =>
    request<{
      items: {
        id: string;
        context_type?: string | null;
        context_id?: string | null;
        title: string;
        message_count: number;
        latest_message_preview?: string | null;
        created_at: string;
        latest_message_at: string;
      }[];
      total: number;
    }>("/api/chat/conversations"),
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
      `/api/chat/conversations/${conversationId}/messages`,
    ),
  deleteConversation: (conversationId: string) =>
    request<{ ok: boolean }>(`/api/chat/conversations/${conversationId}`, { method: "DELETE" }),
};

// Records
export const records = {
  getList: (params?: { page?: number; page_size?: number; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    if (params?.type) qs.set("type", params.type);
    const s = qs.toString();
    return request<{ items: any[]; total: number; page: number; page_size: number }>(
      `/api/records${s ? `?${s}` : ""}`,
    );
  },
  getDetail: (id: string) => request<any>(`/api/records/${id}`),
  deleteRecord: (id: string) => request<any>(`/api/records/${id}`, { method: "DELETE" }),
};

// Streaming Chat
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCalls: (tools: string[], labels: Record<string, string>) => void;
  onDone: (conversationId: string) => void;
  onError: (message: string) => void;
  onAuthRequired?: (message: string) => void;
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
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat/message/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
  } catch {
    callbacks.onError("无法连接服务器，请确认后端已启动");
    return;
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    const message = normalizeError(errorBody.detail, "请求失败，请稍后重试");
    if (res.status === 401) {
      clearAuthSession();
      callbacks.onAuthRequired?.(message);
      if (!callbacks.onAuthRequired) callbacks.onError(message);
      return;
    }
    callbacks.onError(message);
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
