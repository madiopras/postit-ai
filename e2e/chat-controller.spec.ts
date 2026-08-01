import { expect, test } from '@playwright/test';

const emptySessions = { success: true, data: [] };

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({ status: 200, json: emptySessions });
  });
});

test('controller renders streamed content and terminal message metadata', async ({ page }) => {
  await page.route(/\/api\/chat$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        'event: status\ndata: {"type":"retrieving"}\n\n',
        'data: {"content":"Jawaban dari "}\n\n',
        'data: {"content":"stream."}\n\n',
        'event: done\ndata: {"chatId":"11111111-1111-4111-8111-111111111111","messageId":"22222222-2222-4222-8222-222222222222","sources":[],"loginRequired":false}\n\n',
      ].join(''),
    });
  });
  await page.goto('/');

  await page.locator('textarea').fill('Pertanyaan phase dua');
  await page.getByRole('button', { name: 'Kirim pesan' }).click();

  await expect(page.getByText('Pertanyaan phase dua', { exact: true })).toBeVisible();
  await expect(page.getByText('Jawaban dari stream.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jawaban membantu' })).toBeVisible();
});

test('controller removes an empty placeholder and shows an API failure', async ({ page }) => {
  await page.route(/\/api\/chat$/, async (route) => {
    await route.fulfill({
      status: 503,
      json: { error: { message: 'Layanan AI sedang tidak tersedia' } },
    });
  });
  await page.goto('/');

  await page.locator('textarea').fill('Pertanyaan gagal');
  await page.getByRole('button', { name: 'Kirim pesan' }).click();

  await expect(
    page.getByText(
      'Jawaban tidak dapat dimuat. Pertanyaan Anda tetap terlihat dan aman untuk dikirim ulang.'
    )
  ).toBeVisible();
  await expect(page.getByText('Layanan AI sedang tidak tersedia')).toHaveCount(0);
  await expect(page.getByText('Pertanyaan gagal', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jawaban membantu' })).toHaveCount(0);
});

test('a slow session response cannot overwrite the newer selection', async ({ page }) => {
  const slowId = '33333333-3333-4333-8333-333333333333';
  const fastId = '44444444-4444-4444-8444-444444444444';

  await page.unroute(/\/api\/chat\/sessions\?visitorId=/);
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [
          {
            id: slowId,
            title: 'Session lambat',
            createdAt: '2026-08-01T01:00:00.000Z',
            updatedAt: '2026-08-01T02:00:00.000Z',
          },
          {
            id: fastId,
            title: 'Session cepat',
            createdAt: '2026-08-01T01:00:00.000Z',
            updatedAt: '2026-08-01T01:30:00.000Z',
          },
        ],
      },
    });
  });
  await page.route(new RegExp(`/api/chat/sessions/${slowId}`), async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      json: {
        data: {
          messages: [{ role: 'assistant', content: 'Jawaban session lambat' }],
        },
      },
    });
  });
  await page.route(new RegExp(`/api/chat/sessions/${fastId}`), async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        data: {
          messages: [{ role: 'assistant', content: 'Jawaban session cepat' }],
        },
      },
    });
  });
  await page.goto('/');

  await page.getByText('Session lambat', { exact: true }).click();
  await page.getByText('Session cepat', { exact: true }).click();

  await expect(page.getByText('Jawaban session cepat', { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.getByText('Jawaban session lambat', { exact: true })).toHaveCount(0);
});
