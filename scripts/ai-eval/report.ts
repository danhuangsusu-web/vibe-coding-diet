import type { EvalDataset } from './dataset'
import type { CaseScore, EvaluationSummary, EvalRawResult } from './scoring'

const percent = (value: number | null) =>
  value === null ? 'N/A' : `${(value * 100).toFixed(1)}%`

function frequencyRows(values: Record<string, number>): string {
  const entries = Object.entries(values).sort(
    ([leftName, leftCount], [rightName, rightCount]) =>
      rightCount - leftCount || leftName.localeCompare(rightName, 'zh-CN')
  )
  return entries.length
    ? entries.map(([name, count]) => `| ${name} | ${count} |`).join('\n')
    : '| 无 | 0 |'
}

function inlineCounts(values: Record<string, number>): string {
  const entries = Object.entries(values).sort(([, left], [, right]) => right - left)
  return entries.length
    ? entries.map(([name, count]) => `${name} ${count}`).join('；')
    : '无'
}

export function renderEvaluationReport(
  dataset: EvalDataset,
  results: readonly EvalRawResult[],
  scores: readonly CaseScore[],
  summary: EvaluationSummary,
  generatedAt: string,
  resultSet: string
): string {
  const resultById = new Map(results.map((result) => [result.caseId, result]))
  const scoreRows = dataset.cases
    .map((evalCase) => {
      const result = resultById.get(evalCase.id)!
      const score = scores.find(({ caseId }) => caseId === evalCase.id)!
      return `| ${evalCase.id} | ${evalCase.modality} | ${result.status} | ${score.primaryDishHits}/${score.primaryDishTotal} | ${score.cookingMethodHits}/${score.cookingMethodTotal} | ${score.adviceRelevant === null ? 'N/A' : score.adviceRelevant ? '是' : '否'} | ${score.severeMisjudgment ? '是' : '否'} | ${score.failureReasons.join(', ') || '-'} |`
    })
    .join('\n')
  const failures = scores.filter(({ failureReasons }) => failureReasons.length > 0)
  const attribution =
    resultSet === 'baseline'
      ? `## 未达标归因

- 基线的主要瓶颈是模型调用可用性与输出约束：${summary.errorCases} 个错误案例中，调用状态为 ${inlineCounts(summary.errorStatusCounts)}。
- 菜品、食材和做法准确率是端到端口径，结构错误案例按零命中计入，因此会同时受超时和非法输出影响。
- 本轮只建立基线，不据此放宽 Schema；D8 的有限词表补齐与 Prompt 调整须经用户批准后才能实施。`
      : `## 未达标归因与处置边界

- **模型/Prompt 可用性**：仍有 ${summary.errorCases} 个错误案例（${inlineCounts(summary.errorStatusCounts)}），直接压低结构化合法率、主要菜品和关键做法指标；失败结果保留，不通过删除样本或放宽最终 Schema 达标。
- **视觉与菜品识别**：主要菜品准确率仍略低于目标，缺失主要集中在合成餐食示意图漏菜，以及结构错误没有可评分菜品。合成图片不是实拍照片，结果不能外推到真实用户图片。
- **做法识别**：未说明做法时应返回 \`OTHER\` 并交给用户在 P03 选择。当前仍有模型猜测米饭做法、图片中做法不可辨或输出未受控拼写的案例，因此关键做法准确率未达标；这属于 Prompt 遵循和视觉证据不足，不继续扩大做法枚举。
- **规则与 Schema**：\`TOMATO\` / \`FISH\` 的有限补齐提高了受控食材覆盖率；剩余低频未知食材继续走保守兜底。本轮不再扩词表，不改变数量契约、0.8/1.2 评级阈值或严格共享 Schema。
- **UI**：P03 已允许用户确认和选择实际做法，不需要为本轮评测失败新增界面行为。`

  return `# 食刻 AI 步骤 23 ${resultSet === 'baseline' ? '基线' : '迭代'}评测报告

> 生成时间：${generatedAt}
> 数据集：${dataset.datasetId}（${dataset.cases.length} 个固定案例）
> 定位：P0 小样本、合成素材为主的工程评测，不代表线上业务指标。

## 结论摘要

| 指标 | 结果 | 目标 | 达标 |
| --- | ---: | ---: | :---: |
| 结构化合法率 | ${percent(summary.structuredLegalRate)} | ≥95% | ${summary.targets.structuredLegalRate ? '是' : '否'} |
| 主要菜品准确率 | ${percent(summary.primaryDishAccuracy)} | ≥80% | ${summary.targets.primaryDishAccuracy ? '是' : '否'} |
| 关键做法准确率 | ${percent(summary.cookingMethodAccuracy)} | ≥80% | ${summary.targets.cookingMethodAccuracy ? '是' : '否'} |
| 建议相关率 | ${percent(summary.adviceRelevanceRate)} | ≥85% | ${summary.targets.adviceRelevanceRate === null ? 'N/A' : summary.targets.adviceRelevanceRate ? '是' : '否'} |
| 严重误判 | ${summary.severeMisjudgmentCount} | ≤2 | ${summary.targets.severeMisjudgmentCount ? '是' : '否'} |

结构化成功 ${summary.structuredLegalCount}/${summary.totalCases}；实际返回餐食 ${summary.parsedCases} 个、无餐食 ${summary.noMealCases} 个、错误 ${summary.errorCases} 个。食材标签准确率为 ${percent(summary.ingredientAccuracy)}，成功解析结果中的受控食材标签覆盖率为 ${percent(summary.ingredientTagCoverageRate)}。

错误按模型调用状态拆分：${inlineCounts(summary.errorStatusCounts)}。超时和非法输出属于可用性/结构失败，不计作“严重误判”；建议相关率只在成功生成评估的案例中计算，避免对同一次解析失败重复扣分。

## 延迟、Token 与成本

- 延迟 P50：${summary.durationMs.p50 ?? 'N/A'} ms；P90：${summary.durationMs.p90 ?? 'N/A'} ms；最大：${summary.durationMs.max ?? 'N/A'} ms。
- 输入 token：${summary.tokens.input}；输出 token：${summary.tokens.output}；合计：${summary.tokens.total}；无法取得 token 的调用：${summary.tokens.unavailableCalls}。
- 可计算标价成本：${summary.costCny.calculated.toFixed(6)} 元；无法计算成本的调用：${summary.costCny.unavailableCalls}；相对 100 元上限：${summary.costCny.withinBudget ? '未超出' : '已超出'}。
- 超时或供应商未返回 usage 的调用仍可能产生费用，因此可计算成本不是账单承诺。

## 受控词表覆盖

- 包含 \`OTHER\` 的样本：${summary.otherSampleCount}/${summary.totalCases}。
- 食材包含 \`OTHER\` 的样本：${summary.otherIngredientSampleCount}/${summary.totalCases}。
- 做法包含 \`OTHER\` 的样本：${summary.otherCookingMethodSampleCount}/${summary.totalCases}。
- 使用宽范围保守兜底的样本：${summary.conservativeFallbackSampleCount}/${summary.totalCases}。

### 未覆盖食材频次

| 未覆盖食材 | 次数 |
| --- | ---: |
${frequencyRows(summary.unknownIngredientFrequency)}

### 未覆盖做法频次

| 未覆盖做法 | 次数 |
| --- | ---: |
${frequencyRows(summary.unknownCookingMethodFrequency)}

## 逐案例结果

| 案例 | 输入 | 结果 | 主要菜品 | 关键做法 | 建议相关 | 严重误判 | 失败原因 |
| --- | --- | --- | ---: | ---: | :---: | :---: | --- |
${scoreRows}

## 真实失败案例

共 ${failures.length} 个案例至少有一项失败。失败样本完整保留在 \`${resultSet}.raw.json\`，未从统计中删除。

${failures
  .slice(0, 10)
  .map(({ caseId, failureReasons }) => `- \`${caseId}\`：${failureReasons.join('、')}`)
  .join('\n') || '- 无'}

