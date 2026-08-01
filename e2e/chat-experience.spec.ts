import { expect, test } from '@playwright/test';

const sessionId = '77777777-7777-4777-8777-777777777777';

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
});

test('suggestions fill and focus the composer without submitting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let chatRequests = 0;
  await page.route(/\/api\/chat$/, async (route) => {
    chatRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        'data: {"content":"Jawaban suggestion"}\n\n',
        'event: done\ndata: {"chatId":"77777777-7777-4777-8777-777777777777","messageId":"88888888-8888-4888-8888-888888888888","sources":[],"loginRequired":false}\n\n',
      ].join(''),
    });
  });
  await page.goto('/');

  if (process.env.CAPTURE_PHASE4 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-4/chat-empty-mobile.png',
      fullPage: true,
    });
  }

  await expect(page.getByRole('button', { name: /Bagaimana|Apa prosedur/ })).toHaveCount(4);
  await page.getByRole('button', { name: 'Bagaimana cara reset password?' }).click();

  const composer = page.getByRole('textbox', { name: 'Tanyakan sesuatu' });
  await expect(composer).toHaveValue('Bagaimana cara reset password?');
  await expect(composer).toBeFocused();
  expect(chatRequests).toBe(0);

  await composer.press('Shift+Enter');
  await expect(composer).toHaveValue('Bagaimana cara reset password?\n');
  expect(chatRequests).toBe(0);

  await composer.evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        isComposing: true,
      })
    );
  });
  expect(chatRequests).toBe(0);

  await composer.press('Enter');
  await expect(page.getByText('Jawaban suggestion')).toBeVisible();
  expect(chatRequests).toBe(1);
  await expect(composer).toHaveValue('');
  await expect(composer).toBeFocused();
});

test('copy and feedback actions activate only after the terminal frame', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.endsWith('/api/chat') || init?.method !== 'POST') {
        return originalFetch(input, init);
      }

      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('event: status\ndata: {"type":"streaming"}\n\n')
            );
            window.setTimeout(() => {
              controller.enqueue(
                encoder.encode('data: {"content":"Jawaban bertahap"}\n\n')
              );
            }, 250);
            window.setTimeout(() => {
              controller.enqueue(
                encoder.encode(
                  'event: done\ndata: {"chatId":"77777777-7777-4777-8777-777777777777","messageId":"88888888-8888-4888-8888-888888888888","sources":[],"loginRequired":false}\n\n'
                )
              );
              controller.close();
            }, 900);
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } }
      );
    };
  });
  await page.goto('/');

  const composer = page.getByRole('textbox', { name: 'Tanyakan sesuatu' });
  await composer.fill('Tunjukkan streaming');
  await composer.press('Enter');

  await expect(page.getByText('Menyiapkan jawaban...')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salin jawaban' })).toHaveCount(0);
  await expect(page.getByText('Jawaban bertahap')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salin jawaban' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salin jawaban' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jawaban membantu' })).toBeVisible();
});

