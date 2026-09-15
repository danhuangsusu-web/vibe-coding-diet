# 食刻 AI 当前架构

> 基线日期：2026-09-15（已同步步骤 1、步骤 2、步骤 3、步骤 4、步骤 5、步骤 6）
> 记录原则：本文件描述当前仓库事实。尚未实现的目标只在“计划边界”中标注，不与现状混写。

## 1. 总览

仓库是一个 pnpm monorepo，当前由四个实际工作区组成：

- `apps/miniprogram`：Taro React 微信小程序；
- `apps/server`：Next.js 服务端和 API；
- `packages/shared`：跨端 Zod Schema 与共享类型；
- `packages/nutrition`：确定性营养评级与热量区间规则。

当前代码已完成工程骨架、静态首页、健康接口、模型供应商工厂、最小评级函数、shared、nutrition、server 的 Vitest 自动化测试基线、完整的共享业务契约（资料、餐食、评估、记录、统一 API 错误）、按受控词表计算热量区间的最小规则（含 D1c 的两阶段未知处理）、动态餐次额度与红黄绿灯评级（含高油高糖最低黄灯）、由规则生成的原因与建议白名单，以及与共享契约对齐的数据库结构和已初始化的固定演示资料。小程序到服务端、AI 和业务 API 的完整链路尚不存在。

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
| `apps/server/package.json` | Next.js、AI SDK、Zod、Prisma 和工作区包依赖及运行脚本 | 含 `db:generate`、`db:validate`、`db:push`、`db:check`、`db:seed` |
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
| `apps/server/prisma/schema.prisma` | PostgreSQL 数据源；定义 DemoProfile、MealRecord、GoalDirection、AdviceId、InputType、MealRating 和关联索引 |
| `apps/server/lib/demo-profile.mjs` | 固定 `DEMO_PROFILE_ID = 'demo-profile'` 与默认虚构资料常量 |
| `apps/server/lib/demo-profile.d.mts` | 上述常量的类型声明，供 TypeScript 侧引用 |
| `apps/server/lib/demo-profile.test.ts` | 断言固定标识、默认资料取值与无敏感字段 |
| `apps/server/scripts/check-db.mjs` | 建立 PrismaClient，执行 `SELECT 1` 后断开连接 |
| `apps/server/scripts/seed-profile.mjs` | 按固定 ID upsert 默认演示资料，重复执行不产生第二条 |
| `apps/server/.env.example` | 数据库与 AI 配置模板 |

DemoProfile 当前字段：

- id、name、goalDirection（GoalDirection 枚举）；
- dailyCalorieMin、dailyCalorieMax；
- createdAt、updatedAt；
- mealRecords 关系。

MealRecord 当前字段：

- id、profileId、必填唯一 clientRequestId；
- sourceType、可选 sourceText；
- items JSON；
- calorieMin、calorieMax、rating；
- reason、结构化 adviceIds（AdviceId 数组）、advice 展示文案；
- isDemo（默认 false）；
- 可选 modelVersion；必填 ruleVersion；
- createdAt；
- profile 关系（级联删除）及 profileId/createdAt 索引。

默认演示资料为固定 ID `demo-profile`、名称“小苏”、目标方向减脂、每日 1400–1600 千卡；按 D3b 不包含 `mealType`，也不包含身高、体重、BMI 或疾病字段。

当前没有 Prisma 访问封装、资料 API、记录 CRUD 或迁移文件。Schema 已可校验，数据库结构已与之同步（`prisma db push`，P0 不创建 migrations），演示资料已初始化。下一步需要按 `DEMO_PROFILE_ID` 提供读取与更新接口。

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

当前可运行的数据流只有两条：

1. 小程序直接渲染静态首页，不发起业务请求。
2. 客户端或浏览器请求 `GET /api/health`，Next.js 返回固定 JSON。

AI 工厂可以独立创建模型对象，Prisma Schema 和数据库连接可以独立验证，但它们尚未被业务 Route Handler 串联。根 Vitest 入口当前可运行 shared、nutrition 和 server 的 86 个测试（shared 17、nutrition 66、server 3），并能解析工作区 TypeScript 源码包。nutrition 已能在纯函数层面把确认后的菜品换算为热量区间，输出带原因和建议的动态红黄绿灯评估，但这些能力尚未被任何 Route Handler 调用；数据库结构与演示资料已就绪，但尚无读取或写入它们的接口。

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

- 自动化测试目前是 84 个契约与规则测试，尚未覆盖数据库或业务 API；
- 热量区间规则只覆盖 9 个已知食材标签、10 个已知做法和两个演示样例，扩展评测集前需同步递增规则版本并补测试；
- 规则层已能返回“需要补充信息”，但界面上的“跳过补充”入口在步骤 15 才实现；
- Prisma Schema 已包含目标方向、建议 ID、`isDemo` 与唯一 `clientRequestId`，但尚无可用的 Prisma 访问封装，也没有按 `DEMO_PROFILE_ID` 读取或更新资料的接口；
- 没有数据库 CRUD 或统一错误响应；
- 没有图片上传、压缩、请求体大小和超时处理；
- 没有 AI 输出校验后的错误分型；
- 没有评测集；
- 高保真 HTML 原型与 Taro 代码尚未对齐；
- `.workbuddy_html/` 未被 `.gitignore` 排除，且当前已纳入版本控制；后续原型变更会进入 Git 差异；
- 当前 Git `main` 已包含步骤 1 提交 `01afa66`、步骤 2 提交 `dcd640f`、步骤 3 提交 `4f087d5`、步骤 4 提交 `1d56406` 与步骤 5 提交 `2174d63`；步骤 6 的数据模型变更与本文档更新在同一提交中。
