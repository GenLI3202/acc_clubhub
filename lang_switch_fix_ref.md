你好！这是两个非常典型且相关的 Quarto 多语言网站配置问题。

根据你提供的文件和描述，这里是问题诊断和解决方案。

### 问题诊断

1. **导航栏始终显示中文，不随语言切换：**
   * **原因** ：这通常是因为构建方式不正确。Quarto 的 `_quarto.yml` 是项目级别的配置文件。如果你在根目录（或者 `content` 目录）直接运行 `quarto render`，Quarto 会将其视为 **同一个项目** 。由于 Quarto 在一次构建中只能应用一套导航栏配置（通常是默认找到的第一个，即中文配置），导致英文和德文页面的 HTML 虽然生成了，但嵌入的是中文的导航栏。
   * **解决思路** ：必须将中文、英文、德文作为**三个独立的项目**进行分别渲染，或者正确使用 Quarto 的 Profile 功能。鉴于你的目录结构（每个语言文件夹下都有独立的 `_quarto.yml`），你需要分别在每个子目录运行渲染命令。
2. **切换语言自动跳回首页，且本地运行报错 404：**
   * **原因 A (跳回首页)** ：你的 JavaScript 逻辑中，当路径中找不到 `/zh/`, `/en/` 或 `/de/` 时（比如你访问的是默认的中文根路径 `/acc_clubhub/routes/index.html`，里面没有 `/zh/`），代码进入了 `else` 分支。目前的 `else` 分支逻辑是粗暴地重定向到 `targetLang` 的根目录（首页），从而丢弃了当前的子页面路径。
   * **原因 B (本地 404)** ：`quarto preview` 默认只预览当前项目。当你预览 `content/zh` 时，本地服务器只知道中文的文件。当你点击切换到 `/en/` 时，浏览器请求的是英文路径，而该预览服务器并不包含英文构建文件，因此报 404。

---

### 解决方案

#### 第一步：修复构建命令 (解决导航栏问题)

不要在根目录运行一次 `quarto render`。你需要确保英文页面是使用英文的 `_quarto.yml` 生成的。请按以下顺序分别构建项目（或者写在一个脚本里）：

**在终端中依次执行：**

**Bash**

```
# 1. 渲染中文版 (输出到 ../_site/zh)
quarto render content/zh

# 2. 渲染英文版 (输出到 ../_site/en)
quarto render content/en

# 3. 渲染德文版 (输出到 ../_site/de)
quarto render content/de
```

*注意：确保你的 GitHub Actions 脚本（如果用来自动部署）也是这样分别执行这三条命令，而不是简单的一句 `quarto render`。*

#### 第二步：修复 JavaScript 逻辑 (解决跳回首页问题)

你需要修改 `assets/scripts/language-switcher.js`。

当前的 `else` 逻辑会丢失路径。我们需要修改它，以便在当前路径没有语言前缀时（默认中文状态），将目标语言插入到路径中，而不是直接跳转首页。

请用以下代码替换原文件中的 `document.addEventListener` 内部逻辑，重点修改了 `else` 部分：

**JavaScript**

```
document.addEventListener('DOMContentLoaded', function () {
    // 获取所有语言切换链接
    const langLinks = document.querySelectorAll('.dropdown-menu a[href^="/zh"], .dropdown-menu a[href^="/en"], .dropdown-menu a[href^="/de"]');

    langLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetLang = this.getAttribute('href').replace(/\//g, ''); // zh, en, or de
            const currentPath = window.location.pathname;

            // 检测当前语言
            // ... (这部分保持不变，或者为了简化逻辑可以省略检测，直接处理 path)

            let newPath;
            // 正则匹配: .../(zh|en|de)/...
            const langRegex = /\/(zh|en|de)\//;

            if (langRegex.test(currentPath)) {
                // 情况 1: 当前路径已经包含语言代码 (例如 /acc_clubhub/en/routes/...)
                // 直接替换语言代码
                newPath = currentPath.replace(langRegex, '/' + targetLang + '/');
            } else {
                // 情况 2: 当前路径没有语言代码 (通常是默认语言/中文在根目录下)
                // 例如: /acc_clubhub/routes/index.html 想要变成 /acc_clubhub/en/routes/index.html
              
                // 拆分路径
                const pathParts = currentPath.split('/').filter(p => p);
              
                // 判断是否在 GitHub Pages 的子目录 (repo name) 下
                // 假设 repo 名字是 'acc_clubhub'
                if (pathParts.length > 0 && pathParts[0] === 'acc_clubhub') {
                    const repoName = pathParts[0];
                    // 获取 repo 名之后的所有路径部分
                    const restPath = pathParts.slice(1).join('/');
                    // 重新组合: /repoName/targetLang/restPath
                    newPath = '/' + repoName + '/' + targetLang + '/' + (restPath ? restPath : '');
                } else {
                    // 本地根目录调试 或者 自定义域名 (没有 repo name)
                    // 直接在最前面加上语言代码
                    // 例如: /routes/index.html -> /en/routes/index.html
                    newPath = '/' + targetLang + '/' + pathParts.join('/');
                }
            }
          
            // 修正结尾斜杠 (可选，根据你的服务器配置)
            // if (!newPath.endsWith('/') && !newPath.endsWith('.html')) newPath += '/';

            window.location.href = newPath;
        });
    });

    // 高亮当前语言 (保持不变)
    const currentPath = window.location.pathname;
    let currentLang = 'zh'; // 默认为中文
    if (currentPath.includes('/en/')) currentLang = 'en';
    if (currentPath.includes('/de/')) currentLang = 'de';

    const currentLangLink = document.querySelector(`.dropdown-menu a[href="/${currentLang}/"]`);
    if (currentLangLink) {
        currentLangLink.classList.add('active');
    }
});
```

