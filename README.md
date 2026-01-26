# ACC ClubHub

> **Across Cycling Club Munich** - 让骑行成为一种生活方式

Website: https://genli3202.github.io/acc_clubhub/

## 项目概述

这是 ACC 俱乐部的官方网站与后台支持系统，包含：

- 🌐 **官网** - Quarto 生成的静态网站
- 📚 **知识库** - ACC 工坊、器械知识、科学训练
- 🚴 **路线库** - 慕尼黑周边骑行路线
- 🎉 **活动系统** - 会员注册、活动报名、邮件通知
- 🔗 **媒体聚合** - Bilibili/YouTube/小红书/Podcast 外链

## 快速开始

### 环境配置

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/acc-clubhub.git
cd acc-clubhub

# 2. 创建虚拟环境
python -m venv .venv

# 3. 激活虚拟环境 (Windows)
.venv\Scripts\activate

# 4. 安装依赖
pip install -r requirements.txt

# 5. 预览网站
quarto preview content/
```

### 后端 API 开发

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

## 目录结构

```
acc-clubhub/
├── content/          # Quarto 内容源文件 (.qmd)
├── backend/          # FastAPI 后端服务
├── scripts/          # 工具脚本 (Strava 同步等)
├── assets/           # 静态资源 (图片、GPX、CSS)
├── data/             # 数据存储 (SQLite、缓存)
└── docs/             # 内部文档
```

## 技术栈

| 层级     | 技术                  |
| -------- | --------------------- |
| 内容创作 | Quarto (.qmd)         |
| 网站生成 | Quarto → 静态 HTML   |
| 后端 API | FastAPI               |
| 数据库   | SQLite + SQLAlchemy   |
| 托管     | GitHub Pages + Render |

## 贡献

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与贡献。

---

**ACC - Across Cycling Club Munich** 🚴‍♂️
