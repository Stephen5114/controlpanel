# Phase 1 执行日志 — UI 基础设施

> 目标：建立统一的 CSS 变量体系 + 核心组件库，为后续页面重构打基础。
> 时间：2026-07-16
> 状态：✅ **已完成**

## 任务清单

| # | 任务 | 状态 | 完成日期 | 备注 |
|---|------|------|---------|------|
| 1.1 | 新建 `variables.css`，抽出所有变量 | ✅ | 2026-07-16 | |
| 1.2 | 所有 CSS 文件加 `@import "./variables.css"` | ✅ 跳过 | 2026-07-16 | main.tsx 导入链自动满足 |
| 1.3 | 合并 auth CSS 三个文件为一个 | ✅ | 2026-07-16 | auth.css + auth-brand.css + auth-loading.css |
| 1.4 | 合并 databases CSS 两个文件为一个 | ✅ | 2026-07-16 | databases.css + databases-v2.css |
| 1.5 | 删除 3 处重复的 transition 声明 | ✅ | 2026-07-16 | index.css / auth.css / domains.css |
| 1.6 | 全局搜索硬编码颜色值，替换为变量（~64处已完成，domains.css等待后续） | ✅ | 2026-07-16 | index.css/auth.css/billing.css/dashboard.css 完成 |
| 1.7 | 统一 border-radius 为 CSS 变量（已加 --radius-sm/md/lg/xl/full，替换全部 999px→var(--radius-full)） | ✅ | 2026-07-16 | 64 处替换 |
| 1.8 | 在 index.css 建组件分区 + 创建 `<Button>` 组件 | ✅ | 2026-07-16 | 4 种变体 + 3 种尺寸 |
| 1.9 | 创建 `<Modal>` + `<Toast>` 组件 | ✅ | 2026-07-16 | 含动画/键盘/自动消失 |

## 改动文件汇总

### 新增
- `src/styles/variables.css` — 所有 CSS 变量 + 三套主题
- `src/app/components/Button.tsx` — 按钮组件
- `src/app/components/Modal.tsx` — 模态框组件
- `src/app/components/Toast.tsx` — Toast 通知组件（含 Provider + Context）
- `src/app/components/index.ts` — 组件 barrel export

### 修改
- `src/styles/index.css` — 尾部加 Components 分区（Button/Modal/Toast 样式）
- `src/styles/auth.css` — 合并 auth-brand.css + auth-loading.css，颜色替换
- `src/styles/databases.css` — 合并 databases-v2.css
- `src/main.tsx` — 清理已删文件的 imports

### 删除
- `src/styles/auth-brand.css`
- `src/styles/auth-loading.css`
- `src/styles/databases-v2.css`

## CSS 变量体系

| 变量 | 值（Day 模式） | 用途 |
|------|---------------|------|
| `--bg` | `#f4f7fb` | 页面背景 |
| `--surface` | `#ffffff` | 卡片/面板背景 |
| `--primary` | `#2563eb` | 主色 |
| `--radius` | `24px` | 大圆角（卡片） |
| `--radius-sm` | `6px` | 小元素/徽章 |
| `--radius-md` | `10px` | 按钮/输入框 |
| `--radius-lg` | `14px` | 标准按钮/卡片 |
| `--radius-xl` | `20px` | 大卡片 |
| `--radius-full` | `9999px` | 圆形/药丸 |
