# Vibe Hosting — 产品总纲

> 本文档是项目总纲，只写**不变**或**长期有效**的内容。
> 详细执行跟踪见 [`tracking/`](tracking/)，UI 改进规范见 [`FRONTEND_UI_IMPROVEMENT.md`](FRONTEND_UI_IMPROVEMENT.md)。
> 最后更新：2026-07-16

---

## 📌 项目速览（30 秒读懂）

| 项目 | 内容 |
|------|------|
| **产品** | 开发者托管平台（对标 Vercel/Netlify + 域名/VPS） |
| **前端** | Vite + React + TypeScript，路径 `controlpanel/` |
| **后端** | .NET 自研，API 地址 `api.hostvibecoding.com` |
| **当前阶段** | Phase 2 — 页面打磨 |
| **核心优势** | 全栈自研 + 中文开发者市场 + 国内直连 |
| **入口文档** | `README.md` → `PRODUCT_ROADMAP.md` → `tracking/` |

---

## 一、产品愿景

### 一句话定位

> **专为开发者打造的托管平台 — 5 分钟从代码到上线，国内直连，一站式搞定网站、域名、VPS、数据库。**

### 目标用户

| 画像 | 人数 | 痛点 |
|------|------|------|
| 独立开发者 / 自由职业 | 最多 | 个人博客/作品集要上线，Vercel 被墙，国内主机商体验烂 |
| 学生 / 入门开发者 | 很多 | 部署项目给面试官看，预算有限 |
| 出海小团队（1-5 人） | 增长快 | Landing page / API 服务，不想折腾运维 |

### 竞争格局

```
Vercel / Netlify     ← 国际巨头，国内访问慢
Railway / Render     ← 新兴平台，价格偏高
阿里云 / 腾讯云      ← 功能强但体验传统
Zeabur / Sealos      ← 国内竞品，正在崛起
       ↑
   我们在这里 — 现代体验 + 国内直连 + 一站式
```

---

## 二、路线图总览

```
Phase 1（第 1-2 周）         Phase 2（第 3-4 周）         Phase 3（第 2 月）           Phase 4（第 3-4 月）
┌─────────────────┐         ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│  UI 基础设施      │  →     │  页面打磨         │  →      │  品牌 + 官网      │  →      │  增长 + 规模      │
│                  │         │                  │          │                  │          │                  │
│  variables.css   │         │  Dashboard 重构   │          │  Logo + Favicon  │          │  内容营销        │
│  组件库 (3个)     │         │  订阅购买页重构    │          │  Landing Page    │          │  联盟推广启动     |
│  合并/去重       │         │  计费页重构       │          │  Onboarding 引导  │          │  数据驱动迭代     │
│  替换硬编码颜色   │         │  无障碍修复       │          │                  │          │  用户留存优化     │
└─────────────────┘         └─────────────────┘          └─────────────────┘          └─────────────────┘
```

---

## 三、已实现的功能

- [x] 用户注册 / 登录（含 Google OAuth）
- [x] 网站托管（Git 部署 / FTP / WebDeploy）
- [x] 自定义域名 + 自动 SSL
- [x] 数据库（MySQL / PostgreSQL）
- [x] 域名注册 / 转入 / DNS 管理
- [x] VPS 实例管理
- [x] 计费系统（Stripe 订阅 / 充值 / 优惠券）
- [x] 联盟推广系统
- [x] 工单支持
- [x] 多语言（i18n）
- [x] 3 套主题（Day / Dark / Classic）

---

## 四、技术架构速查（给新 AI 的快速上手指南）

### 目录结构

```
controlpanel/
├── launch-plan/          ← 产品上市计划文档
│   ├── README.md
│   ├── PRODUCT_ROADMAP.md
│   ├── FRONTEND_UI_IMPROVEMENT.md
│   └── tracking/
├── src/
│   ├── app/
│   │   ├── pages/          ← 每个页面一个组件
│   │   ├── components/     ← 可复用组件（Button/Modal/Toast）
│   │   ├── layout/         ← 布局组件 (RootLayout 等)
│   │   ├── lib/            ← API 调用、工具函数
│   │   └── i18n/           ← 国际化
│   ├── styles/             ← 每个页面一个 CSS 文件
│   └── main.tsx
├── .env                    ← VITE_API_BASE_URL
├── index.html
├── package.json
└── vite.config.ts
```

### 关键约定

| 约定 | 说明 |
|------|------|
| **CSS** | 每页一个文件，不拆散到多个小文件 |
| **变量** | 所有颜色/间距/圆角通过 `var(--xxx)` 引用 |
| **组件** | 公共组件放 `src/app/components/`，样式放 `index.css` |
| **API** | 统一在 `src/app/lib/api-*.ts`，通过 `customer-api.ts` 导出 |
| **认证** | JWT 存在 `localStorage`，通过 `customer-session.ts` 管理 |
| **后端 API** | `.NET` 自研，地址在 `.env` 中配置 |

### 常用命令

```bash
npm run dev      # 启动开发服务器（localhost:3090）
npm run build    # 构建生产版本
npm run preview  # 预览构建结果
```

---

## 五、常见问题（FAQ）

### Q: 新 AI 来了，不知道进度怎么办？
A: 先读 `README.md`，再看 `tracking/` 目录下的阶段日志。

### Q: 为什么 CSS 不改成分散的小文件？
A: 决策记录 — 为了让 AI 一次读一个文件就能掌握全部上下文，保留按页面组织的模式。详见 FRONTEND_UI_IMPROVEMENT.md v1.1 讨论。

### Q: 本地开发 API 连不上怎么办？
A: 检查 `.env` 文件的 `VITE_API_BASE_URL`，本地开发可改为 `http://127.0.0.1:5032`。

### Q: 当前在做什么？
A: Phase 2 — 页面打磨。详情见 `tracking/phase-2-log.md`。
