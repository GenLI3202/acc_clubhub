

### 第一步：修复导航栏对比度 (CSS)

你的网站使用了 `Cosmo` 主题，默认的导航栏文字可能是白色的，如果背景也是浅色（或者图片），就会看不清。我们需要强制指定颜色。

请更新 `assets/styles/custom.css`，在文件末尾追加以下代码：

**CSS**

```
/* --- 修复导航栏对比度 --- */

/* 强制导航栏背景为深色 (ACC 风格可能偏好黑色或深蓝) */
.navbar {
    background-color: #2c3e50 !important; /* 你可以改成 #000000 (纯黑) 或其他颜色 */
}

/* 强制导航栏上的文字和链接为白色，并加粗以便看清 */
.navbar-brand, 
.navbar-nav .nav-link {
    color: #ffffff !important;
    font-weight: 500;
}

/* 鼠标悬停时的颜色 (浅灰色) */
.navbar-brand:hover, 
.navbar-nav .nav-link:hover {
    color: #cccccc !important;
}

/* 语言切换下拉菜单的样式 */
.dropdown-menu {
    background-color: #ffffff !important; /* 下拉框背景白 */
    border: 1px solid #ddd;
}

/* 下拉菜单里的文字颜色 (黑) */
.dropdown-item {
    color: #333333 !important;
}

/* 下拉菜单鼠标悬停 (灰色背景) */
.dropdown-item:hover, .dropdown-item:focus {
    background-color: #f8f9fa !important;
    color: #000000 !important;
}

/* 当前选中的语言高亮 */
.dropdown-item.active, .dropdown-item:active {
    background-color: #2c3e50 !important;
    color: #ffffff !important;
}
```

---

### 第二步：彻底修复语言切换器 (JS)

我们需要一个更健壮的 JavaScript，它不再依赖链接是否以 `/` 开头，而是只要链接里包含 `/zh/`, `/en/`, `/de/` 就会触发拦截。

请用以下代码**完全替换** `assets/scripts/language-switcher.js` 的内容：

**JavaScript**

```
/**
 * ACC ClubHub - 智能语言切换器 (Fix V2)
 * 修复了 GitHub Pages 子目录下路径跳转错误的问题
 * 修复了选择器无法选中相对路径链接的问题
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. 改进选择器：不使用 ^="/zh"，而是选择所有下拉菜单里的链接
    // 这样无论 Quarto 把链接渲染成 "/zh/" 还是 "../zh/"，我们都能获取到
    const dropdownLinks = document.querySelectorAll('.navbar-nav .dropdown-menu a');

    dropdownLinks.forEach(link => {
        const href = link.getAttribute('href');
      
        // 如果没有 href 或者 href 仅仅是 #，则跳过
        if (!href || href === '#') return;

        // 2. 判断这是否是一个语言切换链接
        // 逻辑：如果链接包含 /zh/, /en/, 或 /de/，我们就认为是语言链接
        let targetLang = null;
        if (href.includes('/zh/') || href === '/zh') targetLang = 'zh';
        else if (href.includes('/en/') || href === '/en') targetLang = 'en';
        else if (href.includes('/de/') || href === '/de') targetLang = 'de';

        if (targetLang) {
            // 这是一个语言切换链接，绑定点击事件
            link.addEventListener('click', function (e) {
                e.preventDefault(); // 阻止浏览器默认的错误跳转 (即阻止跳转到 genli3202.github.io/zh/)

                const currentPath = window.location.pathname;
                let newPath;

                // --- 核心路径计算逻辑 ---

                // 正则用于检测当前路径中是否已经包含语言代码
                const langRegex = /\/(zh|en|de)\//;

                if (langRegex.test(currentPath)) {
                    // 情况 A: 当前已经在某个语言子目录下 (例如 .../acc_clubhub/en/routes/...)
                    // 直接把 /en/ 替换成目标语言
                    newPath = currentPath.replace(langRegex, '/' + targetLang + '/');
                } else {
                    // 情况 B: 当前路径没有语言代码 (例如在根引导页 /acc_clubhub/index.html)
                    // 或者 URL 结构非常特殊。我们需要手动拼接路径。
                  
                    // 获取 Repo 名称 (针对 GitHub Pages)
                    // 假设 URL 是 /acc_clubhub/index.html，我们需要保留 acc_clubhub
                    const pathParts = currentPath.split('/').filter(p => p);
                  
                    // 简单的判断：如果是在 GitHub Pages (hostname 含 github.io)，
                    // 且路径第一部分通常是 repo 名
                    if (window.location.hostname.includes('github.io')) {
                        // 假设 pathParts[0] 是 repo 名 (如 acc_clubhub)
                        const repoName = pathParts[0]; 
                        // 获取除去 repo 名后的剩余路径
                        let restPath = pathParts.slice(1).join('/');
                      
                        // 如果是 index.html，目标语言目录会自动索引，可以省略
                        if (restPath === 'index.html' || restPath === '') {
                             newPath = '/' + repoName + '/' + targetLang + '/';
                        } else {
                             newPath = '/' + repoName + '/' + targetLang + '/' + restPath;
                        }
                    } else {
                        // 本地调试模式 (通常根目录就是项目根)
                        newPath = '/' + targetLang + '/' + currentPath.replace(/^\//, '');
                    }
                }

                // 修正：确保路径以 / 结尾 (如果是目录) 或者保留 .html
                // 这一步是为了防止生成 /acc_clubhub/zh 这种可能不触发跳转的路径
                if (!newPath.endsWith('/') && !newPath.endsWith('.html')) {
                    newPath += '/';
                }
              
                // 执行跳转
                window.location.href = newPath;
            });
        }
    });

    // 3. 高亮当前选中的语言
    const currentPath = window.location.pathname;
    let activeLang = 'zh'; // 默认高亮中文
    if (currentPath.includes('/en/')) activeLang = 'en';
    if (currentPath.includes('/de/')) activeLang = 'de';

    // 找到对应语言的链接并添加 active 类
    dropdownLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.includes(`/${activeLang}/`) || href === `/${activeLang}`)) {
            link.classList.add('active');
            // 可选：同时也高亮父级 dropdown 按钮，让用户知道在哪里
            const parentDropdown = link.closest('.dropdown');
            if (parentDropdown) {
                const toggle = parentDropdown.querySelector('.dropdown-toggle');
                if(toggle) toggle.classList.add('active');
            }
        }
    });
});
```

### 第三步：提交并测试

1. 保存上述两个文件。
2. 提交代码到 GitHub (push)。
3. 等待 GitHub Actions 构建完成。
4. **强制刷新浏览器** (Ctrl + F5 或 Cmd + Shift + R)，因为 JS 和 CSS 很容易被浏览器缓存。

**预期效果：**

* **Nav 对比度** ：导航栏应该变成深色背景、白色文字，非常清晰。
* **语言切换** ：
* 在英文版页面点击“中文”，应该能正确跳回中文对应页面（JS 会正确加上 `acc_clubhub` 前缀）。
* 在中文版点击“Deutsch”，JS 也会拦截并跳转到正确的 `/acc_clubhub/de/...`，而不是 404。