${attribution}

## 素材与局限

- 文字案例为固定中文输入。
- 菜单截图为本仓库确定性生成的合成界面，不属于任何真实平台。
- 餐食图片是确定性合成示意素材，不是真实用户拍摄照片；受当前环境没有内置图像生成工具的限制，图片结果只能检验当前模型对这些素材的表现，不能外推到真实餐食照片。
- 数据集数量有限且是为 P0 演示风险定向设计，所有比例只能作为本版本回归基线。

## 迭代边界

${resultSet === 'baseline' ? '本报告为扩充前基线。若根据未覆盖食材频次提出 D8 有限补齐清单，必须先由用户确认；确认前不修改共享枚举、Prompt、热量规则或接口契约。Prompt 迭代必须递增版本并保留本基线结果。' : '本报告为用户批准后的第一次有限迭代结果。基线原始结果与报告保持不变；本轮未扩大数量字段、接口契约、评级阈值或完整营养数据库范围。'}
`
}

export function renderComparisonReport(
  baseline: EvaluationSummary,
  iteration: EvaluationSummary,
  generatedAt: string
): string {
  const deltaPercent = (current: number | null, previous: number | null) =>
    current === null || previous === null
      ? 'N/A'
      : `${((current - previous) * 100).toFixed(1)} 个百分点`
  const row = (
    label: string,
    previous: number | null,
    current: number | null,
    target: string
  ) =>
    `| ${label} | ${percent(previous)} | ${percent(current)} | ${deltaPercent(current, previous)} | ${target} |`

  return `# 食刻 AI 步骤 23 迭代前后对比

