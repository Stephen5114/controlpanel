# Vibe Hosting 官网 — 设计系统文档

> 项目：Vibe Hosting（主机服务品牌）
> 基调：**暗色赛博/科技风**，搭配霓虹蓝紫渐变、网格背景、3D 视差与微动效

---

## 一、色彩体系

### 1.1 CSS 自定义属性（`:root`）

| 变量 | 值 | 用途 |
|------|------|------|
| `--bg` | `#09090b` | 主背景（极黑） |
| `--bg-elevated` | `#111114` | 次级背景 / 卡片背景 |
| `--surface` | `#16161a` | 表面色（按钮、表单） |
| `--surface-hover` | `#1c1c21` | 表面悬浮态 |
| `--surface-bright` | `#222228` | 更亮的表面 |
| `--border` | `rgba(255,255,255,0.07)` | 边框（极淡白） |
| `--border-hover` | `rgba(255,255,255,0.14)` | 边框悬浮态 |
| `--text` | `#f0f0f3` | 主文字（近白） |
| `--text-secondary` | `#a0a0ab` | 次级文字 |
| `--text-tertiary` | `#63636e` | 辅助/占位文字 |
| `--accent` | `#6366f1` | 品牌主色（靛蓝 indigo） |
| `--accent-hover` | `#818cf8` | 品牌色悬浮 |
| `--accent-glow` | `rgba(99,102,241,0.25)` | 品牌色发光光晕 |
| `--accent-subtle` | `rgba(99,102,241,0.08)` | 品牌色极淡背景 |
| `--green` | `#22c55e` | 成功/在线状态 |
| `--green-subtle` | `rgba(34,197,94,0.12)` | 成功态背景 |
| `--amber` | `#f59e0b` | 警告色 |

### 1.2 品牌 LOGO 配色

- LOGO 背景：`#1e1b4b`（深紫）
- LOGO 边框：`rgba(245,158,11,0.35)`（琥珀色半透明）
- LOGO 闪电图标：`#fbbf24` → 悬浮时 `#f59e0b`
- LOGO 发光：`rgba(245,158,11,0.25)`

### 1.3 标题渐变（Hero 主标题）

```css
background: linear-gradient(135deg,
  #ffffff 10%,       /* 白 */
  #818cf8 35%,       /* 浅紫 */
  #38bdf8 55%,       /* 天蓝 */
  #c084fc 75%,       /* 粉紫 */
  #ffffff 90%);      /* 白 */
background-size: 400% 400%;
-webkit-background-clip: text;
animation: tech-gradient-flow 8s ease infinite;
```

> 配合 `filter: drop-shadow(0 2px 20px rgba(99,102,241,0.25))` 增强光感。

### 1.4 语义色

| 场景 | 背景 | 文字 | 边框 |
|------|------|------|------|
| 成功 (success) | `--green-subtle` | `--green` | `rgba(34,197,94,0.2)` |
| 危险 (danger) | `rgba(239,68,68,0.1)` | `#f87171` | `rgba(239,68,68,0.2)` |
| 警告 (warning) | `rgba(245,158,11,0.1)` | `--amber` | `rgba(245,158,11,0.15)` |

---

## 二、线条元素系统

### 2.1 基础边框

所有边框使用统一的 `--border`（`rgba(255,255,255,0.07)`）：
- `border: 1px solid var(--border)` — 卡片、按钮、表单、表格、模态框
- 悬浮态：`border-color: var(--border-hover)` 或 `var(--accent)`
- 轮播分割线使用 `background: var(--border)` 配合 `gap: 1px` 实现 1px 分隔

### 2.2 分割线（Section Divider）

```css
.section-divider {
  height: 1px;
  background: var(--border);
  border: none;
}
```
居中，宽度 `min(1200px, calc(100% - 40px))`，置于各 major section 之间。

### 2.3 背景网格线

**全局网格（bg-grid）：**
```css
background-image:
  linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
background-size: 64px 64px;
mask-image: radial-gradient(ellipse 70% 50% at 50% 0%, black 20%, transparent 100%);
```
固定全屏定位，径向遮罩从顶部中心渐变消失。

