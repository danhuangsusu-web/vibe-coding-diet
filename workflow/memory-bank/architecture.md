# 食刻 AI 当前架构

> 基线日期：2026-09-16（已同步步骤 1 至步骤 13）
> 记录原则：本文件描述当前仓库事实。尚未实现的目标只在“计划边界”中标注，不与现状混写。

## 1. 总览

仓库是一个 pnpm monorepo，当前由四个实际工作区组成：

- `apps/miniprogram`：Taro React 微信小程序；
- `apps/server`：Next.js 服务端和 API；
- `packages/shared`：跨端 Zod Schema 与共享类型；
- `packages/nutrition`：确定性营养评级与热量区间规则。

当前代码已完成工程骨架、静态首页、健康接口、模型供应商工厂、最小评级函数、shared、nutrition、server 的 Vitest 自动化测试基线、完整的共享业务契约（资料、餐食、评估、记录、统一 API 错误）、按受控词表计算热量区间的最小规则（含 D1c 的两阶段未知处理）、动态餐次额度与红黄绿灯评级（含高油高糖最低黄灯）、由规则生成的原因与建议白名单、与共享契约对齐的数据库结构和已初始化的固定演示资料、演示资料的读取与更新接口、餐食记录的创建查询与删除接口、两个离线演示样例与统一的 `parseMeal` 解析契约，以及小程序的视觉基础（Token、基础控件、奶油背景导航栏）、五页路由、跨页草稿状态和 P02 餐食输入页的离线行为。P01、P03、P04、P05 仍是骨架，AI 解析实现尚不存在；服务端侧已可支撑完整离线闭环。

## 2. 根目录职责

| 路径 | 当前职责 | 备注 |
| --- | --- | --- |
| `package.json` | 定义 monorepo 名称、Node/pnpm 约束和两端开发、构建、测试、类型、数据库脚本，并声明根 Vitest 开发依赖 | `test` 运行一次全仓测试，`test:watch` 进入监听模式；`db:seed` 转发到服务端脚本 |
| `pnpm-workspace.yaml` | 纳入 `apps/*` 和 `packages/*`，声明允许执行的依赖构建脚本 | 当前工作区入口 |
| `pnpm-lock.yaml` | 锁定真实依赖树 | 步骤 1 起包含 Vitest 3.2.7 及其传递依赖；Jest/Playwright 名称仅为传递依赖 |
| `vitest.config.ts` | 定义 shared、nutrition、server 的 Node 测试入口 | 只收集三处 `*.test.ts`，零测试视为失败 |
| `.npmrc` | 将 pnpm store 放在仓库内并放宽 peer dependency 检查 | `.pnpm-store` 被忽略 |
| `.gitignore` | 忽略依赖、构建产物、缓存、覆盖率和环境文件 | 当前仓库已启用 Git |
| `README.md` | 说明产品、环境、启动与常用检查 | 明确核心解析和持久化仍待接入 |
| `食刻AI_PRD_通俗版.md` | 当前产品范围基准 V0.3 | 本轮设计的上游需求资料 |
| `PRD.docx` | 更早、范围更大的产品设想 | 仅作为探索资料，不控制本轮范围 |
| `a small prd.txt` | 三个产品方向的早期分析 | 仅作为背景资料 |
| `scripts/` | 空目录 | 当前无可执行内容 |
| `.workbuddy_html/` | 五个高保真浏览器原型与设计记录，P0 视觉验收基准 | 未被 `.gitignore` 排除；若后续初始化 Git，需决定是否纳入版本控制 |
| `.workbuddy` | 仅有历史工作记录目录，当前不含 P01 至 P05 HTML | 不作为页面视觉验收路径 |

## 3. 微信小程序

### 3.1 配置

| 路径 | 当前职责 |
| --- | --- |
| `apps/miniprogram/package.json` | Taro、React、TDesign、Jotai、Sass、Webpack 和微信类型依赖及 dev/build/typecheck 脚本 |
| `apps/miniprogram/config/index.ts` | 配置 Taro 项目、750 设计宽度、Webpack 5、源码和输出目录 |
| `apps/miniprogram/project.config.json` | 微信开发者工具项目，使用小程序测试号提供的 AppID，输出根目录为 `dist/` |
| `apps/miniprogram/tsconfig.json` | 严格 TypeScript、Bundler 模块解析、`@/*` 路径别名 |
| `apps/miniprogram/babel.config.js` | Taro React TypeScript Babel preset |
| `apps/miniprogram/types/global.d.ts` | 小程序项目的全局类型声明入口 |

`project.private.config.json` 由微信开发者工具在本地生成，存放个人设置，已由 `.gitignore` 排除。

### 3.2 视觉基础

| 路径 | 当前职责 |
| --- | --- |
| `apps/miniprogram/src/styles/_tokens.scss` | 颜色、文字、间距、圆角、阴影和稳定尺寸的共享 Token；数值按 Taro 750 设计宽度书写，在 375px 逻辑宽度上渲染为一半 |
| `apps/miniprogram/src/styles/_mixins.scss` | `pressable`、`pressed` 与 `stable-text`（`overflow-wrap: anywhere` 加 `min-width: 0`，防止文字溢出） |
| `apps/miniprogram/src/components/ui/primitives.tsx` | `AppPage`、`IconButton`、`PageHeader`、`SurfaceCard`、`StatusBadge`、`SegmentedControl`、`PrimaryButton`、`BottomActionBar` |
| `apps/miniprogram/src/components/ui/primitives.scss` | 上述基础控件的样式，统一使用 Token |
| `apps/miniprogram/src/components/ui/index.ts` | 基础控件的公开出口 |

