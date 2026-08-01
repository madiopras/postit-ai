import { expect, test } from '@playwright/test';

const firstSessionId = '55555555-5555-4555-8555-555555555555';
const secondSessionId = '66666666-6666-4666-8666-666666666666';

function sessionData() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  return [
    {
      id: firstSessionId,
      title: 'Reset password kantor',
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
    {
      id: secondSessionId,
      title: 'Prosedur refund pelanggan',
      createdAt: yesterday.toISOString(),
      updatedAt: yesterday.toISOString(),
    },
  ];
}

test('desktop history supports loading, grouping, search, and current semantics', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({ status: 200, json: { success: true, data: sessionData() } });
  });
  await page.route(new RegExp(`/api/chat/sessions/${firstSessionId}`), async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        data: {
          messages: [{ role: 'assistant', content: 'Detail reset password' }],
        },
      },
    });
  });
  await page.goto('/');

  await expect(page.getByRole('status', { name: 'Memuat riwayat percakapan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hari ini' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kemarin' })).toBeVisible();
  if (process.env.CAPTURE_PHASE3 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-3/chat-history-desktop.png',
      fullPage: true,
    });
  }

  const resetSession = page.getByRole('button', { name: /^Reset password kantor/ });
  await resetSession.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Detail reset password')).toBeVisible();
  await expect(resetSession).toHaveAttribute('aria-current', 'page');

  const search = page.getByRole('textbox', { name: 'Cari percakapan' });
  await search.fill('REFUND');
  await expect(page.locator('aside').getByText('Prosedur refund pelanggan', { exact: true })).toBeVisible();
  await expect(page.locator('aside').getByText('Reset password kantor', { exact: true })).toHaveCount(0);

  await search.fill('tidak ditemukan');
  await expect(page.getByText('Tidak ada percakapan yang cocok.')).toBeVisible();
  await page.getByRole('button', { name: 'Hapus pencarian', exact: true }).last().click();
  await expect(page.locator('aside').getByText('Reset password kantor', { exact: true })).toBeVisible();
});

test('mobile slideout closes after selecting a session and starting a new chat', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: sessionData() } });
  });
  await page.route(new RegExp(`/api/chat/sessions/${firstSessionId}`), async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        data: {
          messages: [{ role: 'assistant', content: 'Jawaban mobile terpilih' }],
        },
      },
    });
  });
  await page.goto('/');

  const historyTrigger = page.getByRole('button', { name: 'Buka riwayat chat' });
  await historyTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Riwayat chat' })).toBeVisible();
  if (process.env.CAPTURE_PHASE3 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-3/chat-history-mobile.png',
      fullPage: true,
    });
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Riwayat chat' })).toHaveCount(0);
  await expect(historyTrigger).toBeFocused();

  await historyTrigger.click();
  await page.getByRole('button', { name: /^Reset password kantor/ }).click();
  await expect(page.getByRole('dialog', { name: 'Riwayat chat' })).toHaveCount(0);
  await expect(page.getByText('Jawaban mobile terpilih')).toBeVisible();

  await historyTrigger.click();
  await page.getByRole('button', { name: 'Chat baru', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Riwayat chat' })).toHaveCount(0);
  await expect(page.getByText('Apa yang ingin Anda cari hari ini?')).toBeVisible();
});

test('history error can retry without reloading the page', async ({ page }) => {
  let attempt = 0;
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } });
      return;
    }
    await route.fulfill({ status: 200, json: { success: true, data: sessionData() } });
  });
  await page.goto('/');

  await expect(page.getByText('Riwayat percakapan tidak dapat dimuat.')).toBeVisible();
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.locator('aside').getByText('Reset password kantor', { exact: true })).toBeVisible();
  await expect(page.getByText('Riwayat percakapan tidak dapat dimuat.')).toHaveCount(0);
});

test('delete confirms, rolls back visibly on failure, and clears an active chat on success', async ({
  page,
}) => {
  let deleteAttempt = 0;
  let deleted = false;
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: deleted
          ? sessionData().filter((session) => session.id !== firstSessionId)
          : sessionData(),
      },
    });
  });
  await page.route(new RegExp(`/api/chat/sessions/${firstSessionId}`), async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            messages: [{ role: 'assistant', content: 'Percakapan aktif' }],
          },
        },
      });
      return;
    }

    deleteAttempt += 1;
    if (deleteAttempt === 1) {
      await route.fulfill({ status: 500, json: { error: { message: 'Delete failed' } } });
      return;
    }
    deleted = true;
    await route.fulfill({ status: 200, json: { success: true } });
  });
  await page.goto('/');

  await page.getByRole('button', { name: /^Reset password kantor/ }).click();
  await expect(page.getByText('Percakapan aktif')).toBeVisible();
  await page.getByRole('button', { name: 'Hapus percakapan Reset password kantor' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Hapus percakapan “Reset password kantor”?');
  await expect(page.getByRole('button', { name: 'Batal' })).toBeFocused();
  await page.getByRole('button', { name: 'Hapus percakapan', exact: true }).click();

  await expect(page.getByText('Percakapan tidak dapat dihapus. Coba lagi.')).toBeVisible();
  await expect(page.locator('aside').getByText('Reset password kantor', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hapus percakapan Reset password kantor' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Hapus percakapan Reset password kantor' }).click();
  await page.getByRole('button', { name: 'Hapus percakapan', exact: true }).click();
  await expect(page.getByText('Apa yang ingin Anda cari hari ini?')).toBeVisible();
  await expect(page.getByText('Reset password kantor', { exact: true })).toHaveCount(0);
});

test('shell has no page overflow at contract breakpoints and supports dark theme', async ({
  page,
}) => {
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
  await page.goto('/');

  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);
  }

  await page.getByRole('button', { name: 'Ganti tema terang/gelap' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

async function prepareVisualCapture(page: import('@playwright/test').Page) {
  await page.waitForTimeout(250);
  const devTools = page.locator('nextjs-portal');
  if (await devTools.count()) {
    await devTools.evaluate((element) => {
      element.setAttribute('style', 'display: none');
    });
  }
}