**右侧面板 3D 网格（wireframe-scroll-grid）：**
```css
background-image: 
  linear-gradient(rgba(56,189,248,0.15) 1.5px, transparent 1.5px),
  linear-gradient(90deg, rgba(56,189,248,0.15) 1.5px, transparent 1.5px);
background-size: 50px 50px;
transform: perspective(400px) rotateX(68deg)
           translateY(calc(var(--scroll-y, 0px) * -0.45px));
mask-image: radial-gradient(ellipse at center, black 15%, transparent 75%);
```
线色为 **天蓝（#38bdf8）**，带 3D 透视和滚动视差。

### 2.4 霓虹扫描线（Cyber Scanline）

```css
.cyber-scanline {
  position: absolute;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(56,189,248,0.8), transparent);
  box-shadow: 0 0 8px rgba(56,189,248,0.8);
  animation: scan-vertical 4s linear infinite;
}
```
在猴子卡片上垂直循环扫描。

### 2.5 旋转 HUD 环

```css
.hud-ring {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px dashed rgba(56,189,248,0.4);
  animation: spin-hud 10s linear infinite;
}
.hud-ring::before {
  /* 内环，双色旋转 */
  border: 1px solid rgba(167,139,250,0.25);
  border-left-color: rgba(56,189,248,0.6);
  animation: spin-hud 4s linear infinite reverse;
}
```

### 2.6 特色卡片顶部渐变线

Featured 计划卡片：
```css
.plan-card.featured::before {
  content: "";
  position: absolute;
  top: 0; left: 24px; right: 24px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
```

CTA 区域也有类似的顶部渐变线：
```css
.cta-wrapper::before {
  content: "";
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
```

### 2.7 表头底部分隔线

Footer 栏目标题使用 2px accent 色底部边框：
```css
.footer-heading {
  border-bottom: 2px solid var(--accent);
  display: inline-block;
  align-self: flex-start;
}
```

### 2.8 Footer 底部边界

```css
.footer-bottom {
  border-top: 1px solid var(--border);
}
```

---

## 三、结构布局

### 3.1 页面层级

```
site-shell          (相对定位容器)
├── bg-grid         (固定背景网格)
├── bg-glow         (顶部紫色光晕)
├── navbar          (sticky 顶部导航)
├── main
│   ├── scroll-bg-glow ×3 (滚动环境光晕)
│   ├── hero        (分栏 Hero)
│   │   ├── left    (文字、按钮、技术标签)
│   │   ├── right   (3D 猴子卡片 + 浮动代码块)
│   │   └── stats   (三栏统计数据)
│   ├── section-divider
│   ├── pricing     (Shared / VPS / Dedicated)
│   ├── section-divider
│   ├── platform    (功能特性网格)
│   ├── section-divider
│   ├── timeline    (四步时间轴)
│   ├── section-divider
│   └── cta         (联系表单)
├── footer
│   ├── footer-grid (4列网格)
│   └── footer-bottom
├── lang-modal      (语言/货币选择)
├── cookie-banner   (Cookie 同意条)
└── contact-modal   (联系邮箱弹窗)
```

### 3.2 容器系统

```css
.container {
  width: min(1200px, calc(100% - 40px));
  margin: 0 auto;
}
/* 移动端 768px 以下 */
@media (max-width: 768px) {
  .container { width: min(100% - 32px, 100%); }
}
```

### 3.3 网格布局

| 模块 | 布局 | 列数 | 间距 |
|------|------|------|------|
| Hero 分栏 | `grid-template-columns: 1.15fr 0.85fr` | 2 | 40px |
| 统计数据 | `grid-template-columns: repeat(3, 1fr)` | 3 | 1px |
| 计划卡片 | `grid-template-columns: repeat(3, 1fr)` | 3 | 1px |
| VPS 卡片 | `grid-template-columns: repeat(4, 1fr)` | 4 | 12px |
| 功能特性 | `grid-template-columns: repeat(2, 1fr)` | 2 | 1px |
| Footer | `grid-template-columns: repeat(4, 1fr)` | 4 | 40px |
| CTA 区域 | `grid-template-columns: 1fr 400px` | 2 | 48px |
| ToS 页面 | `grid-template-columns: 280px 1fr` | 2 | 48px |

所有 `gap: 1px` 的网格配合 `background: var(--border)` 实现极细分割线效果。

### 3.4 间距系统