关键约束：

- 所有色值与 design-document.md 第 6.3 节的色彩 Token 一致，共 21 个色值；
- 字号在 375px 逻辑宽度下：正文 14px、辅助文字 12px；生产样式全局 `letter-spacing: 0`；
- 可操作控件热区 44px，主操作高度 52px；
- 状态信息不得只靠颜色编码：`StatusBadge` 同时提供颜色、图标（✓ / ! / ×）与文字；
- 底部安全区使用 `env(safe-area-inset-bottom)`，宽屏使用 `max-width` 约束；
- 不复制高保真原型的手机外壳、固定状态栏或展示用状态标签。

### 3.3 路由与跨页草稿

| 路径 | 当前职责 |
| --- | --- |
| `apps/miniprogram/src/navigation/routes.ts` | 集中定义 `ROUTES`（五个页面的路径）与 `AppRoute` 类型；页面跳转统一引用该常量 |
| `apps/miniprogram/src/state/meal-flow.ts` | 跨页草稿 `MealFlowDraft`、空草稿工厂、读写 atom、重置 atom 与内存 store |

五个页面对应关系：

| 页面 | 路径 | 对应原型 |
| --- | --- | --- |
| 今日首页 | `/pages/home/index` | P01 |
| 餐食输入 | `/pages/meal-input/index` | P02 |
| 识别确认 | `/pages/meal-confirm/index` | P03 |
| 评估结果 | `/pages/meal-result/index` | P04 |
| 历史与设置 | `/pages/history/index` | P05 |

约束：

- 草稿**只包含**三个字段：`inputSummary`（输入摘要）、`parsedMeal`（解析结果）、`assessment`（评估结果）。页面局部状态不得进入草稿；
- 草稿**不做持久化**：store 是内存态，小程序重启后自动回到空草稿，符合“不恢复未保存草稿”的要求；
- 取消记录时用重置 atom 一次性清空草稿并回到首页；
- 不引入 tabBar，页面之间用 `navigateTo` / `navigateBack` / `reLaunch` 流转。

### 3.4 接口地址注入

| 路径 | 当前职责 |
| --- | --- |
| `apps/miniprogram/config/api-base-url.ts` | `resolveApiBaseUrl(nodeEnv, configuredValue)`：配置值优先并去除尾部斜杠；未配置时开发环境返回 `http://127.0.0.1:3000`，生产环境返回空值 |
| `apps/miniprogram/config/index.ts` | 通过 Taro `defineConstants` 注入编译常量 `__API_BASE_URL__` |
| `apps/miniprogram/types/global.d.ts` | 声明 `__API_BASE_URL__` 的全局类型 |
| `apps/miniprogram/.env.example` | 说明 `TARO_APP_API_BASE_URL` 的用途与默认行为 |

接口地址是编译期常量，业务页面不得硬编码地址。生产构建的链路（HTTPS、域名配置）属于 P1。

### 3.5 运行代码

| 路径 | 当前职责 |
| --- | --- |
| `apps/miniprogram/src/app.tsx` | 根组件，用 Jotai `Provider` 包裹子节点并注入草稿 store |
| `apps/miniprogram/src/app.config.ts` | 注册上述五个页面；导航栏背景为奶油背景 `#FAF6EF`，标题为“食刻 AI”；无 tabBar |
| `apps/miniprogram/src/app.scss` | 引用 Token，统一页面背景、主文字色、中文字体栈与字距，并暴露一组 `--food-*` CSS 变量 |
| `apps/miniprogram/src/styles/_flow-page.scss` | 流程页共用的卡片文案与次要按钮样式 |
| `apps/miniprogram/src/pages/meal-input/index.tsx` | P02 餐食输入页：单图选择与本地压缩、文字输入、离线样例、提交锁、4 秒进度、12 秒停止等待、错误恢复、草稿写入和前往 P03 |
| `apps/miniprogram/src/pages/meal-input/index.scss` | P02 上传卡、虚线区、图片预览、文字框、样例标签、吸底操作及分析/权限/失败/无餐食状态样式 |
| `apps/miniprogram/src/pages/meal-input/meal-input-state.ts` | P02 的纯状态转换、有效输入判断、解析入参构造和图片来源标签 |
| `apps/miniprogram/src/pages/meal-input/meal-input-state.test.ts` | 覆盖空输入、提交锁、图片/文字切换和失败恢复时的文字保留 |
| `apps/miniprogram/src/pages/{home,meal-confirm,meal-result,history}/index.tsx` | P01、P03、P04、P05 页面骨架：只接通导航，不含对应业务流程 |
| `apps/miniprogram/src/pages/*/index.scss` | 各页局部样式 |
| `apps/miniprogram/src/pages/*/index.config.ts` | 各页导航标题；按 D6 统一为应用名“食刻 AI” |
| `apps/miniprogram/src/services/meal-parser.ts` | 小程序统一 `parseMeal(input)` 门面；当前只含两个离线样例，页面不判断 offline/ai |
| `apps/miniprogram/src/services/meal-parser.test.ts` | 覆盖两组文字样例、图片样例、未知文字，并与服务端步骤 10 样例逐项比对防漂移 |
| `apps/miniprogram/src/services/meal-image-policy.ts` | 无平台依赖的图片尺寸、格式、大小、质量和错误分类规则 |
| `apps/miniprogram/src/services/meal-image.ts` | 微信单图选择、本地读取、最长边 1280px/质量 75 压缩、JPG/PNG 与 1MB 限制 |
| `apps/miniprogram/src/services/meal-image.test.ts` | 覆盖等比尺寸、HEIC/未知格式拒绝、取消与权限错误分类 |

