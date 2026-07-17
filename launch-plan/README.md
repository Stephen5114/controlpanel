# Vibe Hosting — 上市计划

> 入口文档。新 AI 或人接手时，**先读此文件**，然后按需查阅子文档。

## 快速导航

| 文件 | 内容 | 优先级 |
|------|------|--------|
| [`PRODUCT_ROADMAP.md`](PRODUCT_ROADMAP.md) | 总纲 — 愿景、定位、技术架构速查、FAQ | **先读** |
| [`FRONTEND_UI_IMPROVEMENT.md`](FRONTEND_UI_IMPROVEMENT.md) | UI 设计规范 + 页面改进清单 | 执行时读 |
| [`tracking/`](tracking/) | 各 Phase 执行记录和跟踪表 | 查进度时读 |
| [`research/`](research/) | 竞品分析、用户调研 | 需要时读 |

## 当前状态

- **当前 Phase：** Phase 3 — 品牌 + 官网 ✅ **已完成**
- **上次完成：** Phase 3（品牌 + 官网 + 状态页 + 控制面板极简风）— 2026-07-17
- **下一阶段：** Phase 4 — 增长 + 规模
- **详细进度：** 见 `tracking/`

## 路由说明

| 路径 | 页面 | 访问权限 |
|------|------|---------|
| `/` | Dashboard 控制面板 | 需登录 |
| `/landing` | 产品官网 | 公开 |
| `/status` | 服务状态 | 公开 |
| `/login` / `/register` | 登录/注册 | 未登录 |

## 常用命令

```bash
npm run dev      # 开发服务器（localhost:3090）
npm run build    # 生产构建
npm run preview  # 预览构建
```