- **Section 上下内边距**：`padding: 100px 0`（移动端 64px）
- **Section header 与内容的间距**：`margin-bottom: 56px`
- **Hero 区域**：`padding: 80px 0 40px`
- **CTA 区域**：`padding: 80px 0 100px`
- **卡片内边距**：`padding: 36px 32px`（移动端 28px 24px）
- **Navbar 高度**：`height: 64px`

### 3.5 响应式断点

| 断点 | 变化 |
|------|------|
| `1024px` | Hero 分栏变单列；计划卡片、功能网格变 1 列；CTA 变单列；Footer 变 2 列；统计数据变单列；ToS 侧边栏隐藏 |
| `768px` | 导航链接隐藏；Brand 文字隐藏；Hero 按钮垂直堆叠；Footer 变 1 列；CTA 内边距缩小 |
| `480px` | 卡片圆角从 `--radius-xl`（24px）降为 `--radius-lg`（16px） |
| `1050px` | VPS 卡片网格 4→2 列 |
| `720px` | VPS 卡片网格 2→1 列；定价 tab 切换垂直排列 |

### 3.6 圆角系统

| 变量 | 值 | 应用场景 |
|------|------|----------|
| `--radius-sm` | 8px | LOGO、小元素 |
| `--radius-md` | 12px | 按钮、表单、模态框、卡片内部元素 |
| `--radius-lg` | 16px | 大卡片、CTA 容器 |
| `--radius-xl` | 24px | 主卡片组、统计组外层、模态框 |
| `999px` | pill | Badge、技术标签、tab 切换 |

---

## 四、特殊视觉元素

### 4.1 背景光晕

**顶部品牌光晕（bg-glow）：**
```css
background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
width: 900px; height: 900px; top: -40%; left: 50%; transform: translateX(-50%);
```

**滚动环境光晕（scroll-bg-glow）×3：**
- `glow-1`：`--accent` 色，top: 600px, left: -15%, 速度 -0.15
- `glow-2`：`--accent-hover` 色，top: 1400px, right: -15%, 速度 0.12
- `glow-3`：`#06b6d4`（青色），top: 2200px, left: 20%, 速度 -0.08

均为 `filter: blur(150px)` + `opacity: 0.14` 的 `550px` 圆形。

### 4.2 3D 浮动代码块

三个代码块围绕猴子卡片排列，带滚动视差：

| 模块 | 内容 | 速度 | 位置 |
|------|------|------|------|
| `block-terminal` | 终端部署命令 | `-0.22`（正向） | 左上，top: -45px, left: -140px |
| `block-json` | vibe.json 状态 | `0.15`（反向） | 左下，bottom: -15px, left: -160px |
| `block-api` | server.js 代码 | `-0.12`（正向） | 右侧，bottom: 65px, right: -150px |

每个代码块都有：
- 模拟窗口标题栏（红/黄/绿三色圆点）
- `backdrop-filter: blur(20px)` 半透明毛玻璃背景
- `border: 1px solid rgba(255,255,255,0.08)`
- 语法高亮文字色（紫色/蓝色/橙色/金色/绿色）

### 4.3 赛博猴子卡片

- 尺寸：280×280px
- 背景：`rgba(22,22,26,0.45)` 半透明 + `backdrop-filter: blur(20px)`
- 边框：`rgba(255,255,255,0.08)`，悬浮时变 `rgba(99,102,241,0.3)`
- 阴影：`0 24px 80px rgba(0,0,0,0.5)` + `0 0 40px rgba(99,102,241,0.15)`
- **3D 倾斜追踪**：鼠标移动时 `rotateX/Y` 最多 ±15°，悬浮 scale 1.03
- 内部图层：眼镜发光、屏幕辉光、扫描线、HUD 环、键盘、火花、双手

### 4.4 霓虹键盘与打字动效

- 底部键盘：5 列 × 3 行网格，按键随机快速闪烁（`key-tap` 动画）
- 子弹火花：5 个彩色火花从底部射出（天蓝、紫色、橙色）
- 赛博双手：左右 SVG 手交替敲击（`type-left-hand` / `type-right-hand`），颜色从 blue 到 purple 渐变

### 4.5 打字机效果

Typewriter 组件逐字显示终端输出，配合代码块的实时感。

