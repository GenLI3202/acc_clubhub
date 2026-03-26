# Layer 3 测试计划 (修订版)

> **范围**: Phase 3.1 (CMS) + Phase 3.2 (Content Collections) + Phase 3.3 (Dynamic Pages)  
> **修订**: 移除不可行的 Vitest astro:content 测试，增加 CI/CD

---

## 一、测试策略

| 层级 | 测试类型 | 工具 | 运行时机 |
|------|----------|------|----------|
| Schema | 类型检查 | `astro check` | 每次提交 |
| 构建 | 静态生成 | `astro build` | 每次提交 |
| 单元 | i18n 函数 | Vitest | 每次提交 |
| E2E | 页面功能 | Playwright | PR / 发布 |
| CMS | 手动验收 | decap-server | 发布前 |

---

## 二、环境准备

### 2.1 安装依赖

```bash
cd frontend
npm install -D vitest playwright @playwright/test
npx playwright install chromium
```

### 2.2 package.json 脚本

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run check && npm run test && npm run build"
  }
}
```

### 2.3 配置文件

```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

```typescript
// frontend/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 667 } } },
  ],
});
```

---

## 三、测试用例

### 3.1 Schema 验证 (astro check)

```bash
npx astro check
```

**验证内容**:
- ✅ content.config.ts Zod schema 正确
- ✅ 所有 Markdown frontmatter 符合 schema
- ✅ TypeScript 类型无错误

### 3.2 构建测试 (astro build)

```bash
npm run build
```

**验证内容**:
- ✅ 所有静态页面成功生成
- ✅ 无运行时错误
- ✅ 输出到 dist/ 目录

### 3.3 i18n 单元测试 (Vitest)

```typescript
// frontend/src/lib/__tests__/i18n.test.ts
import { describe, it, expect } from 'vitest';
import { 
  getLangFromEntry, 
  getLocaleFromUrl, 
  t, 
  locales,
  getNavLinks 
} from '../i18n';

describe('getLangFromEntry', () => {
  it('extracts zh from media path', () => {
    expect(getLangFromEntry(
      'src/content/media/zh/alps-summer-2025.md', 
      'media'
    )).toBe('zh');
  });

  it('extracts en from nested gear path', () => {
    expect(getLangFromEntry(
      'src/content/knowledge/gear/en/bike-guide.md', 
      'gear'
    )).toBe('en');
  });

  it('extracts de from routes path', () => {
    expect(getLangFromEntry(
      'src/content/routes/de/some-route.md', 
      'routes'
    )).toBe('de');
  });

  it('fallbacks to zh for invalid path', () => {
    expect(getLangFromEntry('invalid/path.md', 'media')).toBe('zh');
  });

  it('fallbacks to zh when collection not found', () => {
    expect(getLangFromEntry('src/content/other/zh/file.md', 'media')).toBe('zh');
  });
});

describe('getLocaleFromUrl', () => {
  it('parses /zh/ url', () => {
    expect(getLocaleFromUrl(new URL('http://localhost/zh/media'))).toBe('zh');
  });

  it('parses /en/ url', () => {
    expect(getLocaleFromUrl(new URL('http://localhost/en/about'))).toBe('en');
  });

  it('parses /de/ url', () => {
    expect(getLocaleFromUrl(new URL('http://localhost/de/'))).toBe('de');
  });

  it('fallbacks for invalid locale', () => {
    expect(getLocaleFromUrl(new URL('http://localhost/fr/test'))).toBe('zh');
  });

  it('fallbacks for root url', () => {
    expect(getLocaleFromUrl(new URL('http://localhost/'))).toBe('zh');
  });
});

describe('t (translation)', () => {
  it('returns zh translation', () => {
    expect(t('zh', 'nav.media')).toBe('车影骑踪');
    expect(t('zh', 'nav.home')).toBe('首页');
  });

  it('returns en translation', () => {
    expect(t('en', 'nav.media')).toBe('Media');
    expect(t('en', 'content.back')).toBe('Back to List');
  });

  it('returns de translation', () => {
    expect(t('de', 'nav.home')).toBe('Startseite');
  });
});

describe('getNavLinks', () => {
  it('generates correct links for zh', () => {
    const links = getNavLinks('zh');
    expect(links[0].href).toBe('/zh');
    expect(links.find(l => l.href === '/zh/media')).toBeDefined();
  });

  it('generates correct links for en', () => {
    const links = getNavLinks('en');
    expect(links[0].href).toBe('/en');
    expect(links[0].label).toBe('Home');
  });
});

describe('locales', () => {
  it('contains zh, en, de', () => {
    expect(locales).toContain('zh');
    expect(locales).toContain('en');
    expect(locales).toContain('de');
    expect(locales).toHaveLength(3);
  });
});
```

