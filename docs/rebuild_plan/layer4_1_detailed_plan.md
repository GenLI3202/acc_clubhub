# Layer 4.1: 认证系统详细实施方案

> **目标**: 为网站添加前台用户登录功能，支持 Google/GitHub OAuth 及邮箱登录，并实现全站用户状态管理。
> **周期**: 预计 3-4 小时

---

## 一、技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| **Auth Service** | **Supabase Auth** | 免费额度大，支持 OAuth，集成简单，无后端负担 |
| **UI Framework** | **React** | 交互逻辑丰富（表单、模态框），生态组件多 (如 Lucille icons) |
| **State Management** | **Nano Stores** | Astro 官方推荐，轻量级，支持跨 Islands 状态共享 |
| **Icon Set** | **Lucide React** | 现代化、风格统一的图标库 |

---

## 二、实施步骤

### Step 1: 环境与依赖准备

1.  **Supabase 项目设置** (需用户操作):
    *   在 Supabase Dashboard 创建新项目。
    *   启用 Google 和 GitHub Auth Providers。
    *   **关键配置**: 在 Authentication -> URL Configuration -> Redirect URLs 中添加 `http://localhost:4321` (开发环境) 和生产环境 URL。
    *   获取 `Project URL` 和 `API Key (Anon)`。
2.  **安装前端依赖**:
    ```bash
    # 在 frontend 目录下
    npx astro add react  # 自动配置 astro.config.mjs
    npm install @supabase/supabase-js @nanostores/react nanostores lucide-react
    ```
3.  **环境变量配置**:
    *   创建 `frontend/.env`:
        ```env
        PUBLIC_SUPABASE_URL=https://your-project.supabase.co
        PUBLIC_SUPABASE_ANON_KEY=your-anon-key
        ```

### Step 2: 核心基础设施 (`src/lib`)

1.  **Supabase 客户端**:
    *   创建 `src/lib/supabase.ts`: 初始化 Supabase 实例。
2.  **用户状态存储**:
    *   创建 `src/stores/userStore.ts`: 使用 Nano Stores 管理 `$user` 和 `$session`，并在客户端初始化时监听 `onAuthStateChange`。

### Step 3: UI 组件开发 (`src/components/auth`)

1.  **AuthModal.tsx (React)**:
    *   登录/注册模态框。
    *   包含 "Sign in with Google/GitHub" 按钮。
    *   包含邮箱/密码表单 (Magic Link 或 Password)。
    *   处理加载状态 (`loading`) 和错误提示。
2.  **UserMenu.tsx (React)**:
    *   登录后显示：用户头像 + 下拉菜单 (Profile, Logout)。
    *   未登录显示："登录" 按钮，点击触发 AuthModal。
    *   **关键点**: 需要是一个 `client:load` 或 `client:idle` 的 Island，因为它依赖客户端状态。

### Step 4: 集成到布局

1.  **修改 Header**:
    *   在 `src/components/Header.astro` 中引入 `<UserMenu client:load />`。
    *   放置在语言切换器旁边。

---

## 三、文件清单

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/lib/supabase.ts` | Supabase 单例客户端 |
| `frontend/src/stores/userStore.ts` | 用户状态管理 (Nano Store) |
| `frontend/src/components/auth/AuthModal.tsx` | 登录弹窗 (交互核心) |
| `frontend/src/components/auth/UserMenu.tsx` | 头像/登录按钮 (入口) |
| `frontend/src/components/Header.astro` | [修改] 集成 UserMenu |

---

## 四、验证计划 (Verification)

1.  **依赖安装**: `npm run dev` 无报错，React 组件能正常渲染。
2.  **状态同步**:
    *   点击 "Login" -> 弹出模态框。
    *   点击 "Google" -> 跳转 Supabase -> 跳回 localhost。
    *   **关键验证**: 页面刷新后，`UserMenu` 依然显示用户头像（状态持久化）。
3.  **登出**: 点击 "Logout" -> 变回 "Login" 按钮，且 Supabase Cookie 被清除。
4.  **多页测试**: 在 `首页` 登录，跳转到 `活动页`，状态应保持已登录。

---

### Step 5: 数据库同步 (Critical for Layer 4.2)

> **问题**: Supabase 的用户存储在 `auth.users` 表中，而我们的业务逻辑（如报名）需要关联 `public.members` 表。
> **解决方案**: 使用 PostgreSQL Trigger 自动同步。

1.  **在 Supabase SQL Editor 执行**:
    ```sql
    -- 1. 创建 public.members 表 (如果尚未创建，注意 ID 必须是 UUID)
    create table public.members (
      id uuid references auth.users not null primary key,
      email text,
      name text,
      role text default 'member',  -- 关键字段：区分管理员
      created_at timestamptz default now()
    );

    -- 2. 开启 RLS (Row Level Security) - 安全必选项
    alter table public.members enable row level security;

    -- 3. 创建访问策略 (Policies)
    -- 允许用户读取自己的资料
    create policy "Users can read own profile" 
      on public.members for select 
      using (auth.uid() = id);

    -- 4. 创建同步函数
    create or replace function public.handle_new_user()
    returns trigger as $$
    begin
      insert into public.members (id, email, name, role)
      values (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name',
        'member'
      );
      return new;
    end;
    $$ language plpgsql security definer;

    -- 5. 创建触发器
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
    ```

---

## 五、验证计划 (Verification)

1.  **依赖安装**: `npm run dev` 无报错，React 组件能正常渲染。
2.  **状态同步**:
    *   点击 "Login" -> 弹出模态框。
    *   点击 "Google" -> 跳转 Supabase -> 跳回 localhost。
    *   **关键验证**: 页面刷新后，`UserMenu` 依然显示用户头像（状态持久化）。
3.  **登出**: 点击 "Logout" -> 变回 "Login" 按钮，且 Supabase Cookie 被清除。
4.  **数据库同步验证**:
    *   新用户注册后，检查 Supabase 的 `public.members` 表，应自动出现该用户记录。

---

## 六、下一步准备

完成 Layer 4.1 后，我们将拥有全局可用的 `user.id` 且数据库中已有对应的 `Member` 记录，这将是 Layer 4.2 (活动报名) 的坚实基础。