按 D6，原生导航栏保留应用名，页面内标题继续由 `PageHeader` 承担，两行并存的呈现是预期行为。

当前限制：

- P02 已实现步骤 13 的离线行为；P01、P03、P04、P05 仍是骨架，首页完整形态属于步骤 17，其余页面属于步骤 14、16、18；
- P02 图片只在本地选择、预览和压缩，不上传、不持久化；真实图片解析属于步骤 21；
- P02 只识别两组离线样例：图片默认映射 `northeast-combo`，文字必须匹配两个样例之一；小程序与服务端样例目前由一致性测试锁定，但在步骤 20 建立真实解析接口前仍各自保存一份运行时数据；
- P02 会写入现有跨页草稿并导航到 P03，但 P03 仍未展示或编辑解析结果；
- 尚无小程序请求层；`__API_BASE_URL__` 已定义但尚无消费方，接口调用在其后步骤引入；
- TDesign 尚未在业务源码中使用；Jotai 仅用于跨页草稿；
- P02 与视觉基础已完成代码、构建产物和 Token 层面核对，尚未在微信开发者工具或真机完成视觉人工验收；
- 小程序测试只覆盖纯逻辑（草稿、接口地址、P02 状态、离线解析一致性和图片策略），不含页面渲染与微信平台 API；Vitest 范围不包含小程序运行时。

## 4. 服务端

### 4.1 配置与页面

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/package.json` | Next.js、AI SDK、Zod、Prisma 和工作区包依赖及运行脚本 | 含 `db:generate`、`db:validate`、`db:push`、`db:check`、`db:seed` |
| `apps/server/next.config.ts` | 让 Next.js 转译 shared 与 nutrition 工作区包 |
| `apps/server/tsconfig.json` | Next.js 严格 TypeScript 配置 |
| `apps/server/next-env.d.ts` | Next.js 生成的类型入口 |
| `apps/server/app/layout.tsx` | 设置 zh-CN 文档根布局 |
| `apps/server/app/page.tsx` | 简单服务启动说明页 |
| `apps/server/app/api/health/route.ts` | 已实现 GET 健康检查，返回服务名与 ok 状态 |

演示资料接口位于 `apps/server/app/api/profile/route.ts`（见 4.4 节），餐食记录接口位于 `apps/server/app/api/meal-records/route.ts` 与 `apps/server/app/api/meal-records/[id]/route.ts`（见 4.5 节）。

### 4.2 AI

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/lib/ai-provider.ts` | 读取 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`，创建 OpenAI 兼容模型实例；配置缺失时抛出错误 |
| `apps/server/lib/workspace-imports.test.ts` | 冒烟验证服务端测试可直接导入 exports 指向 TypeScript 源码的 shared 与 nutrition 工作区包；使用受控大写枚举构造样例 |

当前没有 Prompt、结构化生成调用、超时控制、重试策略或 `/api/parse-meal`。餐食解析的**模式开关与 offline 实现**已在 4.6 节落地，ai 实现留到步骤 20。

### 4.3 数据库

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/prisma/schema.prisma` | PostgreSQL 数据源；定义 DemoProfile、MealRecord、GoalDirection、AdviceId、InputType、MealRating 和关联索引 |
| `apps/server/lib/demo-profile.mjs` | 固定 `DEMO_PROFILE_ID = 'demo-profile'` 与默认虚构资料常量 |
| `apps/server/lib/demo-profile.d.mts` | 上述常量的类型声明，供 TypeScript 侧引用 |
| `apps/server/lib/demo-profile.test.ts` | 断言固定标识、默认资料取值与无敏感字段 |
| `apps/server/scripts/check-db.mjs` | 建立 PrismaClient，执行 `SELECT 1` 后断开连接 |
| `apps/server/scripts/seed-profile.mjs` | 按固定 ID upsert 默认演示资料，重复执行不产生第二条 |
| `apps/server/.env.example` | 数据库、AI 与 `MEAL_PARSER` 配置模板（`MEAL_PARSER` 默认 `offline`） |

DemoProfile 当前字段：

- id、name、goalDirection（GoalDirection 枚举）；
- dailyCalorieMin、dailyCalorieMax；
- createdAt、updatedAt；
- mealRecords 关系。

MealRecord 当前字段：

- id、profileId、必填唯一 clientRequestId；
- sourceType、可选 sourceText；
- items JSON（确认后的菜品数组）；
- calorieMin、calorieMax、mealBudget；
- rating、ratingLabel、reason；
- 结构化 adviceIds（AdviceId 数组）、advice JSON（完整 {id, text} 数组）、uncertainties JSON；
- isDemo（默认 false）；
- 可选 modelVersion；必填 ruleVersion；
- createdAt；
- profile 关系（级联删除）及 profileId/createdAt 索引。

