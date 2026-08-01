import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoAccessibilityViolations(page: Page, surface: string) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target.join(" "),
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  }));

  expect(violations, `${surface} accessibility violations`).toEqual([]);
}

async function prepareVisualCapture(page: Page) {
  await page.addStyleTag({
    content: [
      "nextjs-portal, [data-next-badge-root] { display: none !important; }",
      "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
    ].join("\n"),
  });
  await page.evaluate(() => document.fonts.ready);
}

test("public chat and login pass the automated WCAG A/AA audit", async ({ page }) => {
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 401,
      json: { success: false, error: { code: "UNAUTHORIZED" } },
    });
  });

  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Tanyakan sesuatu" })).toBeEnabled();
  await expectNoAccessibilityViolations(page, "public chat");
  if (process.env.CAPTURE_PHASE7 === "1") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepareVisualCapture(page);
    await page.screenshot({
      path: "docs/enhancement/go2/phase-7/chat-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "docs/enhancement/go2/phase-7/chat-mobile.png",
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Ganti tema terang/gelap" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(200);
  await expectNoAccessibilityViolations(page, "public chat dark mode");
  await page.getByRole("button", { name: "Ganti tema terang/gelap" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Masuk ke akun Anda" })).toBeVisible();
  await expectNoAccessibilityViolations(page, "login");
  if (process.env.CAPTURE_PHASE7 === "1") {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: "docs/enhancement/go2/phase-7/login-desktop.png",
      fullPage: true,
    });
  }
});

test("dashboard overview passes the automated WCAG A/AA audit", async ({ page }) => {
  const loginResponse = await page.request.post("/api/auth/login", {
    data: {
      username: process.env.E2E_ADMIN_USERNAME ?? "admin",
      password: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
    },
  });
  expect(loginResponse.ok()).toBe(true);

  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          id: "accessibility-admin",
          username: "admin",
          displayName: "Super Admin",
          role: "super_admin",
          status: "active",
        },
      },
    });
  });
  await page.route(/\/api\/stats$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          faqs: { total: 4, published: 3, draft: 1, error: 0 },
          sops: { total: 2, published: 2, draft: 0, error: 0 },
          documents: {
            total: 8,
            embedded: 8,
            missingEmbedding: 0,
            faq: 4,
            sop: 4,
            error: 0,
          },
          conversations: { total: 12, last7Days: 5 },
          messages: { total: 30, user: 15, assistant: 15 },
          feedback: { thumbsUp: 8, thumbsDown: 2, rated: 10 },
          trend: [
            { date: "2026-07-31", chats: 2, messages: 5 },
            { date: "2026-08-01", chats: 3, messages: 7 },
          ],
        },
      },
    });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expectNoAccessibilityViolations(page, "dashboard overview");
  if (process.env.CAPTURE_PHASE7 === "1") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepareVisualCapture(page);
    await page.screenshot({
      path: "docs/enhancement/go2/phase-7/dashboard-desktop.png",
      fullPage: true,
    });
  }

  await page.getByRole("button", { name: "Ganti tema terang/gelap" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(200);
  await expectNoAccessibilityViolations(page, "dashboard overview dark mode");
  if (process.env.CAPTURE_PHASE7 === "1") {
    await page.screenshot({
      path: "docs/enhancement/go2/phase-7/dashboard-dark-desktop.png",
      fullPage: true,
    });
  }
});
