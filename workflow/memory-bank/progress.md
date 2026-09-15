# 食刻 AI 进度记录

> 当前阶段：步骤 1–7 已完成并经用户确认；步骤 8 未开始
> 下一步：开始步骤 8（实现餐食记录创建和查询接口）；D5 仍待确认，但不阻塞
> 最后更新：2026-09-15

## 2026-09-14 工作流整理基线

### 已完成

- 阅读现有 README、根配置、四个工作区 package、TypeScript 配置、Taro 配置、Next.js 配置、Prisma Schema、业务源码和数据库检查脚本；
- 阅读当前范围基准 `食刻AI_PRD_通俗版.md` V0.3、旧版 `PRD.docx` 和 `a small prd.txt`；
- 阅读 `.workbuddy_html/P01.html` 至 `P05.html` 的高保真页面原型及 2026-09-10 设计记录；
- 确认仓库不是全新项目，而是已具备 monorepo、前后端骨架、共享类型、最小规则和数据库模型的早期实现；
- 与用户逐项确认产品范围、动态评级、演示资料、实施粒度和部署标准；
- 用户于 2026-09-14 批准总体设计；
- 生成轻量 PRD、设计文档、真实技术栈、实施计划、当前架构地图和代理规则。

### 已实现的代码基线

- pnpm monorepo 已配置，包含 `apps/miniprogram`、`apps/server`、`packages/shared` 和 `packages/nutrition`；
- Taro 小程序已有一个静态首页，展示图片和文字入口；
- Next.js 服务端已有展示页和 `GET /api/health`；
- 服务端已有 OpenAI 兼容模型供应商工厂；
- shared 包已有 MealItem 和 ParsedMeal 的 Zod Schema；
- nutrition 包已有按本餐热量上限与餐次额度比值返回红黄绿灯的最小函数；
- Prisma 已定义 DemoProfile、MealRecord、输入类型和评级枚举；
- `.workbuddy_html` 已有五个核心页面的浏览器高保真原型；`.workbuddy` 仅有历史工作记录，不含这五个 HTML。

### 尚未实现

- 小程序五页 Taro 版本和页面导航；
- 图片或文字的真实提交与 AI 解析；
- 用户确认识别结果；
- 食材、份量和做法驱动的热量区间；
- 动态餐次额度的完整计算；
- 高油高糖最低评级、原因和建议白名单；
- 演示资料读取、更新与默认初始化；
- 餐食记录创建、查询和删除；
- 首页汇总、历史和设置；
- 真实前后端串联与错误降级；
- 两个离线演示样例；
- 项目级自动化测试；
- 30 至 50 个 AI 评测样本；
- 用户测试、演示视频、评测报告和复盘。

### 基线验证

2026-09-14 实际执行：

- `pnpm typecheck`：通过；shared、nutrition、miniprogram 和 server 均完成严格 TypeScript 检查；
- `pnpm db:validate`：通过；Prisma Schema 有效；
- `pnpm db:check`：通过；PostgreSQL 连接和 `SELECT 1` 正常；
- 项目级测试：不存在测试文件或 test 脚本，因此没有可运行的项目自动化测试；
- Git 状态：当前目录不是 Git 工作树，无法创建工作流检查点提交。

### 当前停点

- 本次只整理工作流文档，没有修改任何业务代码；
- implementation-plan.md 的步骤 0 至 24 全部未开始；
- 在用户复核并明确批准本目录文档前，不执行任何步骤，也不修改业务代码或初始化 Git。

## 2026-09-15 UI 规范补充

### 已完成

- 重新完整核对 `.workbuddy_html/P01.html` 至 `P05.html` 的最终版 CSS、页面结构和全部展示状态；
- 在 `design-document.md` 增加完整的 UI 与交互规范，包括设计来源、优先级、视觉方向、颜色 Token、排版、间距、安全区、图标、图片、组件、反馈和动效；
- 为 P01 至 P05 分别记录内容顺序、关键组件、状态表现和 P0 边界；
- 明确最终 HTML 是视觉验收基准，但不等于 Taro 业务实现；
- 识别并记录原型与已批准业务规则之间的单点热量、黄灯示例、建议重算、删除撤销和图片压缩开关差异；
- 在 `implementation-plan.md` 增加独立的视觉基础步骤，并给页面步骤补充逐页原型对照要求；
- 同步更新 `architecture.md` 和 `AGENTS.md` 对原型资产的职责说明。

