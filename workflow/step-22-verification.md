# 步骤 22 错误与降级验收记录

> 状态：等待用户验收。本文只记录验证口径，不提前更新 `progress.md` 或步骤完成状态。

## 自动化覆盖矩阵

| 错误码 | `retryable` | 服务端产生与脱敏 | 客户端恢复动作 |
| --- | ---: | --- | --- |
| `AI_NOT_CONFIGURED` | 否 | `meal-parse-handlers.test.ts` | `meal-error-presentation.test.ts`：改用离线样例 |
| `AI_TIMEOUT` | 是 | `ai-meal-parser.test.ts`、`meal-parse-handlers.test.ts` | `meal-parser.test.ts`：20 秒中止底层任务；错误映射为重试或文字输入 |
| `AI_INVALID_OUTPUT` | 否 | `ai-meal-parser.test.ts`、`meal-parse-handlers.test.ts` | 修改描述或更换图片，不提供无意义的原样重试 |
| `NO_MEAL_DETECTED` | 否 | `meal-parse-handlers.test.ts` | 返回可编辑输入，支持重新拍摄或文字描述 |
| `IMAGE_TOO_LARGE` | 否 | `meal-parse-handlers.test.ts` | 重新选择或裁剪图片 |
| `IMAGE_UNSUPPORTED` | 否 | `meal-parse-handlers.test.ts`、`meal-api.test.ts` | 使用 JPG/PNG 或重新拍摄 |
| `IMAGE_COMPRESS_FAILED` | 是 | 客户端图片策略测试 | 重试或改用文字输入 |
| `PROFILE_INVALID_RANGE` | 否 | `profile-handlers.test.ts` | 保留设置草稿并修正上下限 |
| `DB_UNAVAILABLE` | 是 | `profile-handlers.test.ts`、`meal-assessment-handlers.test.ts`、`meal-record-handlers.test.ts` | 保留当前输入、评估或记录并稍后重试 |
| `MEAL_NOT_FOUND` | 否 | `meal-record-handlers.test.ts` | 返回并刷新记录列表 |
| `VALIDATION_FAILED` | 否 | 解析、资料、评估和记录 handler 测试 | 返回最近可编辑状态并修正输入 |
| `UNKNOWN_DISH` | 否 | `meal-assessment-handlers.test.ts`、`meal-record-handlers.test.ts` | 返回确认页补充，或由用户明确选择宽范围兜底 |

共享契约测试固定全部 12 个错误码及其 `retryable` 值。客户端只接受通过共享 Zod Schema 的错误响应，并用本地稳定文案呈现；未知响应、异常对象、堆栈、连接串和供应商正文不会直接显示。

## 状态恢复与重复操作

- `parsing` 失败：P02 保留当前文字或图片，回到可修改、可重试的输入状态。
- `assessing` 失败：P04 不生成结果，提供“返回补充”；仅 `retryable=true` 时显示原样重新评估，`UNKNOWN_DISH` 仍需用户明确选择宽范围兜底。
- `saving` 失败：保留完整 `assessment` 和同一个 `clientRequestId`；仅可重试错误显示重试，重复保存由客户端锁和数据库唯一索引共同兜底。
- 文字请求和图片上传均暴露 `cancel()`；用户取消、20 秒到时和页面卸载都会调用底层 `Taro.request.abort()` 或 `Taro.uploadFile.abort()`。
- 服务端 Route Handler 把 `request.signal` 传入 AI parser；客户端断开时，parser 的 `AbortController` 中止模型调用，并只记录脱敏状态 `cancelled`。
- AI SDK `maxRetries` 固定为 1；用户手动重试不设上限。图片第一次手动重试仍失败后，下一次操作开始前把“改用文字输入”提升为主按钮。
- 两个明确离线文字样例在请求任务创建前命中本地数据，不依赖服务地址或模型网络。

## 微信开发者工具人工复现

### 权限拒绝

1. 在项目设置或模拟器权限面板关闭相机/相册权限。
2. P02 图片模式点击“拍照”或“从相册选择”。
3. 预期显示权限说明、“去开启权限”和“改用文字输入”；不上传文件，文字入口可用。

### 断网与恢复

1. 输入一个非离线样例，例如“番茄炒蛋配一小碗米饭”。
2. 在开发者工具网络面板切换为 Offline，再点击“开始分析”。
3. 预期输入保持不变，显示可重试的网络错误；恢复网络后可重试。
4. 保持断网，选择任一页面上的两个离线文字样例；预期仍可进入确认页。

### 用户取消与超时

1. 对非离线文字或图片开始分析，等待 4 秒出现详细进度。
2. 点击“取消并改用文字输入”。
3. 在 Network 面板确认请求被标为 cancelled/abort，页面不接收迟到结果。
4. 用网络限速或测试代理让请求超过 20 秒；预期客户端在 20 秒停止等待并中止请求，输入仍保留。

### HEIC 与图片边界

1. 在 iOS 真机或可提供 HEIC 的相册选择 HEIC 图片。
2. 预期客户端拒绝上传并引导使用 JPG/PNG 或重新拍摄。
3. 对大图确认客户端压缩后不超过 1MB；构造超过服务端 2MB 的请求时，接口稳定返回 `IMAGE_TOO_LARGE`，不返回 HTML 或框架堆栈。

### 重复保存与数据库故障

1. 在 P04 快速连续点击“保存这顿饭”；预期只发出一个有效保存操作。
2. 用同一个 `clientRequestId` 重放保存请求；预期返回同一条记录且数据库没有第二条。
3. 临时停止数据库或改用不可连接的测试数据库，分别触发评估、保存和列表读取；预期返回 `DB_UNAVAILABLE`，不显示虚假零值或空列表，P04 保存失败后完整结果仍在。

## 延迟复核

步骤 20/21 已记录的十个可比较观察值为：6.450、9.940、11.190、11.374、12.460、16.071、17.851、18.604、20.010、20.050 秒。按升序和 nearest-rank 口径：

- 指示性 P50：约 14.266 秒（偶数样本中间两项均值）；
- 指示性 P90：约 20.010 秒；
- 当前客户端与服务端上限继续保持 20 秒。

样本混合了文字成功、图片成功、无餐食、非法结构和超时结果，且数量只有 10 个，因此只用于复核交互阈值，不能表述为生产环境性能统计。步骤 23 的正式评测集继续按输入类型和结果类别分别记录耗时、token 与成本。
