/**
 * ACC ClubHub - 智能语言切换器
 * 切换语言时保持在当前页面
 */

document.addEventListener('DOMContentLoaded', function () {
    // 获取所有语言切换链接
    // 获取所有语言切换链接 (匹配 href 中包含 /zh/, /en/, /de/ 的链接)
    const langLinks = document.querySelectorAll('.dropdown-menu a[href*="/zh/"], .dropdown-menu a[href*="/en/"], .dropdown-menu a[href*="/de/"]');

    langLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const href = this.getAttribute('href');
            // 提取语言代码 (zh, en, de)，兼容 ./en/, /en/, ../en/ 等格式
            const langMatch = href.match(/(zh|en|de)/);
            if (!langMatch) return; // 如果没匹配到，不做处理
            const targetLang = langMatch[0];

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
                // 情况 2: 当前路径没有语言代码 (通常是默认语言/中文在根目录下)
                // 例如: /acc_clubhub/routes/index.html -> /acc_clubhub/en/routes/index.html
                // 拆分路径
                const pathParts = currentPath.split('/').filter(p => p);

                // 判断是否在 GitHub Pages 的子目录 (repo name) 下
                // 假设 repo 名字是 'acc_clubhub' (你可以根据实际情况修改这个判断，或者让它更通用)
                // 这里我们假设如果第一项不是 targetLang 且不是 zh/en/de，那可能就是 repo name
                if (pathParts.length > 0 && !['zh', 'en', 'de'].includes(pathParts[0])) {
                    // 很可能是 repo name
                    const repoName = pathParts[0];
                    const restPath = pathParts.slice(1).join('/');
                    newPath = '/' + repoName + '/' + targetLang + '/' + (restPath ? restPath : '');
                } else {
                    // 没有 repo name (本地根目录)
                    newPath = '/' + targetLang + '/' + pathParts.join('/');
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
