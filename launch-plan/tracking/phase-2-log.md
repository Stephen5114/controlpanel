# Phase 2 执行日志 — 页面打磨

> 目标：把所有主要页面的内联样式抽成 CSS 类，统一用组件库，修复无障碍。
> 预计时间：第 3-4 周
> 状态：⏳ **待开始**

## 任务清单

| # | 任务 | 预估天数 | 状态 | 日期 | 备注 |
|---|------|---------|------|------|------|
| 2.1 | DashboardPage 重构 | 1.5 天 | ☑ | 2026-07-16 | 抽取约30处内联样式→CSS类，使用Badge/EmptyState/Button组件，JS hover→CSS :hover |
| 2.2 | BuySubscriptionPage 重构 | 1 天 | ☑ | 2026-07-16 | 抽取全部50+处内联样式→CSS类(bs-*)，重构PlanCard/SpecRow/SummaryRow子组件，创建buy-subscription.css + main.tsx导入 |
| 2.3 | BillingPage 重构 | 1 天 | ☑ | 2026-07-16 | MetricCard 抽取 stat-card 类，替换 Badge({6})+状态映射，整理 billing.css 重复 |
| 2.4 | EnvVarsEditor 重构 | 0.5 天 | ☑ | 2026-07-16 | 抽取全部28处内联样式→CSS类(env-*)，创建env-vars-editor.css + main.tsx导入 |
| 2.5 | PublishDialog 重构 | 0.5 天 | ☑ | 2026-07-16 | 抽取144处内联样式→CSS类(pd-*)，创建publish-dialog.css + main.tsx导入 |
| 2.6 | 创建 Table / Badge / EmptyState 组件 | 1 天 | ☑ | 2026-07-16 | Badge(6色) + EmptyState(2尺寸) + Table(泛型/响应式) |
| 2.7 | 无障碍修复 | 1 天 | ☑ | 2026-07-16 | Modal焦点锁定+Tab循环+自动聚焦，全局icon按钮aria-label补全，Deployment行键盘导航+aria-expanded |
| — | DeploymentsPage 重构 | — | ☑ | 2026-07-16 | 抽取42处内联样式→CSS类(dep-*)，创建deployments.css |
| — | SettingsPage 重构 | — | ☑ | 2026-07-16 | 抽取全部内联样式→CSS类(st-*)，创建settings.css |
| — | SubscriptionDatabasesPage 重构 | — | ☑ | 2026-07-16 | 抽取主要内联样式→CSS类(sdb-*)，创建subscription-databases.css |
| — | SiteSettingsPage 重构 | — | ☑ | 2026-07-16 | 抽取全部内联样式→CSS类(ss-*)，创建site-settings.css |
| — | TopupPage 重构 | — | ☑ | 2026-07-16 | 抽取全部内联样式→CSS类(tp-*)，创建topup.css |
| — | NodeDeployGuide 重构 | — | ☑ | 2026-07-16 | 抽取主要内联样式→CSS类(ndg-*)，创建node-deploy-guide.css |

## 备注

- 开始前确认 Phase 1 的变量和组件已就绪
- 重构时逐步用 `<Button>` 替换手写按钮
- 内联样式抽取为 CSS 类放在页面对应的 CSS 文件中
