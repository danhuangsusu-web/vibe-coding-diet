# 食刻 AI 当前架构

> 基线日期：2026-09-15（已同步步骤 1、步骤 2）
> 记录原则：本文件描述当前仓库事实。尚未实现的目标只在“计划边界”中标注，不与现状混写。

## 1. 总览

仓库是一个 pnpm monorepo，当前由四个实际工作区组成：

- `apps/miniprogram`：Taro React 微信小程序；
- `apps/server`：Next.js 服务端和 API；
- `packages/shared`：跨端 Zod Schema 与共享类型；
- `packages/nutrition`：确定性营养评级规则。

当前代码已完成工程骨架、静态首页、健康接口、模型供应商工厂、最小评级函数、Prisma 数据模型、shared、nutrition、server 的 Vitest 自动化测试基线，以及完整的共享业务契约（资料、餐食、评估、记录、统一 API 错误）。小程序到服务端、AI、规则和数据库的完整链路尚不存在。

## 2. 根目录职责

| 路径 | 当前职责 | 备注 |
| --- | --- | --- |
| `package.json` | 定义 monorepo 名称、Node/pnpm 约束和两端开发、构建、测试、类型、数据库脚本，并声明根 Vitest 开发依赖 | `test` 运行一次全仓测试，`test:watch` 进入监听模式 |
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
| `apps/miniprogram/project.config.json` | 微信开发者工具项目，使用 touristappid，输出根目录为 `dist/` |
| `apps/miniprogram/tsconfig.json` | 严格 TypeScript、Bundler 模块解析、`@/*` 路径别名 |
| `apps/miniprogram/babel.config.js` | Taro React TypeScript Babel preset |
| `apps/miniprogram/types/global.d.ts` | 小程序项目的全局类型声明入口 |

### 3.2 运行代码

| 路径 | 当前职责 |
| --- | --- |
| `apps/miniprogram/src/app.tsx` | 根组件，只原样渲染 children |
| `apps/miniprogram/src/app.config.ts` | 当前仅注册 `pages/home/index`，配置导航栏标题和颜色 |
| `apps/miniprogram/src/app.scss` | 定义页面背景、文字色和系统字体 |
| `apps/miniprogram/src/pages/home/index.tsx` | 静态首页，展示标题、说明、上传图片和文字输入按钮 |
| `apps/miniprogram/src/pages/home/index.scss` | 静态首页布局和按钮样式 |
| `apps/miniprogram/src/pages/home/index.config.ts` | 首页导航标题 |

当前限制：

- 只有一个页面；
- 两个按钮没有事件；
- 没有请求层、路由流转、表单状态、全局状态或持久化；
- TDesign 和 Jotai 已安装但尚未在业务源码中使用；
- 导航栏背景色仍为 `#ffffff`，与设计 Token 的奶油背景 `#FAF6EF` 不一致，需在实施计划步骤 11 建立视觉基础时修正；
- 小程序暂无自动化测试；步骤 1 的 Vitest 范围不包含小程序运行时与页面交互。

## 4. 服务端