记录表不保存任何图片、图片路径或 base64 内容。

默认演示资料为固定 ID `demo-profile`、名称“小苏”、目标方向减脂、每日 1400–1600 千卡；按 D3b 不包含 `mealType`，也不包含身高、体重、BMI 或疾病字段。

当前 Schema 已可校验，数据库结构已与之同步（`prisma db push`，P0 不创建 migrations），演示资料已初始化。仍没有迁移文件。

### 4.4 演示资料接口

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/lib/prisma.ts` | 导出全局唯一的 `PrismaClient` 实例；非生产环境下挂到 `globalThis` 避免热重载重复建连 |
| `apps/server/lib/profile-service.ts` | 按固定 `DEMO_PROFILE_ID` 读取或更新资料，用共享 `demoProfileSchema` 序列化输出；资料不存在时抛 `DemoProfileNotFoundError` |
| `apps/server/lib/profile-handlers.ts` | `createProfileHandlers(database)` 返回 GET 与 PATCH，负责 HTTP 状态码与统一错误映射 |
| `apps/server/app/api/profile/route.ts` | 薄封装：注入 `prisma` 后导出 GET 与 PATCH，并标记 `dynamic = 'force-dynamic'` |
| `apps/server/lib/profile-handlers.test.ts` | 用假数据库测试 handlers，不接触 Next.js 运行时或真实数据库 |

分层：Route Handler 只做依赖注入和导出；handlers 承担 HTTP 语义；service 承担数据访问。handlers 的入参类型是 `Pick<PrismaClient, 'demoProfile'>`，因此可以脱离 Next.js 与真实数据库单元测试。

接口行为：

- `GET /api/profile` 返回符合共享 `demoProfileSchema` 的资料对象；资料不存在返回 503 `DB_UNAVAILABLE`，**不回退到数据库第一条记录**；
- `PATCH /api/profile` 只接受共享 `updateDemoProfileRequestSchema` 允许的字段（目标方向与每日上下限），`strict()` 会拒绝未知字段；
- 每日范围非法（下限不小于上限、非正整数）返回 400 `PROFILE_INVALID_RANGE`；未知字段、非法枚举或无法解析的 JSON 返回 400 `VALIDATION_FAILED`；
- 所有被拒绝的请求都不会写库，原值保持不变；
- 数据库故障统一返回 503 `DB_UNAVAILABLE`，不向调用方暴露内部错误细节；
- 所有错误响应符合共享 `apiErrorResponseSchema`。

### 4.5 餐食记录接口

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/lib/shanghai-time.ts` | 用 `Intl.DateTimeFormat` 按 Asia/Shanghai 计算日期键、当天起止与最近 N 天窗口起点 |
| `apps/server/lib/meal-record-service.ts` | `createMealRecord` 与 `getRecentMealRecords`：服务端重新评估后落库、按日分组汇总 |
| `apps/server/lib/meal-record-handlers.ts` | `createMealRecordHandlers(database, nowProvider)` 返回 GET 与 POST，负责状态码与统一错误映射 |
| `apps/server/app/api/meal-records/route.ts` | 薄封装：注入 `prisma` 后导出 GET 与 POST，并标记 `dynamic = 'force-dynamic'` |
| `apps/server/lib/meal-record-handlers.test.ts` | 用假数据库与假时钟测试 handlers，覆盖重算、篡改、幂等、并发冲突与分组汇总 |
| `apps/server/lib/shanghai-time.test.ts` | 覆盖上海时间键、当天起止与跨月窗口计算 |

`POST /api/meal-records` 的处理顺序：

1. 用共享 `createMealRecordRequestSchema` 校验请求体，`strict()` 拒绝未知字段；快照字段缺失 `ruleVersion` 时直接 400；
2. 先按 `clientRequestId` 查已有记录，命中则直接返回且状态码为 200（幂等，不新建、不覆盖）；
3. 读取固定演示资料，并查询该资料在**当前上海日期**内的已有记录区间；
4. 调用 nutrition 的 `assessMeal` 重新计算热量区间、参考额度、评级、评级文案、原因、建议与不确定性——**完全忽略客户端提交的 `clientAssessmentSnapshot`**；
5. 以服务端结果落库，`adviceIds` 取结构化 ID、`advice` 存完整文案数组；新建时返回 201；
6. 并发写入撞上 `clientRequestId` 唯一约束（P2002）时重新查询并返回已存在的记录。

`GET /api/meal-records` 的处理方式：

- 取最近 30 个上海日期、最多 50 条，按创建时间倒序；
- 服务端按上海日期分组，并为每天累加记录的热量下限与上限作为汇总区间；
- 前端不再二次计算分组与汇总。

错误映射：未知菜品（仍含 `OTHER` 食材或做法）返回 422 `UNKNOWN_DISH`；请求体不合法返回 400 `VALIDATION_FAILED`；资料缺失或数据库故障返回 503 `DB_UNAVAILABLE`。

`nowProvider` 可注入，默认 `() => new Date()`，因此单元测试可以用固定时钟验证跨日期与时段行为。

