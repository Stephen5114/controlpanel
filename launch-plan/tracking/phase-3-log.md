# Phase 3 执行日志 — 品牌 + 官网 + 状态页

> **目标：** 建立品牌视觉识别系统 + 上线产品官网 + 公开服务状态页
> **时间：** 2026-07-16
> **状态：** ✅ **已完成**

## 任务清单

| # | 任务 | 状态 | 完成日期 | 备注 |
|---|------|------|---------|------|
| 3.1 | 品牌资产 — Logo + Favicon | ✅ | 2026-07-16 | SVG Logo + Logo 组件 + index.html meta/OG/favicon |
| 3.2 | Landing Page — 产品官网 | ✅ | 2026-07-16 | Hero/Features/Pricing/Social/CTA/Footer 全 Section |
| 3.3 | Status Page — 服务状态页 | ✅ | 2026-07-16 | 公开路由 `/status`，8 项服务状态 + incident 列表 |
| — | 路由重构 | ✅ | 2026-07-16 | Landing Page `/`，控制面板 `/dashboard` |
| — | 整体验证 | ✅ | 2026-07-16 | `tsc -b` + `npm run build` 通过 |

## 改动文件汇总

### 新建文件（14 个）
- `public/logo.svg` — 定制 SVG Logo（闪电 + V 组合）
- `src/app/components/Logo.tsx` — 可复用 Logo React 组件（支持 compact + to 属性）
- `src/app/pages/LandingPage.tsx` — Landing 主页面
- `src/styles/landing.css` — Landing 页面完整样式（响应式 + 暗黑主题支持）
- `src/app/components/landing/LandingNav.tsx` — 导航条
- `src/app/components/landing/LandingHero.tsx` — Hero 区域（framer-motion 动画）
- `src/app/components/landing/LandingFeatures.tsx` — 6 大特性展示
- `src/app/components/landing/LandingPricing.tsx` — 3 档价格卡片
- `src/app/components/landing/LandingSocialProof.tsx` — 社交证明 + 用户评价
- `src/app/components/landing/LandingCTA.tsx` — 底部 CTA 区域
- `src/app/components/landing/LandingFooter.tsx` — 页脚
- `src/app/pages/StatusPage.tsx` — 服务状态页
- `src/styles/status.css` — 状态页样式

### 修改文件（8 个）
- `index.html` — meta description + OG tags + 多尺寸 favicon + apple-touch-icon
- `src/app/routes.tsx` — Landing 路由 `/`，控制面板 `/dashboard`，Status `/status`
- `src/app/layout/RootLayout.tsx` — Zap → Logo 组件，导航链接 `/` → `/dashboard`
- `src/main.tsx` — 导入 `landing.css` + `status.css`
- `src/app/components/Logo.tsx` — 新增 to 属性 + Link 客户端导航
- `src/app/components/index.ts` — 导出 Logo 组件
- `src/app/components/GuestGuard.tsx` — 重定向 `/` → `/dashboard`
- `src/app/pages/LoginPage.tsx` — 登录后跳转 `/` → `/dashboard`
- `src/app/pages/LoginAsPage.tsx` — 登录后跳转 `/dashboard`
- `src/app/pages/NotFoundPage.tsx` — "Back to dashboard" 链接 `/dashboard`
- `src/app/pages/TopupPage.tsx` — "Back to Dashboard" 链接 `/dashboard`
- `src/styles/index.css` — Logo 样式

### 修复的预存错误
- `BuySubscriptionPage.tsx` — 缺失 `</p>` 闭合标签
- `NodeDeployGuide.tsx` — 重复 `style` 属性
- `PublishDialog.tsx` — 错误的 import 路径

| 3.4 | 登录页品牌统一 — 对齐官网风格 | ✅ | 2026-07-17 | 移除服务器机架动画，替换为与官网一致的简洁品牌面板 |

## 改动文件汇总（Phase 3 第二次迭代）

### 修改文件
- `src/app/components/AuthMarketingPanel.tsx` — 重写品牌面板：移除服务器机架 SVG 动画，改用 Logo 组件 + 简洁品牌信息 + 渐变光晕背景，对齐官网（landing page）品牌风格
- `src/styles/auth.css` — 精简 700+ 行：删除 auth-brand 服务器机架动画 CSS（racks/LEDs/数据流动画），替换为简洁品牌面板样式（渐变背景、Logo、标签语、特性列表、底部徽章）
- `src/styles/index.css` — 删除 190+ 行重复的 auth-brand 机架动画样式（已移至 auth.css）
- `src/main.tsx` — 简化 AuthLoadingFallback：移除服务器机架 loading 动画，改为简约 Logo + 进度条 loading