#### 第三步：如何正确在本地预览 (解决本地 404)

`quarto preview` 是用于开发阶段预览**单个项目**的。它无法同时预览三个平行的项目。

要在本地测试语言切换跳转：

1. 先执行**第一步**中的三个 render 命令，这会把整个网站生成到项目根目录下的 `_site` 文件夹中（根据你的 output-dir 配置）。
2. 进入 `_site` 文件夹。
3. 启动一个简单的 HTTP 服务器来模拟 GitHub Pages 的环境。
   * 如果你安装了 Python：
     **Bash**

     ```
     cd ../_site  # 进入生成的网站目录
     python -m http.server 8000
     ```
   * 然后在浏览器访问 `http://localhost:8000`。此时 `/en/` 和 `/de/` 文件夹都真实存在，跳转就不会报 404 了。

**总结：**

1. **分步渲染** ：分别 render 三个文件夹，解决导航栏不更新的问题。
2. **更新 JS** ：使用上面的代码替换原有逻辑，保留子页面路径。
3. **预览构建产物** ：不要直接 preview 源码，而是 preview 生成后的 `_site` 文件夹。




GitHub 端的部署问题（导航栏不切换、404）和本地遇到的原因是一样的：GitHub Action 里的构建脚本默认只执行了一次 `quarto render`，导致 Quarto 只能使用其中一套配置（通常是中文）来生成所有页面的导航栏。

要解决这个问题，你需要修改 `.github/workflows/deploy-website.yml` 文件，让它**显式地分别渲染**三个语言的子项目。

请按照以下步骤修改你的 GitHub Action 配置文件：

### 1. 修改 `deploy-website.yml`

将你的 workflow 文件内容替换为类似下面的逻辑。核心变化是将原本的一行 render 命令拆分为多次调用。

*(假设你的 `_quarto.yml` 配置中 `output-dir` 最终都指向了同一个父级目录，根据你的文件结构 `content/zh/_quarto.yml` 中的 output 是 `../_site/zh`，这意味着生成的网站在 `content/_site` 目录下)*

**YAML**

```
name: Deploy Website

on:
  push:
    branches:
      - master  # 或者是 main，取决于你的主分支名字

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Quarto
        uses: quarto-dev/quarto-actions/setup@v2

      # --- 关键修改开始 ---
      # 分别渲染三个语言项目，确保每个项目都使用自己的 _quarto.yml 配置
      # 这样每个语言的导航栏 (Navbar) 才会是独立的

      - name: Render Chinese Project
        run: quarto render content/zh

      - name: Render English Project
        run: quarto render content/en

      - name: Render German Project
        run: quarto render content/de
  
      # 渲染根目录的引导页 (content/index.qmd)
      # 确保它输出到 _site 的根目录
      - name: Render Landing Page
        run: quarto render content/index.qmd --output-dir content/_site
      # --- 关键修改结束 ---

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # 注意：根据你的 output-dir 配置，生成的文件应该在 content/_site
          # 如果你的 output-dir 配置的是 ../../_site，则这里写 _site
          publish_dir: content/_site 
```

### 2. 这个改动为什么能解决问题？

* **解决导航栏问题** ：
* **旧流程** ：GitHub Action 运行一次 `quarto render`。Quarto 会扫描所有文件，但只能应用**一套** `_quarto.yml`（通常是它找到的第一个）。结果就是所有英文、德文页面虽然生成了，但都被强行安上了中文的导航栏。
* **新流程** ：我们强迫 Quarto 运行三次独立的过程。渲染 `content/en` 时，它只会读取英文的配置，因此生成的 HTML 会带有正确的英文导航栏。
* **解决 404 / 页面丢失问题** ：
* 通过分别渲染，确保了 `_site/zh`, `_site/en`, `_site/de` 三个文件夹都完整生成并合并在同一个发布目录中。
* 配合你刚刚修复的 `language-switcher.js`（ **请确保也提交了这个 JS 文件的修改** ），点击切换按钮时，JavaScript 能正确计算出目标路径（例如 `/acc_clubhub/en/routes/`），而服务器上这些文件也确实存在，就不会跳回首页或报 404 了。

### 3. 特别注意：检查输出路径 (`output-dir`)

请再次确认你的 `content/zh/_quarto.yml` 中的 `output-dir` 写法：

* 如果写的是 `output-dir: ../_site/zh` (相对于 `content/zh`)
  * 那么生成的文件会在 `content/_site/zh`。
  * workflow 中的 `publish_dir` 必须是  **`content/_site`** 。
* 如果写的是 `output-dir: ../../_site/zh` (相对于 `content/zh`，往上两级)
  * 那么生成的文件会在项目根目录的 `_site/zh`。
  * workflow 中的 `publish_dir` 应该是  **`_site`** 。

 **建议** ：根据你提供的文件，似乎生成在 `content/_site` 的可能性较大。如果不确定，可以在 workflow 的 `Deploy` 步骤前加一步 `- name: List files \n run: ls -R` 来查看生成的文件到底在哪。