### 当前停点

- 本次仍只修改 workflow 文档，没有修改 `.workbuddy_html` 原型或任何业务代码；
- 所有 P0 实施步骤仍为未开始；
- 等待用户复核新增 UI 规范，不进入任何实施步骤。

## 2026-09-15 文档复核修订

### 已完成

- 依据 `docs-fix-prompt.md` 对 PRD、代理规则、设计、架构、技术栈、实施计划和进度记录完成一轮事实与一致性修补；
- 核实附件 A1 的文字前提不准确：仓库同时存在 `.workbuddy` 和 `.workbuddy_html`，但五个 HTML 与 2026-09-10 设计记录实际位于 `.workbuddy_html/`；已按真实路径修正全部页面引用，并保留该冲突记录；
- 修正 MealRecord 字段事实：`modelVersion` 可选，`ruleVersion` 必填；
- 补齐 Prisma 的 `db:generate`、`db:push` 顺序、P0 `db push` 策略、固定 `DEMO_PROFILE_ID` 与计划中的 seed 入口；
- 统一 P03 删空行为、自动/手动重试、请求取消、4 秒/12 秒阈值复核、服务端保存重算、显式 `now` 和 Asia/Shanghai 时间权威；
- 补齐零额度、首页零剩余、凌晨、受控词表、建议 ID、图片限制、HEIC、请求体上限、baseURL、进度环、手动调整、菜名校验、历史查询范围、错误码、健康检查与前端状态机；
- 实施计划增加未执行的步骤 0、离线/AI 解析适配器、评测有限迭代规则和预算分配表；
- 新增 `decisions.md`，集中维护 D1–D5 未决选项及后续用户决策历史；
- 清理 `AGENTS.md` 的重复“重要提示”和带多余 `@` 的路径写法。

### 当前停点

- 本轮仅修改 `workflow/` 下文档；没有修改 `apps/`、`packages/`、`scripts/`、`.workbuddy_html/`、环境文件或其他业务配置；
- 没有运行数据库结构变更、模型调用、Git 初始化或实施计划步骤；
- 步骤 0 至 24 均为未开始；等待用户确认本轮文档与下列 D1–D5。

## 2026-09-15 步骤 1 建立自动化测试基线（已验收）

### 已完成

- 在根 `package.json` 增加 `test` 与 `test:watch` 脚本和 Vitest 开发依赖，并新增根级 `vitest.config.ts`；
- 为 shared、nutrition、server 各补一个最小冒烟测试，其中服务端测试验证测试入口能直接解析并转译 exports 指向 TypeScript 源码的工作区包；
- 删除遗留的空文件 `prompt.txt`。

### 验证结果

- `pnpm test`：3 个测试文件全部通过，退出码 0；用不存在的过滤器运行时按 `passWithNoTests: false` 以退出码 1 失败，确认零测试不会被当成通过；
- `pnpm typecheck`：shared、nutrition、miniprogram、server 四个工作区全部通过；
- 改动仅限测试配置、测试文件和依赖清单，未改动业务代码，未引入 Jest、Playwright、Cypress 或小程序端到端框架。

### 当前停点

- 已提交为 `01afa66`，尚未推送至远端；
- 该步骤当时只更新了本文件头部状态，未留下独立小节，故在步骤 2 验收后补记。

## 2026-09-15 步骤 2 补齐共享业务契约（已验收）

### 已完成

- 将 `packages/shared/src/index.ts` 改为 re-export，契约拆分为六个模块：
  - `common.ts`：目标方向、评级、输入类型、建议 ID、热量区间、非空文本、ISO 时间；
  - `meal.ts`：受控食材标签与做法枚举、份量三档、菜品项、解析结果、确认后的餐食；
  - `profile.ts`：演示资料与资料更新请求；
  - `assessment.ts`：单条建议与完整评估结果；
  - `record.ts`：保存请求、餐食记录、按日分组与历史响应；
  - `api-error.ts`：12 个错误码及其固定可重试标志、统一错误响应外壳；
