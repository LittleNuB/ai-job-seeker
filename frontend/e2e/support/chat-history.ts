import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

export interface SeededChatHistory {
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
}

const repoRoot = path.resolve(__dirname, "../../..");

function getPythonPath(): string {
  return process.env.E2E_PYTHON || path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe");
}

function getSqliteDbPath(): string {
  return process.env.E2E_SQLITE_DB || path.join(repoRoot, "data", "ai_job_copilot.db");
}

export function seedChatHistory(userId: string): SeededChatHistory {
  const conversationId = randomUUID();
  const userMessageId = randomUUID();
  const assistantMessageId = randomUUID();
  const marker = conversationId.slice(0, 8);
  const userMessage = `E2E 历史问题 ${marker}`;
  const assistantMessage = `E2E 历史回答 ${marker}`;

  const script = `
import sqlite3
import sys

db_path, user_id, conversation_id, user_message_id, assistant_message_id, user_message, assistant_message = sys.argv[1:8]

with sqlite3.connect(db_path) as conn:
    conn.execute(
        "insert into chat_conversations (id, user_id, context_type, context_id, title) values (?, ?, ?, ?, ?)",
        (conversation_id, user_id, "e2e", None, "E2E history"),
    )
    conn.executemany(
        "insert into chat_messages (id, conversation_id, role, content, tool_calls) values (?, ?, ?, ?, ?)",
        [
            (user_message_id, conversation_id, "user", user_message, None),
            (assistant_message_id, conversation_id, "assistant", assistant_message, None),
        ],
    )
    conn.commit()
`;

  execFileSync(
    getPythonPath(),
    [
      "-c",
      script,
      getSqliteDbPath(),
      userId,
      conversationId,
      userMessageId,
      assistantMessageId,
      userMessage,
      assistantMessage,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  return { conversationId, userMessage, assistantMessage };
}