### 3.4 E2E 测试 (Playwright)

#### 3.4.1 首页与路由

```typescript
// frontend/e2e/routing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Routing & i18n', () => {
  test('/ redirects to /zh/', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/zh/');
  });

  test('homepage displays 5 section cards', async ({ page }) => {
    await page.goto('/zh/');
    await expect(page.locator('.hub-card')).toHaveCount(5);
  });

  test('homepage has correct title', async ({ page }) => {
    await page.goto('/zh/');
    await expect(page).toHaveTitle(/ACC ClubHub/);
  });

  test('404 for non-existent page', async ({ page }) => {
    const response = await page.goto('/zh/non-existent-page');
    expect(response?.status()).toBe(404);
  });

  test('language switcher works', async ({ page }) => {
    await page.goto('/zh/');
    await page.click('.lang-link:has-text("EN")');
    await expect(page).toHaveURL('/en/');
    await expect(page.locator('nav')).toContainText('Home');
  });

  test('language switcher preserves path', async ({ page }) => {
    await page.goto('/zh/media');
    await page.click('.lang-link:has-text("DE")');
    await expect(page).toHaveURL('/de/media');
  });
});
```

#### 3.4.2 内容页面

```typescript
// frontend/e2e/content.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Content Pages', () => {
  test('media list shows content cards', async ({ page }) => {
    await page.goto('/zh/media');
    await expect(page.locator('h1')).toContainText('车影骑踪');
    await expect(page.locator('.content-card')).toHaveCount(1);
  });

  test('media detail renders markdown', async ({ page }) => {
    await page.goto('/zh/media/alps-summer-2025');
    await expect(page.locator('h1')).toContainText('阿尔卑斯夏日骑行记');
    // 验证 markdown 渲染
    await expect(page.locator('h2').first()).toBeVisible();
    await expect(page.locator('ul li').first()).toBeVisible();
  });

  test('back link works', async ({ page }) => {
    await page.goto('/zh/media/alps-summer-2025');
    await page.click('.article-back');
    await expect(page).toHaveURL('/zh/media');
  });

  test('gear list page loads', async ({ page }) => {
    await page.goto('/zh/knowledge/gear');
    await expect(page.locator('h1')).toContainText('器械知识');
  });

  test('training list page loads', async ({ page }) => {
    await page.goto('/zh/knowledge/training');
    await expect(page.locator('h1')).toContainText('科学训练');
  });

  test('routes list shows stats', async ({ page }) => {
    await page.goto('/zh/routes');
    await expect(page.locator('h1')).toContainText('骑行路线');
  });

  test('route detail has Strava/Komoot links', async ({ page }) => {
    await page.goto('/zh/routes/isar-valley-loop');
    await expect(page.locator('.route-link--strava')).toBeVisible();
    await expect(page.locator('.route-link--komoot')).toBeVisible();
    await expect(page.locator('.stat-value')).toHaveCount(3);
  });
});
```

#### 3.4.3 导航测试

```typescript
// frontend/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('header nav links work', async ({ page }) => {
    await page.goto('/zh/');
    
    await page.click('nav a:has-text("车影骑踪")');
    await expect(page).toHaveURL('/zh/media');
    
    await page.click('nav a:has-text("器械知识")');
    await expect(page).toHaveURL('/zh/knowledge/gear');
  });

  test('logo links to homepage', async ({ page }) => {
    await page.goto('/zh/media');
    await page.click('.logo');
    await expect(page).toHaveURL('/zh/');
  });

  test('active nav item highlighted', async ({ page }) => {
    await page.goto('/zh/media');
    const activeLink = page.locator('nav a.active');
    await expect(activeLink).toContainText('车影骑踪');
  });
});
```

