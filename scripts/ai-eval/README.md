# 步骤 23 AI 评测

本目录保存 38 个稳定 ID 的合成评测案例、可复现素材、评分代码、原始模型结果和报告。普通 `pnpm test` 只运行评分器单测，不会调用外部模型。

## 证据文件

- `cases.baseline.json`：扩词和 Prompt 调整前的冻结期望；
- `cases.json`：用户批准后的迭代 1 期望，案例 ID 与输入不变；
- `results/*.raw.json`：真实模型调用原始结果，不因失败而删除；
- `results/*.summary.json`：可从原始结果重算的指标与逐案例评分；
- `results/*-report.md`、`results/iteration-1-comparison.md`：可阅读报告。

图片均为仓库内确定性生成的合成素材，不是真实用户照片，也不能代表真实拍照场景的线上表现。

## 无费用重算

在 PowerShell 中重算冻结基线：

```powershell
$env:AI_EVAL_RECOMPUTE_ONLY='1'
$env:AI_EVAL_RESULT_SET='baseline'
$env:AI_EVAL_DATASET_FILE='cases.baseline.json'
pnpm eval:ai
```

重算迭代 1 时将结果集改为 `iteration-1`、数据集改为 `cases.json`。重算只读取现有 `raw.json`，不会加载服务端 `.env` 或调用模型。

## 付费实跑保护

真实评测会向配置的外部模型发送全部案例并可能产生费用，必须在获得明确批准后同时设置：

```powershell
$env:AI_EVAL_ALLOW_LIVE='1'
$env:AI_EVAL_RESULT_SET='new-result-set'
$env:AI_EVAL_DATASET_FILE='cases.json'
pnpm eval:ai
```

不设置 `AI_EVAL_ALLOW_LIVE=1` 时，运行器会在任何模型调用前失败；不设置结果集名称时也会失败，避免覆盖已有证据。
