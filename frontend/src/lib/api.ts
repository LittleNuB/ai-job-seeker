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