test('renders safe Markdown, localized sources, copy states, and feedback rollback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          if (document.documentElement.dataset.failClipboard === 'true') {
            throw new Error('Clipboard denied');
          }
          document.documentElement.dataset.copiedText = text;
        },
      },
    });
  });
  const markdown = [
    '## Langkah utama',
    '',
    '- Buka **pengaturan akun**',
    '- Jalankan `reset-password`',
    '',
    '| Tahap | Status |',
    '| --- | --- |',
    '| Verifikasi | Selesai |',
    '',
    '[Dokumentasi](https://example.com/help)',
  ].join('\n');
  await page.route(/\/api\/chat$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        `data: ${JSON.stringify({ content: markdown })}\n\n`,
        `event: done\ndata: ${JSON.stringify({
          chatId: sessionId,
          messageId: '88888888-8888-4888-8888-888888888888',
          sources: [
            {
              id: 'faq-1',
              type: 'faq',
              title: 'Panduan reset password',
              content: 'Gunakan menu pengaturan akun untuk memulai reset password.',
              score: 0.86,
              metadata: { internalPath: '/should-not-render' },
            },
          ],
          loginRequired: false,
        })}\n\n`,
      ].join(''),
    });
  });
  await page.route(/\/api\/feedback\//, async (route) => {
    if (route.request().postData()?.includes('thumbs_down')) {
      await route.fulfill({ status: 500, json: { error: { message: 'Failed' } } });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({ status: 200, json: { success: true } });
  });
  await page.goto('/');

  const composer = page.getByRole('textbox', { name: 'Tanyakan sesuatu' });
  await composer.fill('Bagaimana reset password?');
  await composer.press('Enter');

  await expect(page.getByRole('heading', { name: 'Langkah utama' })).toBeVisible();
  const externalLink = page.getByRole('link', { name: 'Dokumentasi' });
  await expect(externalLink).toHaveAttribute('target', '_blank');
  await expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('table')).toBeVisible();

  await page.getByRole('button', { name: 'Lihat 1 sumber' }).click();
  await expect(page.getByText('Panduan reset password')).toBeVisible();
  await expect(page.getByText('Relevansi 86%')).toBeVisible();
  await expect(page.getByText('/should-not-render')).toHaveCount(0);
  if (process.env.CAPTURE_PHASE4 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-4/chat-timeline-desktop.png',
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Ganti tema terang/gelap' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.poll(() =>
    composer.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { background: styles.backgroundColor, color: styles.color };
    })
  ).toEqual({ background: 'rgb(12, 17, 29)', color: 'rgb(249, 250, 251)' });
  if (process.env.CAPTURE_PHASE4 === '1') {
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-4/chat-timeline-dark-desktop.png',
      fullPage: true,
    });
  }

  await page.getByRole('button', { name: 'Salin jawaban' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Tersalin' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', markdown);

  await page.locator('html').evaluate((element) => {
    element.dataset.failClipboard = 'true';
  });
  await page.getByRole('button', { name: 'Tersalin' }).click();
  await expect(page.getByText('Gagal menyalin jawaban.')).toBeVisible();

  const helpful = page.getByRole('button', { name: 'Jawaban membantu' });
  await helpful.click();
  await expect(helpful).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Menyimpan feedback...')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jawaban kurang tepat' })).toBeDisabled();
  await expect(page.getByText('Feedback tersimpan.')).toBeVisible();

  await page.getByRole('button', { name: 'Jawaban kurang tepat' }).click();
  await expect(page.getByText('Feedback gagal disimpan. Pilihan dikembalikan.')).toBeVisible();
  await expect(helpful).toHaveAttribute('aria-pressed', 'true');

  await expect(page.getByText(/Retry|Regenerate/i)).toHaveCount(0);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('restricted SOP is not duplicated and keeps login guidance inside the answer', async ({
  page,
}) => {
  const restrictedMessage =
    'Informasi tersebut tersedia dalam SOP yang memerlukan login. Silakan login untuk melanjutkan.';
  await page.route(/\/api\/chat$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        `event: login_required\ndata: ${JSON.stringify({ message: restrictedMessage })}\n\n`,
        `data: ${JSON.stringify({ content: restrictedMessage })}\n\n`,
        `event: done\ndata: ${JSON.stringify({
          chatId: sessionId,
          messageId: '88888888-8888-4888-8888-888888888888',
          sources: [],
          loginRequired: true,
        })}\n\n`,
      ].join(''),
    });
  });
  await page.goto('/');

  const composer = page.getByRole('textbox', { name: 'Tanyakan sesuatu' });
  await composer.fill('Buka SOP internal');
  await composer.press('Enter');

  await expect(page.getByText(restrictedMessage, { exact: true })).toHaveCount(1);
  await expect(
    page.getByLabel('Jawaban PostIt AI').getByText('Login diperlukan untuk membuka SOP')
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login untuk membuka SOP' })).toHaveAttribute(
    'href',
    '/login?redirect=/'
  );
  await expect(page.getByRole('button', { name: /Lihat .* sumber/ })).toHaveCount(0);
});

test('scroll-to-bottom appears when reading older messages', async ({ page }) => {
  const now = new Date().toISOString();
  await page.unroute(/\/api\/chat\/sessions\?visitorId=/);
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [{ id: sessionId, title: 'Percakapan panjang', createdAt: now, updatedAt: now }],
      },
    });
  });
  await page.route(new RegExp(`/api/chat/sessions/${sessionId}`), async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        data: {
          messages: Array.from({ length: 24 }, (_, index) => ({
            id: `message-${index}`,
            role: index % 2 === 0 ? 'user' : 'assistant',
            content: `Pesan panjang nomor ${index + 1}. ${'Konten tambahan '.repeat(8)}`,
          })),
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Percakapan panjang/ }).click();
  await expect(page.getByText(/Pesan panjang nomor 24/)).toBeVisible();

  const timeline = page.getByRole('main', { name: 'Percakapan' });
  await timeline.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect(page.getByRole('button', { name: 'Ke pesan terbaru' })).toBeVisible();
  await page.getByRole('button', { name: 'Ke pesan terbaru' }).click();
  await expect.poll(async () =>
    timeline.evaluate(
      (element) => element.scrollHeight - element.scrollTop - element.clientHeight
    )
  ).toBeLessThanOrEqual(80);
});

async function prepareVisualCapture(page: import('@playwright/test').Page) {
  await page.waitForTimeout(150);
  const devTools = page.locator('nextjs-portal');
  if (await devTools.count()) {
    await devTools.evaluate((element) => {
      element.setAttribute('style', 'display: none');
    });
  }
}