### 设计统一要点
- 品牌面板背景 `linear-gradient(135deg, #0f172a, #1e293b, #0f172a)` — 与官网 CTA 区蓝色调一致
- 标签语使用渐变文字 `linear-gradient(135deg, #f8fafc, #94a3b8)` — 与官网 hero 标题渐变效果一致
- 品牌色使用 `--primary` 蓝色系，不再使用 amber/warning 色
- Logo 使用全局 Logo 组件，与官网和侧栏一致
- 底部徽章保留（99.9% Uptime / SSL Auto / 1-Click Deploy），样式简化
- Loading 状态只保留 Logo 脉冲 + 进度条，不再有服务器机架

### 构建产物变化
| 指标 | 改前 | 改后 |
|------|------|------|
| CSS 总大小 | ~290 kB | 不变（删除了机架 CSS，但 auth.css 仍在） |
| `AuthMarketingPanel` chunk | ~3.2 kB | 2.56 kB (-20%) |
| 构建时间 | 2.95s | 2.33s |

## 验证结果（Phase 3 第二次迭代）
- ✅ `tsc -b` 无错误
- ✅ `npm run build` 无 warning，2.33s 完成
- ✅ 登录页品牌面板与官网视觉一致
- ✅ 加载状态正常显示
- ✅ 移除了 900+ 行无用 CSS 动画代码

---

| 3.5 | 控制面板现代极简风改造 | ✅ | 2026-07-17 | 移除 editorial-system.css，统一主题系统，修复硬编码颜色 |

## 改动文件汇总（Phase 3 第三次迭代 — 控制面板极简风）

### 背景

用户要求控制面板与登录输入窗口风格统一 → **现代极简风**（日间/夜间/护眼三主题）。此前存在的 `editorial-system.css`（暴力风：粗边框、offset 阴影、小圆角、红品牌色）与极简目标完全冲突。

### 修改文件（4 个）

#### 1. `src/main.tsx`
- **移除** `import "./styles/editorial-system.css"` — 该文件的暴力风格（2px 边框、`3px 3px 0` 阴影偏移、`border-radius: 3px`、红 `--primary: #ff5a36`、衬线字体标题）覆盖所有极简样式，是最大冲突源

#### 2. `src/styles/index.css`
- **主题按钮预着色**：将 `.theme-toggle-btn__preview--day/classic` 改为 `--white/--warm`，适配新主题命名
- **主题菜单色块**：`.theme-menu__swatch--day/classic` 改为 `--white/--warm`
- **修复硬编码蓝色值**（所有 `#2563eb` / `#3b82f6` / `rgba(37,99,235,*)` → `var(--primary)` / `var(--primary-soft)`）：
  - `.primary-button` — 移除 `rgba(37,99,235,0.22)` 蓝色阴影
  - `.btn--primary` — 渐变色 → `var(--primary)` 纯色，移除蓝色阴影，hover/active 简化为透明度调节
  - `.interactive-card:hover/focus-visible` — 蓝色边框和阴影 → `var(--primary)` / `var(--primary-soft)`
  - `.icon-button:focus-visible` — 蓝色阴影 → `var(--primary-soft)`
  - `.badge--info` — 蓝色背景 → `var(--primary-soft)`
  - `.dashboard-alert:hover` / `.project-card:hover` — 移除硬编码蓝色阴影
- **移植 editorial-system.css 必要样式**（主题菜单、推广链接、affiliate-nav-promo 响应式）到 index.css，确保功能完整

#### 3. `src/styles/dashboard.css`
- `.al-sidebar__link.is-active` — 移除 `rgba(46,91,255,0.2)` 蓝色阴影
- `.al-searchbar__input-wrap:focus-within` — 蓝色阴影 → `var(--primary-soft)`
- `.files-workbench__pathbar-button:hover` — 移除 `rgba(37,99,235,0.5)` 蓝色阴影

#### 4. `src/styles/auth.css`
- 更新注释：移除对 editorial-system.css 的引用（已删除）

### 主题系统状态

| 主题 | CSS 类 | 变量值 | 说明 |
|------|--------|--------|------|
| 日间 White | `:root`（无 class） | `--bg: #f5f5f7`, `--primary: #6366f1` | 纯净白色极简 |
| 夜间 Dark | `:root.theme-dark` | `--bg: #0b0b0e`, `--primary: #818cf8` | 深色低眩光 |
| 护眼 Warm | `:root.theme-warm` | `--bg: #f4efe8`, `--primary: #a67c52` | 暖色调护眼 |

### 设计统一要点
- 控制面板所有主色引用 `var(--primary)`，不再有硬编码蓝色
- 按钮扁平化：无渐变色、无大阴影、hover 仅透明度变化
- 主题切换器标签：日间/夜间/护眼（中文），Day/Night/Warm（英文）
- 浏览器自动填充覆盖：`-webkit-box-shadow: 0 0 0 1000px var(--surface) inset` 解决灰色背景

### 构建验证
- ✅ `npm run build` 无 error、无 warning
- ✅ 主题切换（日间/夜间/护眼）正常工作
- ✅ 登录页白色极简风格完整保留
- ✅ 控制面板风格与登录页一致
