import { expect, test, type Page } from "@playwright/test";

async function gotoFoundation(page: Page) {
  await page.goto("/dev/ui-foundation");
  await expect(page.locator("main")).toHaveAttribute("data-hydrated", "true");
}

test.describe("Untitled UI foundation spike", () => {
  test("keeps scoped light and dark token surfaces distinct", async ({ page }) => {
    await gotoFoundation(page);

    const lightSurface = page.getByTestId("light-surface");
    const darkSurface = page.getByTestId("dark-surface");

    await expect(lightSurface).toBeVisible();
    await expect(darkSurface).toBeVisible();

    const lightBackground = await lightSurface.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const darkBackground = await darkSurface.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );

    expect(lightBackground).not.toBe(darkBackground);
  });

  test("exposes loading and invalid states accessibly", async ({ page }) => {
    await gotoFoundation(page);

    const lightSurface = page.getByTestId("light-surface");
    const loadingButton = lightSurface.getByRole("button", {
      name: "Memproses",
    });

    await expect(loadingButton).toBeDisabled();
    await expect(loadingButton).toHaveAttribute("aria-busy", "true");
    await expect(lightSurface.getByText(/kode akses tidak dikenali/i)).toBeVisible();
    await expect(lightSurface.getByLabel("Kode akses")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("supports keyboard focus, modal dismissal, and focus restoration", async ({
    page,
  }) => {
    await gotoFoundation(page);

    const trigger = page
      .getByTestId("light-surface")
      .getByRole("button", { name: "Buka modal" });

    await trigger.press("Enter");

    const dialog = page.getByRole("dialog", {
      name: "Konfirmasi foundation",
    });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Batal" })).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
