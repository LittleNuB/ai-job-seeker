import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const E2E_PASSWORD = "E2ePass123!";
const configuredApiBaseUrl = process.env.E2E_API_BASE_URL?.replace(/\/$/, "");

export interface E2EUser {
  email: string;
  password: string;
  token: string;
  userId: string;
}

export function uniqueEmail(prefix: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `e2e-${prefix}-${suffix}@example.com`;
}

export function apiPath(path: string): string {
  return configuredApiBaseUrl ? `${configuredApiBaseUrl}${path}` : path;
}

export async function registerUser(request: APIRequestContext, prefix = "user"): Promise<E2EUser> {
  const email = uniqueEmail(prefix);
  const response = await request.post(apiPath("/api/auth/register"), {
    data: {
      email,
      password: E2E_PASSWORD,
      name: "E2E User",
      accepted_terms: true,
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { access_token: string; user_id: string };

  return {
    email,
    password: E2E_PASSWORD,
    token: body.access_token,
    userId: body.user_id,
  };
}

export async function registerThroughUi(page: Page, nextPath: string): Promise<E2EUser> {
  const email = uniqueEmail("ui");

  await page.goto(`/auth?next=${encodeURIComponent(nextPath)}`);
  await page.getByRole("button", { name: "还没有账号？创建一个" }).click();
  await page.getByLabel(/昵称/).fill("E2E User");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(E2E_PASSWORD);
  await page.getByLabel(/我已阅读并同意/).check();
  await page.getByRole("button", { name: "注册并登录" }).click();

  await expect(page).toHaveURL(new RegExp(`${nextPath.replace("/", "\\/")}$`));
  const session = await page.evaluate(() => ({
    token: window.localStorage.getItem("auth_token"),
    email: window.localStorage.getItem("auth_email"),
  }));

  expect(session.email).toBe(email);
  expect(session.token).toBeTruthy();

  return {
    email,
    password: E2E_PASSWORD,
    token: session.token!,
    userId: "",
  };
}