### 4.1 配置与页面

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/package.json` | Next.js、AI SDK、Zod、Prisma 和工作区包依赖及运行脚本 |
| `apps/server/next.config.ts` | 让 Next.js 转译 shared 与 nutrition 工作区包 |
| `apps/server/tsconfig.json` | Next.js 严格 TypeScript 配置 |
| `apps/server/next-env.d.ts` | Next.js 生成的类型入口 |
| `apps/server/app/layout.tsx` | 设置 zh-CN 文档根布局 |
| `apps/server/app/page.tsx` | 简单服务启动说明页 |
| `apps/server/app/api/health/route.ts` | 已实现 GET 健康检查，返回服务名与 ok 状态 |

### 4.2 AI

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/lib/ai-provider.ts` | 读取 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`，创建 OpenAI 兼容模型实例；配置缺失时抛出错误 |
| `apps/server/lib/workspace-imports.test.ts` | 冒烟验证服务端测试可直接导入 exports 指向 TypeScript 源码的 shared 与 nutrition 工作区包；使用受控大写枚举构造样例 |

当前没有 Prompt、结构化生成调用、超时控制、重试策略或 `/api/parse-meal`。

### 4.3 数据库

| 路径 | 当前职责 |
| --- | --- |
| `apps/server/prisma/schema.prisma` | PostgreSQL 数据源；定义 DemoProfile、MealRecord、InputType、MealRating 和关联索引 |
| `apps/server/scripts/check-db.mjs` | 建立 PrismaClient，执行 `SELECT 1` 后断开连接 |
| `apps/server/.env.example` | 数据库与 AI 配置模板 |

DemoProfile 当前字段：

- id、name；
- dailyCalorieMin、dailyCalorieMax；
- createdAt、updatedAt；
- mealRecords 关系。

MealRecord 当前字段：

- id、profileId、sourceType、可选 sourceText；
- items JSON；
- calorieMin、calorieMax、rating；
- reason、advice；
- 可选 modelVersion；必填 ruleVersion；
- createdAt；
- profile 关系及 profileId/createdAt 索引。

当前没有 Prisma 访问封装、默认资料初始化、资料 API、记录 CRUD 或迁移文件。Schema 已可校验，当前 PostgreSQL 可连接。Schema 尚未包含步骤 2 契约中的 `isDemo` 与唯一 `clientRequestId`，两者将在步骤 6 对齐数据模型时补上。

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

`packages/nutrition/src/index.ts` 当前定义：

- `MealRating` 联合类型；
- `rateMeal(calorieMax, mealBudget)`。

现有函数按比例输出：

- 不超过 0.8：GREEN；
- 不超过 1.2：YELLOW；
- 超过 1.2：RED。

当前没有除零或非法预算保护、热量区间、食材规则、做法附加值、动态剩余额度、高油高糖最低评级、原因或建议逻辑；除步骤 1 冒烟测试外，尚无规则边界测试。

`packages/nutrition/src/index.test.ts` 已为现有 `rateMeal` 添加最小冒烟测试；完整边界与领域规则测试仍随后续步骤补充。

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

当前可运行的数据流只有两条：

1. 小程序直接渲染静态首页，不发起业务请求。
2. 客户端或浏览器请求 `GET /api/health`，Next.js 返回固定 JSON。

AI 工厂可以独立创建模型对象，Prisma Schema 和数据库连接可以独立验证，但它们尚未被业务 Route Handler 串联。根 Vitest 入口当前可运行 shared、nutrition 和 server 的 19 个测试（shared 17、nutrition 1、server 1），并能解析工作区 TypeScript 源码包。

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

目标链路是设计和计划，尚未实现。每完成一个计划步骤，必须更新本文件，将对应职责从“目标”改为“当前”。

## 10. 已知技术债与风险

- 自动化测试目前是 19 个契约与冒烟测试，尚未覆盖领域边界、数据库或业务 API；
- `rateMeal` 未处理 mealBudget 为 0 或负数；
- Prisma Schema 与已批准产品之间缺少目标方向、建议 ID 字段，也尚未同步共享契约中的 `isDemo` 与唯一 `clientRequestId`（计划在步骤 6 对齐）；
- 没有默认 DemoProfile 初始化方式；
- 没有数据库 CRUD 或统一错误响应；
- 没有图片上传、压缩、请求体大小和超时处理；
- 没有 AI 输出校验后的错误分型；
- 没有规则数据来源、规则版本和评测集；
- 高保真 HTML 原型与 Taro 代码尚未对齐；
- `.workbuddy_html/` 未被 `.gitignore` 排除，且当前已纳入版本控制；后续原型变更会进入 Git 差异；
- 当前 Git `main` 已包含步骤 1 提交 `01afa66`；步骤 2 的契约变更与本文档更新在同一提交中。
