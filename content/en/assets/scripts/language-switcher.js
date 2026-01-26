/**
 * ACC ClubHub - 智能语言切换器 (Fix V3)
 * 使用 #lang-xx 格式的链接来避免 Quarto 路径转换问题
 */

document.addEventListener('DOMContentLoaded', function () {
    // 选择所有下拉菜单里的链接
    const dropdownLinks = document.querySelectorAll('.navbar-nav .dropdown-menu a');

    dropdownLinks.forEach(link => {
        const href = link.getAttribute('href');

        // 如果没有 href，则跳过
        if (!href) return;

        // 判断是否是语言切换链接 (格式: #lang-zh, #lang-en, #lang-de)
        let targetLang = null;
        if (href.includes('#lang-zh')) targetLang = 'zh';
        else if (href.includes('#lang-en')) targetLang = 'en';
        else if (href.includes('#lang-de')) targetLang = 'de';

        if (targetLang) {
            // 这是一个语言切换链接，绑定点击事件
            link.addEventListener('click', function (e) {
                e.preventDefault(); // 阻止默认跳转

                const currentPath = window.location.pathname;
                let newPath;

                // 正则检测当前路径中是否已经包含语言代码
                const langRegex = /\/(zh|en|de)\//;

                if (langRegex.test(currentPath)) {
                    // 情况 A: 当前已经在某个语言子目录下
                    // 直接把当前语言替换成目标语言
                    newPath = currentPath.replace(langRegex, '/' + targetLang + '/');
                } else {
                    // 情况 B: 当前路径没有语言代码
                    const pathParts = currentPath.split('/').filter(p => p);

                    if (window.location.hostname.includes('github.io')) {
                        // GitHub Pages: pathParts[0] 是 repo 名
                        const repoName = pathParts[0] || 'acc_clubhub';
                        let restPath = pathParts.slice(1).join('/');

                        if (restPath === 'index.html' || restPath === '') {
                            newPath = '/' + repoName + '/' + targetLang + '/';
                        } else {
                            newPath = '/' + repoName + '/' + targetLang + '/' + restPath;
                        }
                    } else {
                        // 本地调试模式
                        newPath = '/' + targetLang + '/' + currentPath.replace(/^\//, '');
                    }
                }

                // 确保路径格式正确
                if (!newPath.endsWith('/') && !newPath.endsWith('.html')) {
                    newPath += '/';
                }

                // 执行跳转
                window.location.href = newPath;
            });
        }
    });

    // 高亮当前选中的语言
    const currentPath = window.location.pathname;
    let activeLang = 'zh'; // 默认中文
    if (currentPath.includes('/en/')) activeLang = 'en';
    if (currentPath.includes('/de/')) activeLang = 'de';

    // 找到对应语言的链接并添加 active 类
    dropdownLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('#lang-' + activeLang)) {
            link.classList.add('active');
        }
    });
});
