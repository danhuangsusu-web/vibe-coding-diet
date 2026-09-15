# 食刻 AI 工作流规则

本文件适用于 `workflow/` 中的文档工作，以及任何依据本工作流执行的后续业务实现。

## 文档优先

开始任何业务代码变更前，必须完整阅读：

- `memory-bank/architecture.md`；
- `memory-bank/design-document.md`；
- `memory-bank/implementation-plan.md`；
- `memory-bank/progress.md`。

每完成一个重大功能或里程碑后，必须更新 `memory-bank/architecture.md`；涉及待定产品行为时还必须先阅读 `memory-bank/decisions.md`，不得把未决方案当成既定结论。

`memory-bank/design-document.md` 是已批准的产品行为来源，`memory-bank/architecture.md` 是当前代码事实来源。两者冲突时不得自行猜测，应先停止并向用户确认。

## 执行纪律

- 每次只执行 `implementation-plan.md` 中一个尚未完成的步骤；
- 不得顺带实现下一步骤或 P1 延期项；
- 用户是每一步的验收门槛，除非用户明确授权代理自行验收；
- 步骤验证完成后先向用户报告，获得确认后才更新完成状态；
- 每个已确认步骤都必须追加到 `memory-bank/progress.md`；
- 新增、删除或改变重要文件职责后，必须同步更新 `memory-bank/architecture.md`；
- 实际依赖变化必须同步更新 `memory-bank/tech-stack.md`；
- 产品行为变化必须先更新并重新批准 `memory-bank/design-document.md`；
- `.workbuddy_html/P01.html` 至 `P05.html` 不是已实现业务代码，但它们是对应页面的视觉验收基准；实现时必须阅读 `memory-bank/design-document.md` 的 UI 规范并逐页对照；
- 原型与产品规则冲突时以 `design-document.md` 为准，不得为匹配硬编码演示数字而改变业务计算；
- 不把旧版 `PRD.docx` 中的语音、精确宏量营养、时间惩罚评级、附近外卖或食谱功能带入 P0；
- 不提交或输出 `.env`、API Key、数据库连接串或原始餐食图片。

## 当前门槛

工作流文档正在等待用户复核。用户明确批准前，不执行 `memory-bank/implementation-plan.md` 的任何步骤（包括步骤 0），不修改业务代码，也不初始化 Git。
