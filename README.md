# 食刻 AI

食刻 AI 是一个面向 AI 产品经理作品集的微信小程序 MVP。用户上传餐食图片或输入文字，确认 AI 识别结果后，系统通过规则计算热量区间、红黄绿灯和行动建议。

## 环境要求

- Node.js 20.9 或更高版本
- pnpm 11
- 微信开发者工具，用于打开 `apps/miniprogram/dist`
- PostgreSQL 14 或更高版本，或者一个兼容 PostgreSQL 的云数据库
- 一个支持图片输入的 AI 模型 API Key

## 开始开发

```bash
pnpm install
Copy-Item apps/server/.env.example apps/server/.env
pnpm db:generate
pnpm db:check
pnpm dev:server
```

另开一个终端构建小程序：

```bash
pnpm dev:miniprogram
```

然后使用微信开发者工具导入 `apps/miniprogram`。项目配置会将编译输出指向 `apps/miniprogram/dist`。

## 常用检查

```bash
pnpm typecheck
pnpm build:miniprogram
pnpm build:server
pnpm db:validate
pnpm db:push
```

没有配置数据库和模型 Key 时，健康检查接口仍可运行，但餐食解析和持久化功能需要后续接入。

模型接入使用 OpenAI 兼容协议。在 `apps/server/.env` 中填写供应商提供的 `AI_BASE_URL`、`AI_API_KEY` 和视觉模型名称 `AI_MODEL`。不要提交真实密钥。