- 受控词表与设计文档第 7.3 节逐字一致：食材 10 个标签、做法 11 个枚举，均保留 `OTHER` 与自由文本补充字段，并要求二者配对出现；
- 建议 ID 与设计文档第 9 节白名单一致，评估结果限制建议为 1 至 2 条且 ID 不重复；
- 错误码与设计文档第 11 节表格逐行一致，`retryable` 按错误码固定为布尔字面量而非自由布尔值；
- 按 D2a 增加 `isDemo`，按 D4a 增加必填 UUID `clientRequestId`，按 D3b 不定义 `mealType`；
- 小程序只引用 TypeScript 类型，`apps/miniprogram/src` 未引入 `zod`，运行时校验保留在服务端。

### 验证结果

- `pnpm test`：19 个测试全部通过（shared 17、nutrition 1、server 1），退出码 0；
- `pnpm typecheck`：shared、nutrition、miniprogram、server 四个工作区全部通过；
- 计划点名的五个场景均有对应测试并被拒绝：空菜品、非法份量、非法置信度（超出 0 至 1）、反向热量区间、非法每日范围（上下限相等或非正数）；
- 改动仅限 `packages/shared/src` 与测试文件，未实现接口和页面，未改动 Prisma Schema。

### 已知影响与后续衔接

- **破坏性变更**：`ingredients` 与 `cookingMethods` 由自由字符串改为受控大写枚举，旧写法不再合法；业务代码已无残留，步骤 20 的 AI Prompt 必须保证输出落在受控词表内，未命中时走 `OTHER` 加自由文本补充字段；
- **数据库尚未同步**：Prisma 的 `isDemo`、唯一 `clientRequestId` 与“不增加餐别”在步骤 6 对齐数据模型时落地，当前契约与数据库暂时脱节；
- 步骤 3 的热量区间规则已按 D1 方案 c 实现，D1 于 2026-09-15 确认。

### 当前停点

- 步骤 2 已由用户验收确认，步骤 3 已在其后完成并验收；
- 改动已在对应提交中入库，工作区保持干净。

## 2026-09-15 步骤 3 建立最小热量区间规则（已验收）

### 已完成

- 在 `packages/nutrition/src/` 新增两个模块：
  - `calorie-rules.ts`：食材基础区间、做法附加区间、份量系数、未知兜底区间、中文别名映射和规则版本常量；
  - `calorie-estimator.ts`：`estimateMealCalories`，按确认后的菜品计算整餐热量区间；
- `index.ts` 转出估算函数、规则版本与别名解析，并保留原有 `rateMeal`；
- 规则数据只读取设计文档第 7.3 节的受控词表与别名映射，未建设完整营养数据库，未输出精确宏量营养素；
- 按 D1c 实现两阶段未知处理：默认返回待补充状态并列出需补充的菜品，只有调用方显式选择保守兜底时才继续估算；
- 兜底路径不读取 `otherIngredients` 或 `otherCookingMethods` 的自由文本来猜测食材或做法类别。

### 规则数据

- 食材基础区间：米饭 170–240、叶菜 30–70、豆角 50–90、猪肉 160–240、带皮鸡 190–290、去皮鸡 140–220、豆腐 90–170、蛋 70–100、酱汁 15–50；
- 做法附加区间：蒸/煮/白灼 +0–10、炒 +25–60、凉拌 +15–50、红烧 +35–90、煎 +40–90、糖醋 +40–100、干煸 +50–100、油炸 +70–120；
- 份量系数：小份 0.75、正常份 1、大份 1.35；
- 兜底区间：未知食材 100–450、未知做法 +0–150；
- 结果按区间下限向下、上限向上取整到十位，取整只会放宽区间而不会收窄；
- 规则版本为 `calorie-range-v1`。

### 验证结果