`DELETE /api/meal-records/{id}` 的处理方式：

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/lib/meal-record-service.ts` | 另导出 `deleteMealRecord(database, id)` |
| `apps/server/lib/meal-record-delete-handler.ts` | `createMealRecordDeleteHandler(database)` 返回 DELETE，负责状态码与错误映射 |
| `apps/server/app/api/meal-records/[id]/route.ts` | 薄封装：注入 `prisma` 后导出 DELETE |

- 采用 `deleteMany({ where: { id, profileId: DEMO_PROFILE_ID } })` 并返回 `count === 1`：既避免记录不存在时抛异常，也让 `where` 天然带上资料归属条件；
- **只能删除属于固定演示资料的记录**。用其他资料的记录编号发起删除会因条件不匹配而删不到，接口返回 404 且原记录保留；
- 成功返回 204，未找到（含空编号）返回 404 `MEAL_NOT_FOUND`，异常返回 503 `DB_UNAVAILABLE`；
- 使用物理删除，不提供恢复、软删除或审计；界面上的确认弹层属于步骤 18；
- 查询接口按 `profileId` 过滤，因此其他资料的记录不会出现在历史列表中。

### 4.6 离线演示样例与餐食解析契约

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/lib/demo-meals.ts` | 两个离线演示样例（解析结果、确认结果、评估上下文、预期评估），以及 `buildDemoMealRecordRequest` |
| `apps/server/lib/meal-parser.ts` | `parseMeal(input, options)` 统一解析契约、offline 实现、模式解析与配置错误 |
| `apps/server/lib/demo-meals.test.ts` | 断言两个样例与共享契约、nutrition 规则、语义标签和原型冲突值的关系 |
| `apps/server/lib/meal-parser.test.ts` | 覆盖模式解析、offline 匹配、ai 委派与结果校验 |

两个样例的固定条件都是每日 1400–1600 千卡、当天无记录、时间为 `2026-09-15T12:00:00+08:00`（上海时间白天，剩余 2 餐，因此参考额度为 800）：

| 样例 ID | 组成 | 预期结果 |
| --- | --- | --- |
| `northeast-combo` | 干煸芸豆、溜肉段和米饭 | 550–950 千卡、YELLOW、原因为接近或略高于参考额度、建议为换蔬菜与减米饭、不确定性为用油量无法确认 |
| `light-chicken-set` | 白灼时蔬、水煮鸡胸和小份米饭 | 290–500 千卡、GREEN、原因为处于合理范围、建议为保持当前、不确定性为鸡胸份量无法确认 |

约定：

- 每个样例的 `expectedAssessment` 由 nutrition 规则真实复算验证，不是手写常量；测试会调用 `assessMeal` 并断言结果与预期完全一致；
- 样例只使用共享契约（`parsedMealSchema`、`confirmedMealSchema`、`mealAssessmentSchema`、`createMealRecordRequestSchema`）；
- 做法标签按语义映射：白灼为 `BLANCHED`、水煮为 `BOILED`、蒸为 `STEAMED`，并有测试锁定；
- 不使用高保真原型中的 1290 kcal 单点值或 650–850 kcal 黄灯结论；
- 样例时间位于白天，避开 00:00–04:59；
- `buildDemoMealRecordRequest` 固定写入 `isDemo: true` 与 `modelVersion: offline-demo-v1`。

`parseMeal` 的模式由服务端环境变量 `MEAL_PARSER` 决定，默认 `offline`：

- `offline`：按归一化文本（去除空白、顿号、逗号、加号与“和”）匹配两个样例；图片输入通过 `demoSampleId` 选择样例，缺省为 `northeast-combo`；匹配不到时抛 `OfflineMealSampleNotFoundError`；
- `ai`：必须注入 `aiParser`，否则抛出明确的配置错误；返回结果一律用 `parsedMealSchema` 复验；
- 非法取值抛 `MealParserConfigurationError`。

页面只需调用 `parseMeal`，无需感知数据来源，因此步骤 20 切换到 AI 时不用分叉页面逻辑，offline 仍可作为降级与演示入口。

## 5. 共享包

### 5.1 packages/shared

`packages/shared/src/index.ts` 只做 re-export，真实契约拆分为六个同目录模块。该包不依赖应用层，只依赖 Zod。

| 模块 | 当前职责 | 主要导出 |
| --- | --- | --- |
| `common.ts` | 跨契约复用的基础枚举与标量 | `goalDirectionSchema`（FAT_LOSS/MAINTAIN/MUSCLE_GAIN）、`mealRatingSchema`（GREEN/YELLOW/RED）、`inputTypeSchema`（IMAGE/TEXT）、`adviceIdSchema`（7 个白名单 ID）、`calorieRangeSchema`、`nonEmptyTextSchema`、`isoDateTimeSchema` |
| `meal.ts` | 菜品与餐食的输入契约 | `ingredientTagSchema`（10 个受控标签）、`cookingMethodSchema`（11 个受控做法）、`portionLevelSchema`、`mealItemSchema`、`parsedMealSchema`、`confirmedMealItemSchema`、`confirmedMealSchema` |
| `profile.ts` | 演示资料 | `demoProfileSchema`、`updateDemoProfileRequestSchema` |
| `assessment.ts` | 规则评估结果 | `mealAdviceSchema`、`mealAssessmentSchema` |
| `record.ts` | 记录保存与历史查询 | `createMealRecordRequestSchema`、`mealRecordSchema`、`dailyMealRecordsSchema`、`mealRecordsResponseSchema` |
| `api-error.ts` | 统一错误契约 | `apiErrorCodeSchema`（12 个错误码）、`apiErrorSchema`、`apiErrorResponseSchema` |

