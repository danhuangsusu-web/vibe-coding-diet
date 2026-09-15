# 食刻 AI 技术栈

> 基线日期：2026-09-15（已同步步骤 1）
> 原则：优先记录仓库真实依赖；计划新增项必须明确标记，不能写成已安装。

## 1. 仓库与运行环境

| 层级 | 当前选择 | 版本或约束 | 当前状态 |
| --- | --- | --- | --- |
| 包管理 | pnpm workspace | pnpm 11.19.0 | 已配置并有锁文件 |
| Node.js | Node.js | >= 20.9.0 | 根 package 已约束 |
| 语言 | TypeScript | ^5.9.2 | 四个工作区均启用 strict |
| 仓库结构 | pnpm monorepo | `apps/*`、`packages/*` | 已建立 |
| 版本控制 | Git | `main` | 已建立；步骤 1 提交为 `01afa66` |

不引入 Turborepo、Nx 或额外构建编排器。当前只有四个实际工作区，pnpm 递归脚本足够。

## 2. 微信小程序

| 能力 | 当前依赖 | 版本 | 采用方式 |
| --- | --- | --- | --- |
| 跨端框架 | Taro | 4.2.1 | 编译到微信小程序 |
| UI 框架 | React | 18.3.1 | Taro React 运行时 |
| 小程序组件 | `@tarojs/components` | 4.2.1 | 已用于当前首页 |
| UI 组件库 | TDesign MiniProgram | 1.16.1 | 已安装，业务源码尚未使用 |
| 状态管理 | Jotai | ^2.13.1 | 已安装，业务源码尚未使用 |
| 样式 | SCSS / Sass | ^1.92.1 | 当前首页使用 SCSS |
| 编译器 | Webpack 5 | 5.91.0 | Taro 配置已启用 |
| 微信类型 | `@types/wechat-miniprogram` | 3.4.10 | 已安装 |

选择建议：

- 保留 Taro、React、TypeScript 和 SCSS，不更换前端框架；
- TDesign 只用于它能稳定覆盖的按钮、输入、弹层和反馈组件；
- 跨页餐食草稿可使用已安装的 Jotai；局部表单和加载状态使用组件状态；
- 不引入 shadcn/ui、Framer Motion 或 Web 专用组件库；
- 微信开发者工具承担小程序端最终人工验收。

## 3. 服务端

| 能力 | 当前依赖 | 版本 | 当前状态 |
| --- | --- | --- | --- |
| Web 与 API 框架 | Next.js | 15.5.25 | 已有 App Router、展示页和健康接口 |
| UI 运行时 | React / React DOM | 18.3.1 | 仅用于 Next.js 页面 |
| AI 编排 | Vercel AI SDK `ai` | 7.0.94 | 已安装，尚无餐食解析调用 |
| 模型适配 | `@ai-sdk/openai-compatible` | 3.0.45 | 已有供应商工厂 |
| 校验 | Zod | ^4.1.8 | 已用于共享餐食 Schema |
| ORM | Prisma Client | 6.19.3 | 已生成并可连接数据库 |
| ORM 工具 | Prisma | 6.19.3 | Schema 校验通过 |

服务端继续使用 Next.js Route Handlers。MVP 不拆独立 Express/Fastify 服务，也不引入队列、缓存、RPC 或微服务。

模型接入只保留一个 OpenAI 兼容供应商，通过 `AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL` 配置。密钥只存在于服务端环境，不进入小程序包。

## 4. 数据与存储

| 能力 | 当前选择 | 当前状态 |
| --- | --- | --- |
| 主数据库 | PostgreSQL 14+ 或兼容服务 | README 已声明；本地连接检查通过 |
| 数据访问 | Prisma | 已有 DemoProfile 和 MealRecord |
| 图片存储 | 不持久化 | 目标设计要求请求内临时处理 |
| 缓存 | 无 | MVP 不需要 |
| 用户认证 | 无 | 使用唯一虚构演示资料 |

数据库继续使用 PostgreSQL，不切换 SQLite。当前 Schema 已明确绑定 PostgreSQL，且本地连接可用。P0 不增加对象存储，因为原图不长期保存。

## 5. 共享领域包

| 包 | 当前职责 | 目标职责 |
| --- | --- | --- |
| `@food-sense/shared` | MealItem 与 ParsedMeal 的 Zod Schema 和类型 | 增加 API 输入输出、资料、评估和错误契约 |
| `@food-sense/nutrition` | 最小 `rateMeal` 阈值函数 | 增加食材区间、做法附加值、份量、动态额度、评级原因和建议规则 |