- `pnpm test`：36 个测试全部通过（nutrition 18、shared 17、server 1），退出码 0；
- `pnpm typecheck`：shared、nutrition、miniprogram、server 四个工作区全部通过；
- 相同确认菜品重复计算得到相同区间；
- 小份、正常份、大份按预期逐级放大区间；
- 干煸、油炸、糖醋分别通过参数化测试验证会扩大或提高区间；
- 未知菜品先返回待补充状态，用户明确跳过后才返回带兜底标记和不确定性说明的宽区间；
- 两个代表性演示样例的区间：干煸芸豆 + 溜肉段 + 米饭为 550–950 千卡；白灼时蔬 + 水煮鸡胸 + 小份米饭为 290–500 千卡。

### 已知影响与后续衔接

- 规则层已能返回“需要补充信息”，但界面上的“跳过补充”入口在步骤 15 实现，当前端到端流程还点不出来；
- 高油高糖最低黄灯属于步骤 4 的评级规则，本步骤只负责区间，不做评级；
- 动态餐次额度与红黄绿灯原使用步骤 1 时的最小 `rateMeal`，已在步骤 4 扩展为带守卫的动态评级。

### 当前停点

- 步骤 3 已由用户验收确认，步骤 4 已在其后完成并验收；
- 用户已确认演示样例区间与不确定性表达符合预期。

## 2026-09-15 步骤 4 实现动态餐次额度与评级规则（已验收）

### 已完成

- 在 `packages/nutrition/src/` 新增 `dynamic-rating.ts`，`index.ts` 改为 re-export 该模块；
- `getRemainingMealCount(now)`：按 Asia/Shanghai 时间把一天分为四段——00:00–04:59 剩 1 餐、05:00–10:29 剩 3 餐、10:30–15:59 剩 2 餐、16:00–23:59 剩 1 餐；
- `rateMeal(calorieMax, mealBudget)`：保留 0.8 / 1.2 阈值，并新增守卫——`mealBudget` 为零、负数或非有限值时直接返回 RED，不做除法；
- `calculateDynamicMealRating(input)`：累加当天已摄入区间，计算剩余区间与向下取整的参考额度，输出评级、参考比例、是否含高油高糖做法、是否触发最低黄灯和规则版本；
- 高油做法（干煸、油炸、煎）与高糖做法（糖醋）在原本为绿灯时强制抬升为黄灯，红灯不降级；
- 时间槽使用 `Intl.DateTimeFormat` 指定 `Asia/Shanghai`，函数显式接收 `now`，领域逻辑内部不读系统时钟。

### 验证结果

- `pnpm test`：67 个测试全部通过（nutrition 49、shared 17、server 1），退出码 0；
- `pnpm typecheck`：shared、nutrition、miniprogram、server 四个工作区全部通过；
- 0.8、刚高于 0.8、1.2、刚高于 1.2 四个评级边界有参数化测试；
- 四个时段共 8 个边界时间点（含 04:59:59、10:29:59 等）逐一断言；
- 无历史、有历史、已超过每日范围三种情况有独立测试；
- 零或负参考额度不产生除零、Infinity 或 NaN；剩余上限向下取整为 0 时判红灯且不做除法；
- 干煸、油炸、煎、糖醋四者分别验证绿灯抬升为黄灯，非高油高糖做法不误伤，红灯不降级；
- 同一餐在凌晨与傍晚评分一致（时间不直接惩罚进食）；固定输入与固定 `now` 结果可复现。

### 已知影响与后续衔接

- 评级结果中的“原因”和“建议”字段已在步骤 5 由规则生成；
- 该评级函数尚未被任何 Route Handler 调用，真实链路在步骤 15 串联；
- 规则版本为 `dynamic-rating-v1`。

### 当前停点

- 步骤 4 已由用户验收确认，步骤 5 已在其后完成并验收；
- 用户已确认时段划分与高油高糖最低黄灯行为符合预期。

## 2026-09-15 步骤 5 实现原因和建议白名单（已验收）

### 已完成

- 在 `packages/nutrition/src/` 新增两个模块，`index.ts` 补 re-export：
  - `advice-rules.ts`：7 条建议 ID 与展示文案的映射，以及 `selectMealAdvice(items, rating)`；
  - `meal-assessment.ts`：`assessMeal(input)`，编排热量估算、未知处理、动态评级和原因建议；