关键约束：

- `cookingMethods` 与 `ingredients` 是**受控枚举**，不再接受自由字符串；未命中时使用 `OTHER`，并要求同时在 `otherCookingMethods` / `otherIngredients` 中给出原文，二者必须配对出现；
- `mealItemSchema` 保留 AI 置信度 `confidence`（0 至 1），`confirmedMealItemSchema` 不含置信度，改为 `wasManuallyAdjusted`；
- `calorieRangeSchema` 要求 `min <= max`，资料契约要求 `dailyCalorieMin` **严格小于** `dailyCalorieMax`；
- `mealAssessmentSchema` 必填 `ruleVersion`、`modelVersion` 可选，建议限定 1 至 2 条且 `adviceId` 不重复；
- `createMealRecordRequestSchema` 必填 UUID `clientRequestId`（D4a）与可选 `isDemo`（D2a，默认 false），`sourceType` 与 `sourceText` 互斥；
- 按 D3b，P0 不定义 `mealType`；
- `apiErrorSchema` 是按 `code` 判别的 discriminated union，每个错误码的 `retryable` 被固定为布尔字面量，不是自由布尔值；
- 所有对象 Schema 均为 `strict()`，多余字段会被拒绝。

破坏性变更：原有 `MealItem` / `ParsedMeal` 的字段名与结构保留，但 `ingredients`、`cookingMethods` 的取值从自由字符串收紧为受控大写枚举，旧写法不再通过校验。

`packages/shared/src/index.test.ts` 现有 17 个测试，覆盖每个契约的有效样例与关键无效样例，并逐条验证计划点名的五个拒绝场景：空菜品、非法份量、非法置信度、反向热量区间、非法每日范围。小程序只引用导出的 TypeScript 类型，运行时 Zod 校验仅在服务端执行。

### 5.2 packages/nutrition

`packages/nutrition/src/index.ts` 只做 re-export，真实能力拆成五个模块：

- `calorie-estimator.ts`：`estimateMealCalories(items, options)` 根据确认后的菜品计算整餐热量区间；
- `calorie-rules.ts`：规则数据（食材基础区间、做法附加区间、份量系数、未知兜底区间）、中文别名映射 `INGREDIENT_ALIASES`、`resolveIngredientAlias` 和规则版本常量 `CALORIE_RANGE_RULE_VERSION`（当前值 `calorie-range-v1`）；
- `dynamic-rating.ts`：`rateMeal`、`getRemainingMealCount`、`calculateDynamicMealRating`、`mealHasHighOil`、`mealHasHighOilOrSugar`，以及规则版本常量 `DYNAMIC_RATING_RULE_VERSION`（当前值 `dynamic-rating-v1`）；
- `advice-rules.ts`：`ADVICE_TEXT`（7 条建议 ID 与展示文案）与 `selectMealAdvice(items, rating)`；
- `meal-assessment.ts`：`assessMeal(input)` 编排函数，规则版本常量 `NUTRITION_ASSESSMENT_RULE_VERSION`（当前值 `nutrition-assessment-v1`）。

`estimateMealCalories` 的计算顺序：

1. 对每个菜品，先累加去重后的食材基础区间，再累加去重后的做法附加区间；
2. 乘以份量系数（小份 0.75、正常份 1、大份 1.35）；
3. 累加所有菜品，最后把区间下限向下、上限向上取整到十位——取整只会放宽区间，不会收窄；
4. 返回区间、不确定性说明、是否使用兜底和规则版本。

未知处理按 D1c 分两阶段：

- 默认 `unknownHandling: 'PROMPT'`：只要菜品含 `OTHER` 食材或做法，就返回 `NEEDS_MORE_INFO` 并列出需补充的菜品，不给出区间；
- `unknownHandling: 'CONSERVATIVE_FALLBACK'`：使用未知食材 100–450、未知做法 +0–150 的兜底区间继续估算，并在结果中标记 `usedFallback` 和不确定性说明；
- 两个路径都**不读取** `otherIngredients` / `otherCookingMethods` 的自由文本来猜测类别，自由文本只用于回显待补充内容。

动态评级由 `calculateDynamicMealRating(input)` 完成：

1. 校验每日范围、当前餐区间和每条当天记录区间，非法则抛 `RangeError`；
2. 累加当天已摄入区间，剩余区间为 `min = max(0, 每日下限 − 已摄入上限)`、`max = max(0, 每日上限 − 已摄入下限)`，取保守放宽；
3. `getRemainingMealCount(now)` 用 `Intl.DateTimeFormat` 按 Asia/Shanghai 取时分，四段划分：00:00–04:59 剩 1 餐、05:00–10:29 剩 3 餐、10:30–15:59 剩 2 餐、16:00–23:59 剩 1 餐；
4. `mealBudget = floor(剩余上限 ÷ 剩余餐次)`，`budgetRatio = 当前餐上限 ÷ mealBudget`（`mealBudget` 为 0 时置 null）；
5. `rateMeal(calorieMax, mealBudget)` 按 0.8 / 1.2 阈值出 GREEN/YELLOW/RED；`mealBudget` 为零、负数或非有限时直接返回 RED，不做除法；
6. 若本餐含高油（干煸、油炸、煎）或高糖（糖醋）做法且原评级为 GREEN，则强制抬升为 YELLOW；RED 不降级。