> 生成时间：${generatedAt}
> 对比范围：相同 38 个稳定 ID 与输入；基线使用旧受控词表，迭代 1 使用用户批准的 \`TOMATO\` / \`FISH\` 标签，并按“未说明做法不得猜测”政策更新做法期望。
> 口径说明：这不是严格的单变量 A/B；变化同时反映 Prompt、模型请求配置、有限规则补齐和已批准评测期望修正。

| 指标 | 基线 | 迭代 1 | 变化 | 目标 |
| --- | ---: | ---: | ---: | ---: |
${row('结构化合法率', baseline.structuredLegalRate, iteration.structuredLegalRate, '≥95%')}
${row('主要菜品准确率', baseline.primaryDishAccuracy, iteration.primaryDishAccuracy, '≥80%')}
${row('关键做法准确率', baseline.cookingMethodAccuracy, iteration.cookingMethodAccuracy, '≥80%')}
${row('建议相关率', baseline.adviceRelevanceRate, iteration.adviceRelevanceRate, '≥85%')}
${row('受控食材标签覆盖率', baseline.ingredientTagCoverageRate, iteration.ingredientTagCoverageRate, '记录项')}
| 严重误判 | ${baseline.severeMisjudgmentCount} | ${iteration.severeMisjudgmentCount} | ${iteration.severeMisjudgmentCount - baseline.severeMisjudgmentCount} | ≤2 |
| 包含 OTHER 的样本 | ${baseline.otherSampleCount} | ${iteration.otherSampleCount} | ${iteration.otherSampleCount - baseline.otherSampleCount} | 记录项 |
| 食材包含 OTHER 的样本 | ${baseline.otherIngredientSampleCount} | ${iteration.otherIngredientSampleCount} | ${iteration.otherIngredientSampleCount - baseline.otherIngredientSampleCount} | 记录项 |
| 做法包含 OTHER 的样本 | ${baseline.otherCookingMethodSampleCount} | ${iteration.otherCookingMethodSampleCount} | ${iteration.otherCookingMethodSampleCount - baseline.otherCookingMethodSampleCount} | 记录项 |
| 保守兜底样本 | ${baseline.conservativeFallbackSampleCount} | ${iteration.conservativeFallbackSampleCount} | ${iteration.conservativeFallbackSampleCount - baseline.conservativeFallbackSampleCount} | 记录项 |
| P50 延迟 | ${baseline.durationMs.p50 ?? 'N/A'} ms | ${iteration.durationMs.p50 ?? 'N/A'} ms | - | 记录项 |
| P90 延迟 | ${baseline.durationMs.p90 ?? 'N/A'} ms | ${iteration.durationMs.p90 ?? 'N/A'} ms | - | 记录项 |
| 可计算成本 | ${baseline.costCny.calculated.toFixed(6)} 元 | ${iteration.costCny.calculated.toFixed(6)} 元 | ${(iteration.costCny.calculated - baseline.costCny.calculated).toFixed(6)} 元 | ≤100 元累计上限 |

两轮共 76 次合成评测调用，可计算标价成本合计 ${(baseline.costCny.calculated + iteration.costCny.calculated).toFixed(6)} 元；${baseline.costCny.unavailableCalls + iteration.costCny.unavailableCalls} 次调用未返回 usage，仍可能产生账单费用。

## 错误结构

- 基线：${inlineCounts(baseline.errorStatusCounts)}。
- 迭代 1：${inlineCounts(iteration.errorStatusCounts)}。
- 超时调用可能没有 token 和可计算成本，成本行不是最终账单。

## 版本边界

- 基线 Prompt：\`text-meal-v2\` / \`image-meal-v1\`；热量规则：\`calorie-range-v1\`。
- 迭代 1 Prompt：\`text-meal-v3\` / \`image-meal-v2\`；热量规则：\`calorie-range-v2\`。
- 两轮均使用 \`qwen3.8-flash\`，共享餐食结构、20 秒超时和 0.8/1.2 评级阈值保持不变。
`
}
