import { expect, test, type Page } from '@playwright/test';

const stats = {
  faqs: { total: 4, published: 3, draft: 1, error: 0 },
  sops: { total: 2, published: 2, draft: 0, error: 0 },
  documents: { total: 8, embedded: 8, missingEmbedding: 0, faq: 4, sop: 4, error: 0 },
  conversations: { total: 12, last7Days: 5 },
  messages: { total: 30, user: 15, assistant: 15 },
  feedback: { thumbsUp: 8, thumbsDown: 2, rated: 10 },
  trend: [
    { date: '2026-07-31', chats: 2, messages: 5 },
    { date: '2026-08-01', chats: 3, messages: 7 },
  ],
};

async function loginAsSuperAdmin(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: {
      username: process.env.E2E_ADMIN_USERNAME ?? 'admin',
      password: process.env.E2E_ADMIN_PASSWORD ?? 'admin123',
    },
  });
  expect(response.ok()).toBe(true);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function mockDashboardIdentity(page: Page, role: 'admin' | 'super_admin' = 'super_admin') {
  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          id: 'dashboard-admin',
          username: 'admin',
          displayName: role === 'super_admin' ? 'Super Admin' : 'Admin Operasional',
          role,
          status: 'active',
        },
      },
    });
  });
}

async function prepareVisualCapture(page: Page) {
  await page.addStyleTag({
    content: 'nextjs-portal, [data-next-badge-root] { display: none !important; }',
  });
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/stats$/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: stats } });
  });
});

test('dashboard shell exposes Untitled navigation, profile, chart, and role-aware items', async ({ page }) => {
  await mockDashboardIdentity(page);
  await loginAsSuperAdmin(page);

  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu utama' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Konfigurasi AI' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Grafik 12 pesan dan 5 percakapan/ })).toBeVisible();

  if (process.env.CAPTURE_PHASE6 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-6/dashboard-overview-desktop.png',
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Ganti tema terang/gelap' }).click();
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-6/dashboard-overview-dark-desktop.png',
      fullPage: true,
    });
  }

  const profile = page.getByRole('button', { name: 'Buka menu profil Super Admin' });
  await profile.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Keluar' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profile).toBeFocused();
});

test('operational admin does not see super-admin navigation', async ({ page }) => {
  await mockDashboardIdentity(page, 'admin');
  await loginAsSuperAdmin(page);

  await expect(page.getByRole('link', { name: 'FAQ' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pengguna' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Konfigurasi AI' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Log audit' })).toHaveCount(0);
});

test('mobile navigation uses a dismissable slideout and keeps active links discoverable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockDashboardIdentity(page);
  await loginAsSuperAdmin(page);

  await page.getByRole('button', { name: 'Buka navigasi dashboard' }).click();
  const navigationDialog = page.getByRole('dialog', { name: 'Navigasi dashboard' });
  await expect(navigationDialog).toBeVisible();
  await expect(navigationDialog.getByRole('link', { name: 'FAQ' })).toBeVisible();

  if (process.env.CAPTURE_PHASE6 === '1') {
    await prepareVisualCapture(page);
    await page.screenshot({
      path: 'docs/enhancement/go2/phase-6/dashboard-mobile-navigation.png',
      fullPage: true,
    });
  }

  await page.keyboard.press('Escape');
  await expect(navigationDialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Buka navigasi dashboard' })).toBeFocused();
});

test('user form keeps API behavior through the migrated modal and select', async ({ page }) => {
  await mockDashboardIdentity(page);
  let requestBody: Record<string, unknown> | null = null;

  await page.route(/\/api\/users\?/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
  await page.route(/\/api\/users$/, async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      json: {
        success: true,
        data: {
          id: 'new-user',
          ...requestBody,
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
  });

  await loginAsSuperAdmin(page);
  await page.getByRole('link', { name: 'Pengguna' }).click();
  await expect(page.getByRole('heading', { name: 'Kelola pengguna' })).toBeVisible();
  await page.getByRole('button', { name: 'Tambah pengguna' }).click();

  const dialog = page.getByRole('dialog', { name: 'Tambah pengguna' });
  await dialog.getByLabel('Username').fill('sari');
  await dialog.getByLabel('Nama tampilan').fill('Sari Dewi');
  await dialog.getByLabel('Kata sandi').fill('password-kuat');
  await dialog.getByLabel('Status awal').selectOption('inactive');
  await dialog.getByRole('button', { name: 'Simpan' }).click();

  await expect(dialog).toBeHidden();
  expect(requestBody).toEqual({
    username: 'sari',
    displayName: 'Sari Dewi',
    status: 'inactive',
    password: 'password-kuat',
  });
});

test('FAQ, SOP, documents, admins, configuration, and audit modules render in the migrated shell', async ({ page }) => {
  await mockDashboardIdentity(page);
  await page.route(/\/api\/faq(?:\?.*)?$/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [], meta: { total: 0 } } });
  });
  await page.route(/\/api\/sop$/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
  await page.route(/\/api\/documents\?/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [], meta: { total: 0 } } });
  });
  await page.route(/\/api\/admins\?/, async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
  await page.route(/\/api\/audit-logs\?/, async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true, data: [], meta: { totalPages: 1 } },
    });
  });
  await page.route(/\/api\/config$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          embedding: { baseUrl: '', model: '', hasApiKey: false, apiKeyPreview: '' },
          llm: { baseUrl: '', model: '', hasApiKey: false, apiKeyPreview: '' },
          behaviour: {
            persona: 'Asisten PostIt AI',
            tone: 'professional',
            detailLevel: 'medium',
            language: 'id',
            useEmoji: false,
          },
          responseRules: {
            knowledgeOnly: true,
            noHallucination: true,
            fallbackMessage: 'Informasi tidak ditemukan.',
            enforceDocumentAccess: true,
          },
          responseDictionary: { forbiddenWords: [], requiredWords: [] },
          retrieval: {
            topK: 5,
            similarityThreshold: 0.5,
            sourcePriority: 'balanced',
            selectionRule: 'highest_score',
            maxContextDocuments: 5,
          },
          fallback: {
            embeddingBaseUrl: '',
            embeddingModel: '',
            llmBaseUrl: '',
            llmModel: '',
          },
        },
      },
    });
  });

  await loginAsSuperAdmin(page);

  const modules = [
    ['/dashboard/faq', 'Kelola FAQ'],
    ['/dashboard/sop', 'Kelola SOP'],
    ['/dashboard/documents', 'Dokumen'],
    ['/dashboard/admins', 'Kelola admin'],
    ['/dashboard/config', 'Konfigurasi AI'],
    ['/dashboard/audit-logs', 'Log audit'],
  ] as const;

  for (const [href, heading] of modules) {
    await page.goto(href);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('#dashboard-main')).toBeVisible();
  }
});

test('overview API failure stays inside the shell and can be retried', async ({ page }) => {
  await page.unroute(/\/api\/stats$/);
  let attempts = 0;
  await page.route(/\/api\/stats$/, async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        json: { success: false, error: { message: 'Statistik sementara tidak tersedia' } },
      });
      return;
    }
    await route.fulfill({ status: 200, json: { success: true, data: stats } });
  });
  await mockDashboardIdentity(page);
  await loginAsSuperAdmin(page);

  const errorAlert = page.getByRole('alert').filter({ hasText: 'Statistik sementara tidak tersedia' });
  await expect(errorAlert).toBeVisible();
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByText('5 dari 6 entri published')).toBeVisible();
  await expect(errorAlert).toHaveCount(0);
});