该函数显式接收 `now`，领域逻辑内部不读系统时钟，相同输入与固定 `now` 结果可复现。

`assessMeal(input)` 编排热量估算、未知处理、动态评级与原因建议：

1. 先调用 `estimateMealCalories`（未知按 D1c），若返回 `NEEDS_MORE_INFO` 则原样透传；
2. 用估算区间调用 `calculateDynamicMealRating` 得到评级、参考额度和高油高糖标记；
3. 按评级生成 `ratingLabel`（绿=“这餐比较合适”、黄=“这餐可以适量吃”、红=“这餐建议调整”）和 `reason`（按额度用完 → 剩余不足成参考额度 → 普通红灯 → 高油高糖抬黄灯 → 普通黄灯 → 绿灯 的优先级）；
4. 调用 `selectMealAdvice` 生成 1 至 2 条白名单建议，无建议时回退到 `KEEP_CURRENT`；
5. 组装成符合 shared `mealAssessmentSchema` 的 `MealAssessment`，带 `ruleVersion`，仅在调用方传入时写 `modelVersion`。

建议优先级固定为：去皮 > 换蔬菜 > 减米饭 > 分酱汁 > 少吃高油菜 > 沥油；多条命中时去重取前两条。所有用户可见文案通过禁止词扫描（绝食 / 催吐 / 药物 / 跳过下一餐 / 补偿性运动 / 保证减重 / 你不自律 / 你没有意志）。

`packages/nutrition/src/` 现有四个测试文件：`index.test.ts`（18 个，热量区间与未知处理）、`dynamic-rating.test.ts`（31 个，时段边界、评级边界、除零防护、高油高糖最低黄灯、时间中性、确定性）、`meal-assessment.test.ts`（17 个，建议规则、原因优先级、schema 校验、禁止词扫描、确定性）。

## 6. 设计原型资产

| 路径 | 当前职责 |
| --- | --- |
| `.workbuddy_html/P01.html` | 今日首页高保真浏览器原型，含有记录和空状态 |
| `.workbuddy_html/P02.html` | 餐食输入原型，含默认、禁用、分析中、权限、超时和无餐食状态 |
| `.workbuddy_html/P03.html` | 识别确认原型，含可信度、做法、份量和补充输入 |
| `.workbuddy_html/P04.html` | 评估结果原型，含黄灯、建议后重算、保存成功和失败状态 |
| `.workbuddy_html/P05.html` | 历史与设置原型，含删除、展开设置和空状态 |
| `.workbuddy_html/memory/2026-09-10.md` | 五页设计迭代、Token、统一演示数据和状态说明 |

这些文件不由 Taro 构建，不等于已实现产品，但 P01 至 P05 的最终版本是对应页面的视觉验收基准。`.workbuddy_html/memory/2026-09-10.md` 用于解释设计演进，不覆盖最终 HTML。

原型使用规则：

- 产品范围、安全和业务计算以 `workflow/memory-bank/design-document.md` 为最高依据；
- 最终 HTML 控制视觉层级、布局顺序、Token、组件形态和状态表达；
- HTML 的手机外壳、固定系统状态栏、微信胶囊、页面外状态标签只用于作品集展示，不进入 Taro 页面；
- P01/P05 的单点 1290 kcal 和 310 kcal 必须改为业务区间；
- P04 的 650 至 850 kcal 黄灯示例不能覆盖正式评级规则；
- P04 的“采用建议后重算”、P05 的“删除后撤销”和图片压缩开关不属于 P0；
- Taro 页面逐页实现后必须与对应 HTML 做视觉对照，同时以真实接口数据替换硬编码演示数字。

## 7. 工作流文档

| 路径 | 职责 |
| --- | --- |
| `workflow/PRD.md` | 轻量产品定义和用户已确认决策 |
| `workflow/AGENTS.md` | 后续代理的文档优先和逐步验收规则 |
| `workflow/memory-bank/design-document.md` | 已批准的产品、行为设计和五页 UI 与交互规范 |
| `workflow/memory-bank/tech-stack.md` | 真实依赖、推荐增量和部署约束 |
| `workflow/memory-bank/implementation-plan.md` | 尚未完成工作的顺序和验证门槛 |
| `workflow/memory-bank/progress.md` | 当前基线与后续执行日志 |
| `workflow/memory-bank/architecture.md` | 当前模块和重要文件职责 |
| `workflow/memory-bank/decisions.md` | 未决产品选项、用户确认结果和后续决策历史 |

## 8. 当前数据流

当前可运行的数据流有五条：

