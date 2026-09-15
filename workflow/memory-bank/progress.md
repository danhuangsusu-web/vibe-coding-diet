# 食刻 AI 进度记录

> 当前阶段：步骤 1、步骤 2 已完成并经用户确认；步骤 3 未开始
> 下一步：步骤 3 的验证要求“D1 已确认”，开始步骤 3 前必须先确认 D1（未知菜品的处理）
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
- 步骤 3 的热量区间规则依赖 D1 结论，D1 未确认前不得开始。

### 当前停点

- 步骤 2 已由用户验收确认，未开始步骤 3；
- 未提交的部分已在本次改动中一并提交，工作区保持干净。

## 待用户确认

- **D1 未知菜品的处理**：(a) 提示用户补充后再评估；(b) 使用明确标记的保守通用区间并说明；(c) 两者结合（先提示，用户跳过则用区间）。
- **D2 已确认 a**：`MealRecord` 加 `isDemo` 字段并在历史页打标。
- **D3 已确认 b**：餐别不进入 P0，从 P01/P05 视觉规范和共享契约中移除。
- **D4 已确认 a**：使用 `clientRequestId` + 唯一索引，由服务端保证幂等。
- **D5 真机体验版措辞**：(a) 保留但注明需先换正式 AppID；(b) 全文改为“真机调试（需正式 AppID）”。

完整影响范围与后续决策记录格式见 `decisions.md`。在用户确认前，相关设计、契约和计划保持中性。