- `dynamic-rating.ts` 将内部高油/高糖判断拆成可导出的 `mealHasHighOil` 与 `mealHasHighOilOrSugar`；
- 建议只能来自设计文档第 9 节批准的白名单 ID，每条同时返回稳定 ID 和展示文案；
- 评级原因按优先级区分：额度用完、剩余不足以形成参考额度（向下取整为 0）、普通红灯、高油高糖抬黄灯、普通黄灯、绿灯；
- 所有用户可见文案（建议、评级标签、原因）通过禁止词扫描，不含“绝食 / 催吐 / 药物 / 跳过下一餐 / 补偿性运动 / 保证减重 / 你不自律 / 你没有意志”。

### 验证结果

- `pnpm test`：84 个测试全部通过（nutrition 66、shared 17、server 1），退出码 0；
- `pnpm typecheck`：shared、nutrition、miniprogram、server 四个工作区全部通过；
- 每个批准的建议 ID 都有对应文案，文案与 ID 映射可测试；
- 代表餐食（带皮鸡、酱汁、大份米饭、高油菜等）得到相关建议；
- 建议数量始终 1 至 2 条，多条命中时按优先级取前两条且去重；
- 没有适用调整时返回中性“保持当前选择”；
- 禁止词扫描覆盖多条场景与全部用户可见文案，断言不出现违禁表达；
- 编排函数 `assessMeal` 输出符合 shared 的 `mealAssessmentSchema`，且对固定输入结果确定。

### 已知影响与后续衔接

- 本步骤只在纯函数层面完成原因与建议，尚未被任何 Route Handler 调用，真实链路在步骤 15 串联；
- 规则版本为 `nutrition-assessment-v1`，`modelVersion` 仅在调用方显式传入时写入；
- 建议优先级当前为：去皮 > 换蔬菜 > 减米饭 > 分酱汁 > 少吃高油菜 > 沥油。

### 当前停点

- 步骤 5 已由用户验收确认，步骤 6 已在其后完成并验收；
- 用户已确认 7 条建议文案的安全性与可执行性。

## 2026-09-15 步骤 6 对齐数据库模型并初始化演示资料（已验收）

### 已完成

- 更新 `apps/server/prisma/schema.prisma`：
  - `DemoProfile` 增加 `goalDirection`（`GoalDirection` 枚举，非空）；
  - `MealRecord` 增加唯一 `clientRequestId`、结构化 `adviceIds`（`AdviceId` 数组）和 `isDemo`（默认 false）；
  - 新增 `GoalDirection` 与 `AdviceId` 两个枚举；按 D3b 不增加 `mealType`；
- 新增 `apps/server/lib/demo-profile.mjs` 与配套类型声明 `demo-profile.d.mts`，定义固定 `DEMO_PROFILE_ID = 'demo-profile'` 与默认虚构资料（名称“小苏”、目标方向减脂、每日 1400–1600 千卡）；
- 新增 `apps/server/scripts/seed-profile.mjs`，按固定 ID 执行 upsert，重复执行只更新同一条资料；
- 在 `apps/server/package.json` 增加 `db:seed`，并在根 `package.json` 增加同名转发脚本；
- 新增 `apps/server/lib/demo-profile.test.ts`，断言固定标识、默认资料取值和无敏感字段。

### 验证结果

2026-09-15 实际执行：

- `pnpm test`：86 个测试全部通过（nutrition 66、shared 17、server 1、demo-profile 2），退出码 0；
- `pnpm typecheck`：shared、nutrition、miniprogram、server 四个工作区全部通过；
- `pnpm db:validate`：Schema 有效；
- `pnpm db:generate`：Prisma 客户端生成成功；
- `pnpm db:push`：结构已同步，数据库实际包含 `goalDirection` 列；
- `pnpm db:check`：PostgreSQL 连接正常；
- `pnpm db:seed` 可从根目录执行，且重复执行后 `DemoProfile` 行数仍为 1，未创建第二条资料；
- 默认资料查询结果只有 id、名称、目标方向、每日上下限和时间戳，不含身高、体重、BMI 或疾病字段。

### 已知影响与后续衔接