### 4.6 滚动渐入（Scroll Reveal）

```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(40px) scale(0.96);
  transition: opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1),
              transform 1.1s cubic-bezier(0.16, 1, 0.3, 1);
}
.scroll-reveal.reveal-active {
  opacity: 1;
  transform: translateY(0) scale(1);
}
```
使用 IntersectionObserver 在元素进入视口时添加 `reveal-active` 类。提供 `.stagger-1` 到 `.stagger-4` 延迟（80ms 递增）。

---

## 五、按钮系统

| 类型 | 背景 | 文字 | 边框 | 阴影 |
|------|------|------|------|------|
| `btn-primary` | `--accent` | white | 无 | `0 0 20px var(--accent-glow)`，悬浮加深 |
| `btn-secondary` | `--surface` | `--text` | `1px solid var(--border)` | 无 |
| `btn-ghost` | transparent | `--text-secondary` | 无 | 无 |
| `btn-outline` | transparent | `--accent` | `1.5px solid var(--accent)` | 无，悬浮变为 `--accent` 背景 |

尺寸变体：`btn-lg`（14+28px）、`btn-sm`（8+14px）、默认（10+20px）。

---

## 六、动画系统

| 动画名称 | 时长 | 用途 |
|----------|------|------|
| `pulse` | 2s | Hero badge 绿点呼吸 |
| `tech-gradient-flow` | 8s | 标题渐变流动 |
| `char-loop` | 8s | 标题逐字循环渐入/出 |
| `scan-vertical` | 4s | 扫描线从上到下 |
| `spin-hud` | 10s / 4s | HUD 双环旋转 |
| `neon-pulse` | 2-3s | 眼镜/屏幕辉光呼吸 |
| `key-tap` | 250-500ms | 键盘按键随机闪烁 |
| `shoot-spark-*` | 1.6-2.4s | 火花射出 |
| `type-left-hand` | 0.16s | 左手打字 |
| `type-right-hand` | 0.14s | 右手打字 |
| `cookie-slide-in` | 0.5s | Cookie 横幅滑入 |
| `modal-fade-in` | 0.3s | 模态框背景淡入 |
| `modal-slide-up` | 0.4s | 模态框内容上滑 |
| `pricing-panel-in` | 0.22s | 定价面板切换 |
| `pulse-uptime` | 1s | 在线状态微动 |

---

## 七、阴影系统

| 层级 | 阴影值 | 用途 |
|------|--------|------|
| 卡片默认 | `0 24px 80px rgba(0,0,0,0.5)` | 猴卡 |
| 卡片 + 品牌光 | `0 0 40px rgba(99,102,241,0.15)` | 猴卡 |
| 按钮光晕 | `0 0 20px var(--accent-glow)` | primary 按钮 |
| 代码块 | `0 12px 32px rgba(0,0,0,0.45)` | 浮动代码块 |
| 跟随卡片 | `0 16px 40px rgba(0,0,0,0.35)` | 政策页面卡片 |
| 模态框 | `0 24px 80px rgba(0,0,0,0.5)` + `0 0 40px rgba(99,102,241,0.2)` | 语言选择弹窗 |

---

## 八、毛玻璃效果（Glassmorphism）

多处使用 `backdrop-filter: blur(...) saturate(1.4)`：

| 元素 | 模糊值 | 背景 |
|------|--------|------|
| Navbar | blur(16px) | `rgba(9,9,11,0.8)` |
| 猴子卡片 | blur(20px) | `rgba(22,22,26,0.45)` |
| 浮动代码块 | blur(20px) | `rgba(9,9,11,0.55)` |
| Cookie 横幅 | blur(20px) | `rgba(22,22,26,0.75)` |
| 模态框 | blur(24px) | `rgba(22,22,26,0.85)` |

---

## 九、排版

- 字体栈：`"Inter", -apple-system, "Segoe UI", sans-serif`
- 代码字体：`Consolas, Monaco, "Andale Mono", monospace`
- 全局抗锯齿：`-webkit-font-smoothing: antialiased`
- 标题字重：**800**（ExtraBold），正文 500-700
- 标题字间距：`-0.02em` 到 `-0.055em`（越大的标题间距越紧）
- 正文字号：`0.88rem` 到 `1.1rem`，行高 `1.6` 到 `1.75`
