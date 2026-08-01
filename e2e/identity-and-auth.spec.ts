import { expect, test } from '@playwright/test';

const visitorId = '30000000-0000-4000-8000-000000000003';

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/chat\/sessions\?visitorId=/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
});

test('visitor sees a login action and keeps public chat access', async ({ page }) => {
  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 401,
      json: {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Login required' },
      },
    });
  });

  await page.goto('/');

  const login = page.getByRole('link', { name: 'Masuk' });
  await expect(login).toBeVisible();
  await expect(login).toHaveAttribute('href', '/login?redirect=/');
  await expect(page.getByRole('textbox', { name: 'Tanyakan sesuatu' })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Buka menu profil/ })).toHaveCount(0);
});

test('regular user gets profile and logout without a dashboard link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let loggedOut = false;
  let logoutAttempts = 0;

  await page.route(/\/api\/auth\/me$/, async (route) => {
    if (loggedOut) {
      await route.fulfill({ status: 401, json: { success: false } });
      return;
    }
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          id: 'user-1',
          username: 'rani',
          displayName: 'Rani Putri',
          role: 'user',
          status: 'active',
        },
      },
    });
  });
  await page.route(/\/api\/auth\/logout$/, async (route) => {
    logoutAttempts += 1;
    if (logoutAttempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({ status: 500, json: { error: 'Failed' } });
      return;
    }
    loggedOut = true;
    await route.fulfill({ status: 200, json: { ok: true } });
  });

  await page.goto('/');
  const profile = page.getByRole('button', { name: 'Buka menu profil Rani Putri' });
  await expect(profile).toBeVisible();
  await expect(page.getByText(/Halo, Rani Putri\./)).toBeVisible();
  await profile.click();
  await expect(page.getByText('@rani')).toBeVisible();
  await expect(page.getByText('Pengguna', { exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Buka dashboard' })).toHaveCount(0);

  if (process.env.CAPTURE_PHASE5 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-5/chat-profile-mobile.png',
      fullPage: true,
    });
  }

  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page.getByText('Logout gagal. Sesi Anda masih aktif. Silakan coba lagi.')).toBeVisible();
  await expect(profile).toBeVisible();

  await profile.click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Masuk' })).toBeVisible();
  expect(logoutAttempts).toBe(2);
});

test('admin profile exposes the authorized dashboard action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          id: 'admin-1',
          username: 'budi.admin',
          displayName: 'Budi Admin',
          role: 'admin',
          status: 'active',
        },
      },
    });
  });

  await page.goto('/');
  const profile = page.getByRole('button', { name: 'Buka menu profil Budi Admin' });
  await profile.focus();
  await profile.press('Enter');
  const dashboard = page.getByRole('menuitem', { name: 'Buka dashboard' });
  await expect(dashboard).toBeVisible();
  await expect(dashboard).toHaveAttribute('href', '/dashboard');
  await page.keyboard.press('Escape');
  await expect(profile).toBeFocused();
  await profile.press('Enter');

  if (process.env.CAPTURE_PHASE5 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-5/chat-profile-desktop.png',
      fullPage: true,
    });
  }
});

test('login is localized, blocks external redirects, and preserves history on merge failure', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('hydrated')) {
      hydrationErrors.push(message.text());
    }
  });
  await page.addInitScript((id) => {
    window.localStorage.setItem('postit_visitor_id', id);
  }, visitorId);
  let mergeBody: unknown;

  await page.route(/\/api\/auth\/login$/, async (route) => {
    await expect.poll(() => route.request().postDataJSON()).toEqual({
      username: 'rani',
      password: 'secret-value',
    });
    await route.fulfill({ status: 200, json: { user: { username: 'rani' } } });
  });
  await page.route(/\/api\/chat\/history\/merge$/, async (route) => {
    mergeBody = route.request().postDataJSON();
    await route.fulfill({
      status: 500,
      json: {
        success: false,
        error: {
          code: 'HISTORY_MERGE_FAILED',
          message: 'Riwayat visitor belum dapat digabungkan.',
        },
      },
    });
  });
  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          id: 'user-1',
          username: 'rani',
          displayName: 'Rani Putri',
          role: 'user',
          status: 'active',
        },
      },
    });
  });

  await page.goto('/login?redirect=%2F%2Fevil.example');
  await expect(page.getByRole('heading', { name: 'Masuk ke akun Anda' })).toBeVisible();
  await expect(page.getByText('PostIt AI', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeFocused();

  if (process.env.CAPTURE_PHASE5 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-5/login-desktop.png',
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Ganti tema terang/gelap' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() =>
      page.getByLabel('Username').evaluate((element) => {
        const container = element.parentElement;
        return container ? getComputedStyle(container).backgroundColor : null;
      })
    ).toBe('rgb(12, 17, 29)');
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-5/login-dark-desktop.png',
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Ganti tema terang/gelap' }).click();
  }

  const password = page.getByRole('textbox', { name: 'Kata sandi' });
  await page.getByLabel('Username').fill('rani');
  await password.fill('secret-value');
  await page.getByRole('button', { name: 'Tampilkan kata sandi' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();

  await expect(page).toHaveURL('/');
  await expect(
    page.getByText(
      'Riwayat visitor belum dapat digabungkan. Riwayat lama tetap tersimpan di browser ini.'
    )
  ).toBeVisible();
  expect(mergeBody).toEqual({ visitorId });
  expect(hydrationErrors).toEqual([]);
});

test('login failure is localized and moves focus to the alert', async ({ page }) => {
  await page.route(/\/api\/auth\/login$/, async (route) => {
    await route.fulfill({
      status: 401,
      json: { error: 'Invalid credentials' },
    });
  });

  await page.goto('/login');
  await page.getByLabel('Username').fill('unknown');
  await page.getByRole('textbox', { name: 'Kata sandi' }).fill('wrong-password');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();

  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Username atau kata sandi salah.' });
  await expect(alert).toHaveText('Username atau kata sandi salah.');
  await expect(alert).toBeFocused();
  await expect(page).toHaveURL('/login');
});

async function prepareVisualCapture(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    window.localStorage.setItem('postit_theme', 'light');
    document.documentElement.classList.remove('dark');
    document.querySelector('nextjs-portal')?.remove();
  });
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
}
