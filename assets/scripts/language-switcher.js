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
            if (currentPath.includes('/' + currentLang + '/')) {
                newPath = currentPath.replace('/' + currentLang + '/', '/' + targetLang + '/');
            } else {
                // 如果在根目录，直接跳转到目标语言首页
                newPath = '/' + targetLang + '/';
            }

            window.location.href = newPath;
        });
    });

    // 高亮当前语言
    const currentPath = window.location.pathname;
    let currentLang = 'zh';
    if (currentPath.includes('/en/')) currentLang = 'en';
    if (currentPath.includes('/de/')) currentLang = 'de';

    const currentLangLink = document.querySelector(`.dropdown-menu a[href="/${currentLang}/"]`);
    if (currentLangLink) {
        currentLangLink.classList.add('active');
    }
});
