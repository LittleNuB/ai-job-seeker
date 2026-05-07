import { expect, test, type Page } from "@playwright/test";
import { apiPath, registerUser } from "./support/auth";
import { seedJdRecord, seedMatchRecord } from "./support/records";

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

test("analysis records are scoped and deletable by owner only", async ({ request }) => {
  const owner = await registerUser(request, "rec-owner");
  const intruder = await registerUser(request, "rec-intruder");
  const jdRecord = seedJdRecord(owner.userId);
  const matchRecord = seedMatchRecord(owner.userId);

  // Owner can see both records in list
  const ownerList = await request.get(apiPath("/api/records"), {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(ownerList.ok()).toBeTruthy();
  const ownerItems = (await ownerList.json()) as { items: { id: string }[] };
  const ownerIds = ownerItems.items.map((i) => i.id);
  expect(ownerIds).toContain(jdRecord.recordId);
  expect(ownerIds).toContain(matchRecord.recordId);

  // Intruder list does not include owner's records
  const intruderList = await request.get(apiPath("/api/records"), {
    headers: { Authorization: `Bearer ${intruder.token}` },
  });
  expect(intruderList.ok()).toBeTruthy();
  const intruderItems = (await intruderList.json()) as { items: { id: string }[] };
  const intruderIds = intruderItems.items.map((i) => i.id);
  expect(intruderIds).not.toContain(jdRecord.recordId);
  expect(intruderIds).not.toContain(matchRecord.recordId);

  // Intruder cannot delete owner's records
  const intruderDeleteJd = await request.delete(apiPath(`/api/records/${jdRecord.recordId}`), {
    headers: { Authorization: `Bearer ${intruder.token}` },
  });
  expect(intruderDeleteJd.status()).toBe(404);

  // Anonymous cannot access records
  const anonList = await request.get(apiPath("/api/records"));
  expect(anonList.status()).toBe(401);
  const anonDelete = await request.delete(apiPath(`/api/records/${jdRecord.recordId}`));
  expect(anonDelete.status()).toBe(401);

  // Owner can delete JD record
  const ownerDeleteJd = await request.delete(apiPath(`/api/records/${jdRecord.recordId}`), {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(ownerDeleteJd.ok()).toBeTruthy();

  // Deleted record returns 404
  const deletedDetail = await request.get(apiPath(`/api/records/${jdRecord.recordId}`), {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(deletedDetail.status()).toBe(404);

  // Match record still exists
  const matchDetail = await request.get(apiPath(`/api/records/${matchRecord.recordId}`), {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(matchDetail.ok()).toBeTruthy();
});

test("history page lists and deletes analysis records", async ({ page, request }) => {
  const owner = await registerUser(request, "rec-ui");
  seedJdRecord(owner.userId);
  seedMatchRecord(owner.userId);
  await installSession(page, owner);

  await page.goto("/history");
  // Default view is "分析记录" tab (records) with type filter buttons
  await expect(page.getByRole("button", { name: "JD 解析" })).toBeVisible();
  await expect(page.getByRole("button", { name: "简历匹配" })).toBeVisible();
  await expect(page.getByText("E2E JD input text")).toBeVisible();
  await expect(page.getByText("E2E match input text")).toBeVisible();

  // Filter to JD only
  await page.getByRole("button", { name: "JD 解析" }).click();
  await expect(page.getByText("E2E JD input text")).toBeVisible();
  await expect(page.getByText("E2E match input text")).toBeHidden();

  // Delete the JD record via confirmation dialog
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTitle("删除").first().click();
  await expect(page.getByText("E2E JD input text")).toBeHidden();

  // Filter back to all - match record still present
  await page.getByRole("button", { name: "全部" }).click();
  await expect(page.getByText("E2E match input text")).toBeVisible();
});