#### 3.4.4 响应式测试

```typescript
// frontend/e2e/responsive.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile nav toggle visible', async ({ page }) => {
    await page.goto('/zh/');
    await expect(page.locator('.nav-toggle-label')).toBeVisible();
  });

  test('mobile nav opens on click', async ({ page }) => {
    await page.goto('/zh/');
    await page.click('.nav-toggle-label');
    await expect(page.locator('nav ul')).toBeVisible();
  });

  test('hub cards stack on mobile', async ({ page }) => {
    await page.goto('/zh/');
    const cards = page.locator('.hub-card');
    // 验证卡片在移动端可见
    await expect(cards.first()).toBeVisible();
  });
});
```

---

## 四、CI/CD 配置 (GitHub Actions)

### 4.1 主测试工作流

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-check:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Astro Check (Schema + Types)
        run: npx astro check

  unit-test:
    name: Unit Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Vitest
        run: npm run test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint-and-check, unit-test]
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: frontend/dist
          retention-days: 7

  e2e-test:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report
          retention-days: 7
```

### 4.2 部署预览工作流 (可选)

```yaml
# .github/workflows/preview.yml
name: Deploy Preview

on:
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install & Build
        run: |
          npm ci
          npm run build
      
      # 可选：部署到 Netlify/Vercel 预览环境
      # - name: Deploy to Netlify
      #   uses: nwtgck/actions-netlify@v2
      #   with:
      #     publish-dir: './frontend/dist'
      #     production-deploy: false
```

---

## 五、CMS 手动测试清单

### 5.1 本地测试设置

```bash
# 1. 安装 decap-server
npm install -D decap-server

# 2. 修改 config.yml
# public/admin/config.yml 添加:
local_backend: true

# 3. 启动代理
npx decap-server

# 4. 启动开发服务器
npm run dev

# 5. 访问 http://localhost:4321/admin/
```

### 5.2 测试清单

| ID | 测试项 | 预期结果 | □ 通过 |
|----|--------|----------|--------|
| CMS-001 | 访问 /admin/ | CMS 加载 | □ |
| CMS-002 | 查看 Media 列表 | 显示现有文章 | □ |
| CMS-003 | 编辑文章 | 编辑器打开 | □ |
| CMS-004 | 保存文章 | 文件系统更新 | □ |
| CMS-005 | 新建 ZH 文章 | 保存到 zh/ 目录 | □ |
| CMS-006 | 新建 EN 文章 | 保存到 en/ 目录 | □ |
| CMS-007 | 上传图片 | 图片保存到 public/ | □ |
| CMS-008 | 前端刷新 | 新内容可见 | □ |

---

## 六、执行顺序

### 6.1 本地开发

```bash
# 1. 安装测试依赖
npm install -D vitest playwright @playwright/test decap-server
npx playwright install chromium

# 2. 运行所有测试
npm run test:all

# 3. 运行 E2E (需要先启动 dev server)
npm run test:e2e
```

### 6.2 CI 流程

```
Push/PR → lint-and-check → unit-test → build → e2e-test
                 ↓              ↓          ↓         ↓
           astro check     vitest    astro build  playwright
```

---

## 七、验收标准

| 检查项 | 通过条件 |
|--------|----------|
| `astro check` | 无错误 |
| `npm run test` | 100% 通过 |
| `npm run build` | 成功生成 dist/ |
| `npm run test:e2e` | 100% 通过 |
| GitHub Actions | 全部 ✅ |
| CMS 手动测试 | 8/8 通过 |

---

## 八、待创建文件

| 文件 | 用途 |
|------|------|
| `frontend/vitest.config.ts` | Vitest 配置 |
| `frontend/playwright.config.ts` | Playwright 配置 |
| `frontend/src/lib/__tests__/i18n.test.ts` | 单元测试 |
| `frontend/e2e/routing.spec.ts` | 路由 E2E |
| `frontend/e2e/content.spec.ts` | 内容 E2E |
| `frontend/e2e/navigation.spec.ts` | 导航 E2E |
| `frontend/e2e/responsive.spec.ts` | 响应式 E2E |
| `.github/workflows/test.yml` | CI 工作流 |
