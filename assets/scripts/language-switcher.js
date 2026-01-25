/**
 * ACC ClubHub - 智能语言切换器
 * 切换语言时保持在当前页面
 */

document.addEventListener('DOMContentLoaded', function () {
    // 获取所有语言切换链接
    const langLinks = document.querySelectorAll('.dropdown-menu a[href^="/zh"], .dropdown-menu a[href^="/en"], .dropdown-menu a[href^="/de"]');

    langLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetLang = this.getAttribute('href').replace(/\//g, ''); // zh, en, or de
            const currentPath = window.location.pathname;

            // 检测当前语言
            let currentLang = 'zh'; // 默认
            if (currentPath.includes('/en/')) currentLang = 'en';
            if (currentPath.includes('/de/')) currentLang = 'de';

            // 替换路径中的语言部分
            let newPath;
            // 正则匹配: .../(zh|en|de)/...
            const langRegex = /\/(zh|en|de)\//;

            if (langRegex.test(currentPath)) {
                newPath = currentPath.replace(langRegex, '/' + targetLang + '/');
            } else {
                // 如果当前路径没有语言标识（可能是根目录重定向或者特殊页面）
                // 尝试找到 base path。例如 /acc_clubhub/index.html -> /acc_clubhub/zh/index.html
                // 这里简单处理：如果找不到语言，就跳转到目标语言的首页，保留 base path

                // 假设 repo name 是第一级目录
                const pathParts = currentPath.split('/').filter(p => p);
                if (pathParts.length > 0 && (pathParts[0] === 'acc_clubhub' || pathParts[0] === targetLang)) {
                    // 已经在 gh-pages 子目录下
                    const repoName = pathParts[0];
                    newPath = '/' + repoName + '/' + targetLang + '/';
                } else {
                    // 根域名
                    newPath = '/' + targetLang + '/';
                }
            }

            window.location.href = newPath;
        });
    });

    // 高亮当前语言
    const currentPath = window.location.pathname;
    let currentLang = 'zh';
    if (currentPath.includes('/en/')) currentLang = 'en';
    if (currentPath.includes('/de/')) currentLang = 'de';

    // Select the link based on the detected language
    // Note: The href in the menu is /zh/, /en/, /de/
    // This matches the targetLang logic above
    const currentLangLink = document.querySelector(`.dropdown-menu a[href="/${currentLang}/"]`);
    if (currentLangLink) {
        currentLangLink.classList.add('active');
    }
});
