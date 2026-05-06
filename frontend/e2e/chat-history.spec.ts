import { expect, test, type Page } from "@playwright/test";
import { apiPath, registerUser } from "./support/auth";
import { seedChatHistory } from "./support/chat-history";

async function installSession(page: Page, user: { token: string; email: string }) {
  await page.goto("/");
  await page.evaluate(
    ({ token, email }) => {
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("auth_email", email);
    },
    { token: user.token, email: user.email },
  );
}

test("chat history messages are readable by the owner only", async ({ request }) => {
  const owner = await registerUser(request, "history-owner");
  const intruder = await registerUser(request, "history-intruder");
  const history = seedChatHistory(owner.userId);

  const ownerResponse = await request.get(apiPath(`/api/chat/conversations/${history.conversationId}/messages`), {
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

  const intruderResponse = await request.get(apiPath(`/api/chat/conversations/${history.conversationId}/messages`), {
    headers: { Authorization: `Bearer ${intruder.token}` },
  });
  expect(intruderResponse.status()).toBe(404);

  const ownerList = await request.get(apiPath("/api/chat/conversations"), {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(ownerList.ok()).toBeTruthy();
  const ownerItems = (await ownerList.json()) as {
    items: { id: string; title: string; message_count: number; latest_message_preview: string }[];
  };
  expect(ownerItems.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: history.conversationId,
        title: "E2E history",
        message_count: 2,
        latest_message_preview: history.assistantMessage,
      }),
    ]),
  );

  const intruderList = await request.get(apiPath("/api/chat/conversations"), {
    headers: { Authorization: `Bearer ${intruder.token}` },
  });
  expect(intruderList.ok()).toBeTruthy();
  const intruderItems = (await intruderList.json()) as { items: { id: string }[] };
  expect(intruderItems.items.some((item) => item.id === history.conversationId)).toBe(false);

  const intruderDelete = await request.delete(apiPath(`/api/chat/conversations/${history.conversationId}`), {
    headers: { Authorization: `Bearer ${intruder.token}` },
  });
  expect(intruderDelete.status()).toBe(404);

  const anonymousResponse = await request.get(apiPath(`/api/chat/conversations/${history.conversationId}/messages`));
  expect(anonymousResponse.status()).toBe(401);

  const anonymousList = await request.get(apiPath("/api/chat/conversations"));
  expect(anonymousList.status()).toBe(401);

  const anonymousDelete = await request.delete(apiPath(`/api/chat/conversations/${history.conversationId}`));
  expect(anonymousDelete.status()).toBe(401);

  const ownerDelete = await request.delete(apiPath(`/api/chat/conversations/${history.conversationId}`), {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(ownerDelete.ok()).toBeTruthy();

  const deletedMessages = await request.get(apiPath(`/api/chat/conversations/${history.conversationId}/messages`), {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(deletedMessages.status()).toBe(404);
});

test("history page lists and deletes AI conversations", async ({ page, request }) => {
  const owner = await registerUser(request, "history-ui");
  const history = seedChatHistory(owner.userId);
  await installSession(page, owner);

  await page.goto("/history");
  await page.getByRole("button", { name: "AI 对话" }).click();
  await expect(page.getByText("E2E history")).toBeVisible();
  await expect(page.getByText(history.assistantMessage)).toBeVisible();

  await page.getByRole("button", { name: "查看对话" }).click();
  await expect(page.getByText(history.userMessage)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("E2E history")).toBeHidden();
});