1. 小程序可打开五个页面；P02 可收集单张本地图片或文字，调用小程序 `parseMeal` 离线门面，成功后写入跨页草稿并前往 P03；其余页面仍只有导航骨架，不发起业务请求。
2. 客户端或浏览器请求 `GET /api/health`，Next.js 返回固定 JSON。
3. 客户端请求 `GET /api/profile`，服务端按固定 `DEMO_PROFILE_ID` 读取数据库并返回演示资料。
4. 客户端请求 `PATCH /api/profile`，服务端用共享契约校验后更新资料并返回最新结果。
5. 客户端 `POST /api/meal-records` 提交确认后的菜品，服务端重新评估后落库；`GET /api/meal-records` 返回最近 30 天按上海日期分组的记录与汇总；`DELETE /api/meal-records/{id}` 物理删除属于演示资料的记录。

AI 工厂可以独立创建模型对象，但 ai 模式的解析器尚未实现，`MEAL_PARSER=ai` 会得到明确的配置错误。`parseMeal` 已可在服务端代码内调用并返回两个离线样例之一，但尚未被任何 Route Handler 暴露成 HTTP 接口；小程序另有同名门面供步骤 13 至 19 的纯离线页面调用，并以测试逐项比对服务端样例。根 Vitest 入口当前可运行 158 个测试（shared 17、nutrition 66、server 58、miniprogram 17），范围同时覆盖服务端与小程序纯逻辑，并能解析工作区 TypeScript 源码包。nutrition 已通过记录接口被真实调用；小程序 P02 已完成本地输入与离线解析行为，但尚未调用任何接口。

## 9. 目标数据流边界

目标链路由以下边界组成：

1. Taro 页面收集单张图片或文字；
2. Next.js 解析并校验输入；
3. AI 工厂调用唯一模型；
4. shared 校验结构化输出；
5. 用户在小程序确认；
6. nutrition 根据确认结果、资料和当天记录执行纯规则；
7. Prisma 保存用户确认后的 MealRecord；
8. 小程序刷新首页和历史。

目标链路已实现第 6 与第 7 步的服务端部分：nutrition 规则会读取资料与当天记录执行计算，服务端随后保存 MealRecord。第 8 步的读取侧（查询记录与汇总）也已就绪。第 1 至 5 步中，第 1 步的 P02 页面已能收集单张本地图片或文字并进入离线解析，第 2 步的输入校验已实现、第 3 步的模型调用已就绪但 ai 解析器未实现、第 4 步的结构化输出校验已就绪；第 5 步的用户确认界面与第 8 步的小程序刷新仍未实现。

每完成一个计划步骤，必须更新本文件，把对应职责从“目标”改为“当前”。

## 10. 已知技术债与风险

- 自动化测试目前是 158 个契约、规则、接口与小程序纯逻辑测试（用假数据库与假时钟），尚无针对真实数据库或微信运行时的集成测试；
- 热量区间规则只覆盖 9 个已知食材标签、10 个已知做法和两个演示样例，扩展评测集前需同步递增规则版本并补测试；
- offline 解析器只能识别两个演示样例的原文，任何其他输入都会抛出“未匹配到样例”，这是步骤 20 之前的有意限制；
- 规则层已能返回“需要补充信息”，但界面上的“跳过补充”入口在步骤 15 才实现；
- 记录接口已实现创建、查询与物理删除；客户端提交的 `clientAssessmentSnapshot` 当前被完全忽略，未用于结果一致性提示；
- 30 天窗口与 50 条上限只由单测覆盖，尚未在真实数据量下验证；
- 接口层已有统一的错误响应与错误码映射，但解析与图片相关错误码尚未被任何接口使用；
- 小程序已有本地单图选择、最长边 1280px/质量 75 压缩、压缩后 1MB 限制与 4 秒/12 秒页面计时；尚无图片上传、服务端 2MB 请求体限制和服务端取消传播；
- 没有 AI 输出校验后的错误分型；
- 没有评测集；
- 小程序的视觉基础与 P02 只完成构建产物和 Token 层面核对，**尚未在微信开发者工具或真机上核对**；P01、P03、P04、P05 仍只有骨架；
- 小程序测试只覆盖纯逻辑，不含页面渲染、真实相机/相册权限或平台图片压缩；Vitest 范围不包含小程序运行时；
- `__API_BASE_URL__` 已定义但尚无消费方；生产构建的接口地址为空值，HTTPS 与域名配置属于 P1；
- `project.config.json` 使用**小程序测试号**提供的 AppID（`wx9c7d506cdb608201`）：相比原先的游客 AppID，它已支持真机预览与真机调试；但测试号没有上传能力，因此**体验版与上线仍需正式 AppID**。D5 的原前提（体验版需先换正式 AppID）经核实依然成立，仅方案 b 的括号措辞需修正。`project.private.config.json` 由开发者工具生成并已被 `.gitignore` 排除；
- 高保真 HTML 原型与 Taro 代码仅对齐了视觉基础和 P02；P01、P03、P04、P05 页面内容尚未实现；
- `.workbuddy_html/` 未被 `.gitignore` 排除，且当前已纳入版本控制；后续原型变更会进入 Git 差异；
- 当前 Git `main` 已包含步骤 1 至步骤 10 的提交（`01afa66`、`dcd640f`、`4f087d5`、`1d56406`、`2174d63`、`d043690`、`c7205ac`、`cde21b7`、`b7b6487`、`58d19a0`）、步骤 11 提交 `480d795`、两次文档提交 `db2c6ba` 与 `7c28422`、步骤 12 提交 `4e4e458`；步骤 13 的 P02 离线行为与本文档更新在同一提交中。
