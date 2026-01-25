# 贡献指南

感谢你对 ACC ClubHub 的兴趣！以下是参与贡献的指南。

## 开发环境

1. Fork 并 clone 仓库
2. 创建虚拟环境：`python -m venv .venv`
3. 激活：`.venv\Scripts\activate` (Windows)
4. 安装依赖：`pip install -r requirements.txt`

## 内容贡献

### 添加知识库文章

1. 在 `content/knowledge/` 对应目录下创建 `.qmd` 文件
2. 使用 Markdown 语法编写内容
3. 本地预览：`quarto preview content/`

### 添加骑行路线

1. 在 `content/routes/` 下创建 `.qmd` 文件
2. 将 GPX 文件放入 `assets/gpx/`

## 代码贡献

1. 创建功能分支：`git checkout -b feature/your-feature`
2. 提交更改：`git commit -m "Add: your feature"`
3. 推送并创建 Pull Request

## 提交规范

- `Add:` 新功能
- `Fix:` 修复问题
- `Update:` 更新内容
- `Refactor:` 重构代码

---

有问题请联系核心团队 🚴
