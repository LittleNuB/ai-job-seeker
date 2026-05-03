import { expect, test } from "@playwright/test";
import { registerUser } from "./support/auth";
import { seedChatHistory } from "./support/chat-history";

test("chat history messages are readable by the owner only", async ({ request }) => {
  const owner = await registerUser(request, "history-owner");
  const intruder = await registerUser(request, "history-intruder");
  const history = seedChatHistory(owner.userId);

  const ownerResponse = await request.get(`/api/chat/conversations/${history.conversationId}/messages`, {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(ownerResponse.ok()).toBeTruthy();

  const messages = (await ownerResponse.json()) as { role: string; content: string }[];
  expect(messages).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ role: "user", content: history.userMessage }),
      expect.objectContaining({ role: "assistant", content: history.assistantMessage }),
    ]),
  );

  const intruderResponse = await request.get(`/api/chat/conversations/${history.conversationId}/messages`, {
    headers: { Authorization: `Bearer ${intruder.token}` },
  });
  expect(intruderResponse.status()).toBe(404);

  const anonymousResponse = await request.get(`/api/chat/conversations/${history.conversationId}/messages`);
  expect(anonymousResponse.status()).toBe(401);
});