领域计算应保持纯函数和确定性，不依赖 Next.js、Prisma、Taro 或模型客户端，以便独立测试。

小程序端只通过 `import type` 引用共享 TypeScript 类型，不运行共享 Zod Schema，避免把 Zod 运行时打入主包。Zod 运行时校验只在服务端执行；小程序表单使用手写的轻量规则完成必填、长度和数值范围校验。

## 6. 测试与质量

### 6.1 当前真实状态

- 根目录已安装 Vitest `^3.2.7`，锁文件当前解析版本为 3.2.7；
- 根 `test` 脚本运行一次全仓测试，`test:watch` 用于本地监听；
- `vitest.config.ts` 使用 Node 环境，收集 shared、nutrition 和 server 的 `*.test.ts`，并通过 `passWithNoTests: false` 禁止零测试成功退出；
- shared、nutrition 和 server 各有一个最小冒烟测试，共 3 个测试文件、3 个测试；
- server 冒烟测试已验证 Vitest 可直接解析 exports 指向 `src/index.ts` 的 workspace TypeScript 包；
- Jest、Playwright 和 Cypress 未作为项目测试框架引入；锁文件中同名传递依赖不代表已配置；
- 小程序流程仍由微信开发者工具人工验收，当前不在 Vitest 范围内。

### 6.2 当前选择与后续扩展

| 能力 | 推荐选择 | 理由 |
| --- | --- | --- |
| 单元与领域服务测试 | Vitest 3.2.7 | 已建立全仓入口；后续步骤在现有配置上增加领域边界与服务函数测试 |
| 小程序流程验收 | 微信开发者工具人工清单 | P0 以微信运行时为准，不为五页 MVP 引入脆弱的端到端框架 |
| AI 评测 | 仓库内结构化样本与可重复运行脚本 | 需要记录输入、期望、实际、模型版本和失败原因 |

Vitest 已在步骤 1 安装并通过基线验证。Route Handler 保持薄封装；P0 的服务端自动化测试优先覆盖领域服务函数，HTTP 行为使用人工步骤或 curl 验证，避免把 Next.js 运行时引入单元测试。P0 不新增 Jest、Playwright 或 Cypress；若以后形成 Web 管理端或稳定的小程序自动化环境，再单独评估端到端工具。

持续使用的命令门槛：

- `pnpm typecheck`
- `pnpm test`
- `pnpm build:miniprogram`
- `pnpm build:server`
- `pnpm db:generate`
- `pnpm db:validate`
- `pnpm db:push`
- `pnpm db:check`

步骤 1 验证结果：`pnpm test` 运行 3 个测试文件、3 个测试并全部通过；`pnpm typecheck` 覆盖四个工作区并通过。

修改 Prisma Schema 后的固定顺序是：先执行 `pnpm db:validate`，再执行 `pnpm db:generate` 更新 Prisma Client 类型，然后以 P0 的 `pnpm db:push` 同步结构，最后执行 `pnpm db:check`。P0 不建立 migrations；执行 `db:push` 前必须先确认当前数据库没有需要保留的数据，或先完成导出。

## 7. 部署

P0 必达部署形态：

- 本地运行 Next.js 服务；
- 本地 PostgreSQL；
- 微信开发者工具加载 `apps/miniprogram`，编译输出位于 `apps/miniprogram/dist`；
- 服务端使用本地环境变量连接模型和数据库。

当前 `project.config.json` 使用 `touristappid`，不能上传体验版且真机能力受限。正式 AppID 相关工作属于 P1、不计入 P0 预算；D5 决策前不固定“真机体验版”或“真机调试”的最终措辞。P0 不提前引入云数据库、容器平台、反向代理、域名或正式小程序审核流程。

## 8. 配置与安全

- `apps/server/.env.example` 保存数据库连接占位符和空的 AI 配置；
- `apps/server/.env` 已被 `.gitignore` 排除；
- 小程序不能包含 AI Key 或数据库连接；
- 服务端错误响应不能暴露环境变量、供应商响应原文或堆栈；
- 日志不记录完整原图；
- 输入校验统一使用共享 Zod Schema，数据库约束不能替代接口校验。

## 9. 明确不采用

- 不更换为原生微信小程序、Vue、UniApp 或 Expo；
- 不新增独立 Node API 框架；
- 不使用 Redis、消息队列、多模型路由或向量数据库；
- 不建设认证、邮件、支付或国际化基础设施；
- 不使用完整营养数据库作为 P0 前置条件；
- 不为原始图片引入对象存储；
- 不把浏览器 HTML 原型当作生产前端运行时。
