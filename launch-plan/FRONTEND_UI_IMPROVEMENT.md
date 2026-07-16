# HostVibeCoding 前端 UI 改进方案

> **目标：** 产品级 UI，对标 Vercel / Railway 的体验质量，建立品牌认知
> **原则：** 本文档只写设计规范 + 改进方向，执行跟踪见 `tracking/` 目录
> 版本：v1.1（修正 CSS 架构方案）
> 日期：2026-07-16

---

## 目录

1. [当前状态评估](#1-当前状态评估)
2. [设计原则](#2-设计原则)
3. [设计系统规范](#3-设计系统规范)
4. [CSS 架构重构](#4-css-架构重构)
5. [组件库建设](#5-组件库建设)
6. [页面改进清单](#6-页面改进清单)
7. [品牌视觉升级](#7-品牌视觉升级)
8. [无障碍与国际化](#8-无障碍与国际化)
9. [验收标准](#9-验收标准)

---

## 1. 当前状态评估

### 1.1 总体评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整度 | ⭐⭐⭐⭐ | 页面覆盖全面，登录/注册/仪表盘/计费/域名/VPS/联盟/工单均完备 |
| 设计一致性 | ⭐⭐⭐ | 有 CSS 变量体系，但 449 处内联样式破坏了统一性 |
| 组件复用 | ⭐⭐ | 缺少共享组件，Modal/Toast/Table 每页重写 |
| 代码可维护性 | ⭐⭐ | 部分 CSS 文件过大、命名混乱、有重复声明 |
| 品牌体验 | ⭐⭐⭐ | 有品牌色和 Logo，但未形成完整的品牌系统 |
| 响应式 | ⭐⭐⭐⭐ | 多个断点适配完善 |
| 无障碍 | ⭐⭐⭐ | 部分页面有 aria 属性，但覆盖率不足 |

### 1.2 关键数据

| 指标 | 数值 | 健康度 |
|------|------|--------|
| CSS 总行数 | **14,494 行**（18 个文件） | ❌ 偏大 |
| 最大 CSS 文件 | `domains.css` **5,216 行** | ❌ 需拆分 |
| 内联样式 | **449 处** `style={{}}` | ❌ 太多 |
| 可合并文件 | `auth.css` + `auth-brand.css` + `auth-loading.css` = 3 个 | ⚠️ 可合并 |
| 可合并文件 | `databases.css` + `databases-v2.css` = 2 个 | ⚠️ 可合并 |
| 主题数 | 3（Day / Dark / Classic） | ✅ 良好 |
| 响应式断点 | 3 档（1040 / 720 / 640） | ✅ 良好 |

### 1.3 当前文件结构

```
src/styles/
├── index.css             1,223 行  ← 设计系统 + 杂项
├── dashboard.css         1,567 行  ← 文件名误导（含 files/system/db 样式）
├── domains.css           5,216 行  ← 严重过大
├── ui-controls.css         790 行  ← 命名模糊
├── databases.css           628 行
├── databases-v2.css        501 行  ← 和上面可合并
├── auth.css                334 行
├── auth-brand.css          515 行  ← 可合并入 auth.css
├── auth-loading.css        216 行  ← 可合并入 auth.css
├── billing.css             177 行
├── affiliate.css           390 行
├── vps.css                  70 行
├── files.css               468 行
├── support.css             127 行
├── domain-bind.css       1,420 行
├── subscription-overview.css 371 行
└── editorial-system.css    481 行
```

---

## 2. 设计原则

> 所有 UI 改动遵循以下原则，优先级从高到低：

### P1: 一致性 > 创意
- 同一个事物在整个产品中使用相同的视觉表达
- 同样的组件有同样的间距、圆角、颜色、字号
- 宁可保守统一，不要各自精彩

### P2: 可维护性 > 快速实现
- 任何重复出现的 UI 模式必须抽成组件或 CSS 类
- 不用内联样式表达布局（`style={{ display: "flex", ... }}`）
- **CSS 按页面组织，每页一个文件，不改分散模式**

### P3: 开发者体验 = 用户体验
- 控制面板本身是开发者工具，UI 就是产品的一部分
- 空状态、加载态、错误态必须处理
- Onboarding 体验决定留存

### P4: 品牌渗透每个像素
- 颜色、字体、间距、动效 — 每个细节都在传递品牌
- 不做 "看起来像 Bootstrap" 的界面

---

## 3. 设计系统规范

### 3.1 颜色体系

当前颜色系统已经不错，需要补充的是：

```css
/* 已存在 ✅ */
--primary: #2563eb;
--success: #169b62;
--warning: #c07a13;
--error: #dc2626;

/* 需要补充 ❌ */
--primary-hover: #1d4ed8;
--primary-muted: #dbeafe;
--text-link: #2563eb;
--text-link-hover: #1d4ed8;
```

**规则：**
- 不要在任何地方写 `color: #1d4ed8` 或 `color: #b91c1c` — 全部用 CSS 变量
- 全局搜索硬编码颜色，替换为变量引用

### 3.2 字体系统

```css
--font-family: "Inter", "Segoe UI", -apple-system, sans-serif;
--font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
--font-size-xs: 0.72rem;
--font-size-sm: 0.82rem;
--font-size-base: 0.92rem;
--font-size-lg: 1.05rem;
--font-size-xl: 1.35rem;
--font-size-2xl: 1.75rem;
--font-size-3xl: clamp(2rem, 3vw, 2.8rem);
```

### 3.3 间距系统

当前间距值太多（8/10/12/14/16/18/20/24/28...）。逐步统一为：

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
```

### 3.4 圆角系统

当前圆角 7 种（24/14/12/10/8/6/4）。统一为 5 种：

| CSS 变量 | 值 | 用途 |
|----------|-----|------|
| `--radius-sm` | 6px | 小元素、徽章 |
| `--radius-md` | 10px | 按钮、输入框、紧凑卡片 |
| `--radius-lg` | 14px | 标准按钮、卡片 |
| `--radius-xl` | 20px | 大卡片 |
| `--radius-full` | 9999px | 圆角按钮、头像、标签 |

---

## 4. CSS 架构重构

### 4.1 方案（与你达成共识的）

> **不改当前按页面组织的模式。** 保留每页一个 CSS 文件。

只做 3 件事：

1. **抽 `variables.css`** — 所有变量集中到唯一文件，各页面 `@import`
2. **合并同模块小文件** — `auth*` 合并为一个，`databases*` 合并为一个
3. **删重复声明** — 全局搜重复的 transition / 基础样式，只保留一份

### 4.2 具体变更

#### ① 新建 `variables.css`

从 `index.css` 抽出 1-86 行的变量和主题定义，放到独立文件。

```css
/* src/styles/variables.css */
:root { /* 所有变量 */ }
:root.theme-dark { /* dark 变量 */ }
:root.theme-classic { /* classic 变量 */ }
```

每个 CSS 文件顶部加一行：

```css
@import "./variables.css";
```

#### ② 合并文件

| 当前文件 | 改为 |
|----------|------|
| `auth.css` (334行) + `auth-brand.css` (515行) + `auth-loading.css` (216行) | → `auth.css` (合并) |
| `databases.css` (628行) + `databases-v2.css` (501行) | → `databases.css` (合并) |

#### ③ 删重复

全局搜这 3 个文件里的重复声明，只保留 `index.css` 的：

- `index.css:106` — `body, .card, .topbar, input, select, textarea { transition: ... }`
- `auth.css:290` — 同上（删）
- `domains.css:588` — 同上（删）

#### ④ 补充缺失变量

| 目标 | 数量 | 备注 |
|------|------|------|
| 全局搜 `#[0-9a-f]{3,6}` 硬编码颜色 | 约 30 处 | 替换为 `var(--xxx)` |
| 统一 `border-radius` 零散值 | 约 20 处 | 替换为 `var(--radius-*)` |

### 4.3 目标文件结构

```
src/styles/                                   行数变化
├── variables.css        ← 新增 (86行)       +86
├── index.css            → 缩小 (1137行)      -86
├── auth.css             → 合并 (~1065行)     +515+216
├── databases.css        → 合并 (~1129行)     +501
├── dashboard.css        → 1,567行 (改内容名) 不动
├── domains.css          → 5,216行 (不动)     不动
├── billing.css           177行               不动
├── affiliate.css         390行               不动
├── vps.css                70行               不动
├── files.css             468行               不动
├── support.css           127行               不动
├── domain-bind.css     1,420行               不动
├── subscription-overview.css 371行           不动
├── editorial-system.css  481行               不动
└── ui-controls.css       790行               不动 (逐步废弃)
```

**结果：** 文件数从 18 → 17（减少），而不是增加。AI 一次读一个页面文件就能掌握全部上下文。

---

## 5. 组件库建设

### 5.1 做法

> **组件公共样式放在 `index.css` 里统一管理，不加新文件。**

在 `index.css` 尾部加一个 `/* ── Components ── */` 分区，所有组件类写在这里：

```css
/* ── Components ───────────────────────── */

/* Button */
.btn { ... }
.btn--primary { ... }   /* ← 替换现有的 .primary-button */
.btn--secondary { ... } /* ← 替换现有的 .secondary-button */
.btn--ghost { ... }

/* Modal */
.modal-overlay { ... }
.modal { ... }
.modal__header { ... }
.modal__footer { ... }

/* Toast */
.toast { ... }
.toast--success { ... }
.toast--error { ... }
.toast--warning { ... }
```

**好处：**
- 公共组件样式只在一个文件里，不会分散
- 每个页面 CSS 只管自己独有的样式
- AI 改组件去 `index.css`，改页面去对应文件，不会混淆

### 5.2 组件优先级

#### P0 — 必须立即创建

| 组件 | 替换目标 | 原因 |
|------|---------|------|
| `<Button>` | 替换 8 种按钮变体 | 每个页面都在用 |
| `<Modal>` | 替换 Dashboard/Billing 手写弹窗 | 重复实现 5+ 次 |
| `<Toast>` | 替换 `inline-message` | 全局通知需要 |

#### P1 — 尽快创建

| 组件 | 替换目标 |
|------|---------|
| `<Table>` | Billing/Domains/文件 列表 |
| `<Badge>` | 统一状态徽章 |
| `<Loading>` / Skeleton | 替换 "Loading..." 文字 |
| `<EmptyState>` | 统一空状态 |
| `<Tabs>` | 替换 Affiliate 手写 tab |

#### P2 — 逐步完善

`<Dropdown>` / `<Pagination>` / `<Tooltip>`

---

## 6. 页面改进清单

### 6.1 每个页面要改的内容

按优先级排列：

#### 🅰 P0 — DashboardPage（1.5 天）

| # | 位置 | 问题 | 改法 |
|---|------|------|------|
| 1 | lines 277-306 | 统计卡片用 style={{}} 定义布局 | 抽取为 `.stat-card` CSS 类 |
| 2 | lines 388-466 | 订阅卡片 20+ 处内联样式 | 抽取为 `.sub-card` 系列类 |
| 3 | lines 472-507 | 续费确认弹窗手写 | 用 `<Modal>` 组件 |
| 4 | lines 378-385 | `onMouseEnter` 改 style 性能差 | 改 CSS `:hover` |

#### 🅱 P1 — BuySubscriptionPage（1 天）

| # | 位置 | 问题 | 改法 |
|---|------|------|------|
| 1 | lines 289+ | 全局布局 style | 抽取 CSS 类 |
| 2 | lines 338-372 | 计划卡片选择样式 | 抽取为 `.plan-card` 类 |
| 3 | lines 605-690 | 内联样式 30+ 处 | 全部抽取 |

#### 🅲 P1 — BillingPage（1 天）

| # | 位置 | 问题 | 改法 |
|---|------|------|------|
| 1 | lines 259-267 | 内联消息 style | 用 `<Toast>` 组件 |
| 2 | lines 577-599 | StatCard 内联样式 | 和 Dashboard 共用 `.stat-card` |
| 3 | line 559 | 余额显示 span style | 抽取样式 |

#### 🅳 P2 — 其他页面（持续改进）

- `EnvVarsEditor.tsx` — 28 处内联样式，抽取为 CSS 类
- `PublishDialog.tsx` — 20+ 处内联样式
- `SubscriptionFilesPage.tsx` — view switch 等

### 6.2 缺失页面

| 页面 | 优先级 | 说明 |
|------|--------|------|
| **Landing Page** | P0 | 产品官网 — 最急！没有官网怎么拉用户 |
| **Onboarding 引导** | P1 | 新用户注册后的首次部署引导（driver.js 已装但没用） |
| **Status Page** | P2 | 服务状态 public 页面 |

---

## 7. 品牌视觉升级

### 7.1 Logo 与 Favicon

| 元素 | 当前 | 目标 |
|------|------|------|
| Logo | Lucide `Zap` 图标 | 定制 SVG（闪电 + "V" 组合） |
| Favicon | 无 | SVG favicon + 多尺寸 |
| Touch Icon | 无 | apple-touch-icon |

### 7.2 Landing Page

> **这是当前最大的缺口。** 控制面板做得再好，没有官网用户就找不到你。

需要的结构：

```
Vibe Hosting Landing Page
├── Hero: "Ship your code, we host the vibe"
│   ├── 3 步流程图: Code → Push → Live
│   └── CTA: "Deploy for free"
│
├── Features:
│   ├── One-click deploy (Git / CLI / FTP)
│   ├── Custom domain + Auto SSL
│   ├── Databases (MySQL / PostgreSQL)
│   ├── VPS instances
│   └── Affiliate program
│
├── Pricing:
│   ├── Free: 1 site, 1GB
│   ├── Pro: $5/mo, 5 sites, 5GB
│   └── Business: $15/mo, unlimited
│
├── Social Proof:
│   ├── Sites deployed counter
│   └── Developer testimonials
│
└── Footer + Status page link
```

### 7.3 动效体系

| 类型 | 工具 | 说明 |
|------|------|------|
| 页面过渡 | `framer-motion` | 路由切换流畅 |
| 微交互 | CSS transition | 按钮/卡片 hover，已有 ✅ |
| 骨架屏 | CSS | 替换 "Loading..."，视觉提升大 |
| 数字动效 | framer-motion | 统计数字滚翻效果 |

---

## 8. 无障碍与国际化

### 8.1 无障碍检查清单

| 检查项 | 状态 |
|--------|------|
| 表单 label 关联 input | ✅ 大部分有 |
| 按钮有 `aria-label` | ⚠️ 部分缺少 |
| 模态框焦点锁定 | ❌ 未实现 |
| 下拉菜单 Esc 关闭 | ⚠️ 部分实现 |
| 键盘导航顺序 | ⚠️ 未验证 |
| 颜色对比度 | ✅ 通过 |
| 页面区域 landmark | ⚠️ 部分缺少 |

**待修复：**
1. 所有模态框添加焦点锁定（`focus-trap`）
2. 下拉菜单添加 Esc 键关闭
3. 导航和 main 区域添加 aria landmark

### 8.2 国际化

当前 i18n 系统完善 ✅，`useLocalization` 全局可用。

---

## 9. 验收标准

### 代码质量
- [ ] 0 处内联 `style={{}}` 用于布局（动效值除外）
- [ ] 0 处硬编码颜色（所有颜色通过 CSS 变量引用）
- [ ] 0 处重复 CSS 声明
- [ ] 构建通过 `tsc -b` 无错误
- [ ] `npm run build` 无 warning

### 用户体验
- [ ] 所有按钮/链接有 hover + active 态
- [ ] 所有表单输入框有焦点态
- [ ] 空状态有引导文案和操作按钮
- [ ] 加载状态有 spinner 或骨架屏
- [ ] 错误状态有友好提示和重试选项

### 品牌一致性
- [ ] 所有页面使用统一字体系统
- [ ] 主色/辅助色/语义色在所有页面一致
- [ ] Logo 在控制面板和 Landing Page 一致
- [ ] 所有按钮使用 `<Button>` 组件

### 无障碍
- [ ] 所有 `<button>` 有 `aria-label` 或可见文字
- [ ] 所有模态框支持 Esc 关闭和焦点锁定
- [ ] 页面 landmark 标签完整
- [ ] Tab 键导航顺序正确

---

> 执行跟踪已移至 `tracking/` 目录。见 [`tracking/phase-1-log.md`](tracking/phase-1-log.md) 和 [`tracking/phase-2-log.md`](tracking/phase-2-log.md)。