- 本轮验收时数据库已处于对齐状态，`DemoProfile` 仅一行演示资料，`MealRecord` 为空；
- P0 使用 `prisma db push`，不创建 migrations；后续变更数据库结构前仍需确认当前库无须保留的数据；
- 步骤 6 的验证项提到“`GET /api/profile` 能按 `DEMO_PROFILE_ID` 读取同一资料”，该接口属于步骤 7 范围，届时验证；
- `adviceIds` 只存结构化 ID，展示文案另存于 `advice` 字段，与设计文档第 9 节一致。

### 当前停点

- 步骤 6 已由用户验收确认，步骤 7 已在其后完成并验收；
- 用户已确认数据库变更与默认演示资料（名称“小苏”、默认目标方向减脂）。

## 2026-09-15 步骤 7 实现演示资料读取与更新接口（已验收）

### 已完成

- 新增 `apps/server/lib/prisma.ts`：全局唯一 PrismaClient 实例，非生产环境挂到 `globalThis` 以避免热重载重复建连；
- 新增 `apps/server/lib/profile-service.ts`：按固定 `DEMO_PROFILE_ID` 读取与更新资料，用共享 `demoProfileSchema` 序列化，资料缺失时抛 `DemoProfileNotFoundError`；
- 新增 `apps/server/lib/profile-handlers.ts`：`createProfileHandlers(database)` 返回 GET 与 PATCH，负责状态码与统一错误映射；
- 新增 `apps/server/app/api/profile/route.ts`：薄封装，注入 `prisma` 后导出 GET 与 PATCH，并标记 `dynamic = 'force-dynamic'`；
- 新增 `apps/server/lib/profile-handlers.test.ts`：以假数据库测试 handlers，不引入 Next.js 运行时或真实数据库；
- 更新请求直接复用共享 `updateDemoProfileRequestSchema`，`strict()` 拒绝未知字段；更新只允许目标方向与每日上下限。

### 验证结果

2026-09-15 实际执行：

- `pnpm test`：99 个测试全部通过（nutrition 66、shared 17、server 16），退出码 0；
- `pnpm typecheck`：四个工作区全部通过；`pnpm db:check`：PostgreSQL 连接正常；
- 实际启动服务端做 HTTP 验证：`GET /api/profile` 返回默认资料；合法 `PATCH` 后再次读取结果一致；
- 非法输入全部被拒绝且不写库：下限大于上限、下限等于上限、非正整数、未知字段、非法枚举值与无法解析的 JSON；
- 上述请求分别返回 400 `PROFILE_INVALID_RANGE` 或 400 `VALIDATION_FAILED`，均符合共享 `apiErrorResponseSchema`；
- 资料不存在时返回 503 `DB_UNAVAILABLE`，不回退到数据库第一条记录；数据库故障返回同一错误结构且不暴露内部细节；
- 验证结束后已将演示资料恢复为默认值（减脂、1400–1600），数据库仅一行资料。

### 已知影响与后续衔接

- 步骤 6 验证项中“`GET /api/profile` 能按 `DEMO_PROFILE_ID` 读取同一资料”在本步骤补齐并通过；
- 接口层已建立可复用的分层（Route Handler → handlers → service）与统一错误映射，后续记录接口沿用同一模式；
- 错误码集合中的解析、图片与记录相关错误尚未被任何接口使用；
- 小程序端尚未调用该接口。

### 当前停点

- 步骤 7 已由用户验收确认，未开始步骤 8；
- 用户已确认接口行为与错误处理策略（资料缺失返回明确错误而非虚假默认值）。

## 决策状态

- **D1 已确认 c**：先提示用户补充；用户明确跳过后才使用带不确定性说明的宽范围保守区间。
- **D2 已确认 a**：`MealRecord` 加 `isDemo` 字段并在历史页打标。
- **D3 已确认 b**：餐别不进入 P0，从 P01/P05 视觉规范和共享契约中移除。
- **D4 已确认 a**：使用 `clientRequestId` + 唯一索引，由服务端保证幂等。
- **D5 真机体验版措辞**：(a) 保留但注明需先换正式 AppID；(b) 全文改为“真机调试（需正式 AppID）”。

完整影响范围与后续决策记录格式见 `decisions.md`。在用户确认前，相关设计、契约和计划保持中性。
