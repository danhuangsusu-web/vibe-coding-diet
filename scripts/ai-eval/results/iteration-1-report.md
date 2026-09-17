# 食刻 AI 步骤 23 迭代评测报告

> 生成时间：2026-09-17T09:39:45.200Z
> 数据集：step-23-p0-eval-v2（38 个固定案例）
> 定位：P0 小样本、合成素材为主的工程评测，不代表线上业务指标。

## 结论摘要

| 指标 | 结果 | 目标 | 达标 |
| --- | ---: | ---: | :---: |
| 结构化合法率 | 84.2% | ≥95% | 否 |
| 主要菜品准确率 | 78.7% | ≥80% | 否 |
| 关键做法准确率 | 63.9% | ≥80% | 否 |
| 建议相关率 | 96.2% | ≥85% | 是 |
| 严重误判 | 2 | ≤2 | 是 |

结构化成功 32/38；实际返回餐食 26 个、无餐食 6 个、错误 6 个。食材标签准确率为 77.5%，成功解析结果中的受控食材标签覆盖率为 86.2%。

错误按模型调用状态拆分：invalid_output 5；timeout 1。超时和非法输出属于可用性/结构失败，不计作“严重误判”；建议相关率只在成功生成评估的案例中计算，避免对同一次解析失败重复扣分。

## 延迟、Token 与成本

- 延迟 P50：2236 ms；P90：5128 ms；最大：20014 ms。
- 输入 token：31174；输出 token：4558；合计：35732；无法取得 token 的调用：1。
- 可计算标价成本：0.037246 元；无法计算成本的调用：1；相对 100 元上限：未超出。
- 超时或供应商未返回 usage 的调用仍可能产生费用，因此可计算成本不是账单承诺。

## 受控词表覆盖

- 包含 `OTHER` 的样本：17/38。
- 食材包含 `OTHER` 的样本：9/38。
- 做法包含 `OTHER` 的样本：13/38。
- 使用宽范围保守兜底的样本：17/38。

### 未覆盖食材频次

| 未覆盖食材 | 次数 |
| --- | ---: |
| 茄子 | 2 |
| 粉丝 | 1 |
| 褐色圆形食物 | 1 |
| 胡萝卜 | 1 |
| 花生 | 1 |
| 木耳 | 1 |
| 奶茶 | 1 |
| 牛肉 | 1 |
| 牛杂 | 1 |
| 笋丝 | 1 |
| 珍珠 | 1 |
| DRIED_CHILI | 1 |
| PEANUT | 1 |

### 未覆盖做法频次

| 未覆盖做法 | 次数 |
| --- | ---: |
| 未说明，待用户选择 | 15 |
| BANCHED | 1 |

## 逐案例结果

| 案例 | 输入 | 结果 | 主要菜品 | 关键做法 | 建议相关 | 严重误判 | 失败原因 |
| --- | --- | --- | ---: | ---: | :---: | :---: | --- |
| TXT-SINGLE-001 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-SINGLE-002 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-SINGLE-003 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-SINGLE-004 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-SINGLE-005 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-SINGLE-006 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-MULTI-001 | TEXT | PARSED | 3/3 | 3/3 | 是 | 否 | - |
| TXT-MULTI-002 | TEXT | ERROR | 0/2 | 0/2 | N/A | 否 | STRUCTURED_OUTPUT_ERROR, UNEXPECTED_OUTCOME, ITEM_COUNT_MISMATCH, MISSING_DISH:鸡腿饭, COOKING_METHOD_MISMATCH:鸡腿饭, MISSING_DISH:时蔬, COOKING_METHOD_MISMATCH:时蔬, INGREDIENT_TAG_MISMATCH |
| TXT-MULTI-003 | TEXT | PARSED | 2/2 | 2/2 | 是 | 否 | - |
| TXT-MULTI-004 | TEXT | PARSED | 3/3 | 3/3 | 是 | 否 | - |
| TXT-HIGH-001 | TEXT | ERROR | 0/2 | 0/2 | N/A | 否 | STRUCTURED_OUTPUT_ERROR, UNEXPECTED_OUTCOME, ITEM_COUNT_MISMATCH, MISSING_DISH:炸鸡, COOKING_METHOD_MISMATCH:炸鸡, MISSING_DISH:薯条, COOKING_METHOD_MISMATCH:薯条, INGREDIENT_TAG_MISMATCH |
| TXT-HIGH-002 | TEXT | PARSED | 2/2 | 2/2 | 是 | 否 | - |
| TXT-HIGH-003 | TEXT | ERROR | 0/1 | 0/1 | N/A | 否 | STRUCTURED_OUTPUT_ERROR, UNEXPECTED_OUTCOME, ITEM_COUNT_MISMATCH, MISSING_DISH:干煸四季豆, COOKING_METHOD_MISMATCH:干煸四季豆, INGREDIENT_TAG_MISMATCH |
| TXT-HIGH-004 | TEXT | ERROR | 0/1 | 0/1 | N/A | 否 | STRUCTURED_OUTPUT_ERROR, UNEXPECTED_OUTCOME, ITEM_COUNT_MISMATCH, MISSING_DISH:煎鸡腿, COOKING_METHOD_MISMATCH:煎鸡腿, INGREDIENT_TAG_MISMATCH |
| TXT-AMB-001 | TEXT | PARSED | 2/2 | 2/2 | 是 | 否 | - |
| TXT-AMB-002 | TEXT | PARSED | 2/2 | 2/2 | 是 | 否 | - |
| TXT-AMB-003 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-AMB-004 | TEXT | PARSED | 1/1 | 1/1 | 是 | 是 | FORBIDDEN_INGREDIENT |
| TXT-AMB-005 | TEXT | PARSED | 1/1 | 0/1 | 是 | 否 | COOKING_METHOD_MISMATCH:蚂蚁上树 |
| TXT-AMB-006 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | OTHER_INGREDIENT_MISMATCH:宫保鸡丁 |
| TXT-EDGE-001 | TEXT | PARSED | 2/2 | 1/2 | 是 | 否 | COOKING_METHOD_MISMATCH:米饭, OTHER_COOKING_METHOD_MISMATCH:白米饭 |
| TXT-EDGE-002 | TEXT | NO_MEAL | 0/0 | 0/0 | N/A | 否 | - |
| TXT-EDGE-003 | TEXT | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| TXT-EDGE-004 | TEXT | ERROR | 0/2 | 0/2 | N/A | 否 | STRUCTURED_OUTPUT_ERROR, UNEXPECTED_OUTCOME, ITEM_COUNT_MISMATCH, MISSING_DISH:肉包子, COOKING_METHOD_MISMATCH:肉包子, MISSING_DISH:豆浆, COOKING_METHOD_MISMATCH:豆浆, INGREDIENT_TAG_MISMATCH |
| TXT-EDGE-005 | TEXT | NO_MEAL | 0/0 | 0/0 | N/A | 否 | - |
| TXT-EDGE-006 | TEXT | PARSED | 6/6 | 6/6 | 是 | 否 | - |
| IMG-PHOTO-001 | IMAGE | ERROR | 0/2 | 0/2 | N/A | 否 | STRUCTURED_OUTPUT_ERROR, UNEXPECTED_OUTCOME, ITEM_COUNT_MISMATCH, MISSING_DISH:清蒸鱼, COOKING_METHOD_MISMATCH:清蒸鱼, MISSING_DISH:米饭, COOKING_METHOD_MISMATCH:米饭, INGREDIENT_TAG_MISMATCH |
| IMG-PHOTO-002 | IMAGE | PARSED | 1/2 | 1/2 | 否 | 否 | MISSING_DISH:炸鸡, COOKING_METHOD_MISMATCH:炸鸡, INGREDIENT_TAG_MISMATCH, ADVICE_NOT_RELEVANT |
| IMG-PHOTO-003 | IMAGE | PARSED | 2/2 | 0/2 | 是 | 否 | COOKING_METHOD_MISMATCH:豆腐, COOKING_METHOD_MISMATCH:青菜 |
| IMG-PHOTO-004 | IMAGE | PARSED | 3/4 | 2/4 | 是 | 否 | MISSING_DISH:青菜, COOKING_METHOD_MISMATCH:青菜, COOKING_METHOD_MISMATCH:米饭, OTHER_COOKING_METHOD_MISMATCH:米饭, INGREDIENT_TAG_MISMATCH |
| IMG-LOWQ-001 | IMAGE | NO_MEAL | 0/0 | 0/0 | N/A | 否 | - |
| IMG-LOWQ-002 | IMAGE | NO_MEAL | 0/1 | 0/1 | N/A | 是 | UNEXPECTED_OUTCOME, ITEM_COUNT_MISMATCH, MISSING_DISH:米饭, COOKING_METHOD_MISMATCH:米饭, INGREDIENT_TAG_MISMATCH |
| IMG-MENU-001 | IMAGE | PARSED | 2/2 | 1/2 | 是 | 否 | COOKING_METHOD_MISMATCH:米饭, OTHER_COOKING_METHOD_MISMATCH:白米饭 |
| IMG-MENU-002 | IMAGE | PARSED | 3/3 | 1/3 | 是 | 否 | COOKING_METHOD_MISMATCH:白灼青菜, COOKING_METHOD_MISMATCH:米饭, OTHER_COOKING_METHOD_MISMATCH:白米饭 |
| IMG-MENU-003 | IMAGE | NO_MEAL | 0/0 | 0/0 | N/A | 否 | - |
| IMG-MENU-004 | IMAGE | PARSED | 1/1 | 1/1 | 是 | 否 | - |
| IMG-MENU-005 | IMAGE | NO_MEAL | 0/0 | 0/0 | N/A | 否 | - |
| IMG-MENU-006 | IMAGE | PARSED | 3/3 | 2/3 | 是 | 否 | COOKING_METHOD_MISMATCH:米饭, OTHER_COOKING_METHOD_MISMATCH:白米饭 |

## 真实失败案例

共 17 个案例至少有一项失败。失败样本完整保留在 `iteration-1.raw.json`，未从统计中删除。

- `TXT-MULTI-002`：STRUCTURED_OUTPUT_ERROR、UNEXPECTED_OUTCOME、ITEM_COUNT_MISMATCH、MISSING_DISH:鸡腿饭、COOKING_METHOD_MISMATCH:鸡腿饭、MISSING_DISH:时蔬、COOKING_METHOD_MISMATCH:时蔬、INGREDIENT_TAG_MISMATCH
- `TXT-HIGH-001`：STRUCTURED_OUTPUT_ERROR、UNEXPECTED_OUTCOME、ITEM_COUNT_MISMATCH、MISSING_DISH:炸鸡、COOKING_METHOD_MISMATCH:炸鸡、MISSING_DISH:薯条、COOKING_METHOD_MISMATCH:薯条、INGREDIENT_TAG_MISMATCH
- `TXT-HIGH-003`：STRUCTURED_OUTPUT_ERROR、UNEXPECTED_OUTCOME、ITEM_COUNT_MISMATCH、MISSING_DISH:干煸四季豆、COOKING_METHOD_MISMATCH:干煸四季豆、INGREDIENT_TAG_MISMATCH
- `TXT-HIGH-004`：STRUCTURED_OUTPUT_ERROR、UNEXPECTED_OUTCOME、ITEM_COUNT_MISMATCH、MISSING_DISH:煎鸡腿、COOKING_METHOD_MISMATCH:煎鸡腿、INGREDIENT_TAG_MISMATCH
- `TXT-AMB-004`：FORBIDDEN_INGREDIENT
- `TXT-AMB-005`：COOKING_METHOD_MISMATCH:蚂蚁上树
- `TXT-AMB-006`：OTHER_INGREDIENT_MISMATCH:宫保鸡丁
- `TXT-EDGE-001`：COOKING_METHOD_MISMATCH:米饭、OTHER_COOKING_METHOD_MISMATCH:白米饭
- `TXT-EDGE-004`：STRUCTURED_OUTPUT_ERROR、UNEXPECTED_OUTCOME、ITEM_COUNT_MISMATCH、MISSING_DISH:肉包子、COOKING_METHOD_MISMATCH:肉包子、MISSING_DISH:豆浆、COOKING_METHOD_MISMATCH:豆浆、INGREDIENT_TAG_MISMATCH
- `IMG-PHOTO-001`：STRUCTURED_OUTPUT_ERROR、UNEXPECTED_OUTCOME、ITEM_COUNT_MISMATCH、MISSING_DISH:清蒸鱼、COOKING_METHOD_MISMATCH:清蒸鱼、MISSING_DISH:米饭、COOKING_METHOD_MISMATCH:米饭、INGREDIENT_TAG_MISMATCH

## 未达标归因与处置边界

- **模型/Prompt 可用性**：仍有 6 个错误案例（invalid_output 5；timeout 1），直接压低结构化合法率、主要菜品和关键做法指标；失败结果保留，不通过删除样本或放宽最终 Schema 达标。
- **视觉与菜品识别**：主要菜品准确率仍略低于目标，缺失主要集中在合成餐食示意图漏菜，以及结构错误没有可评分菜品。合成图片不是实拍照片，结果不能外推到真实用户图片。
- **做法识别**：未说明做法时应返回 `OTHER` 并交给用户在 P03 选择。当前仍有模型猜测米饭做法、图片中做法不可辨或输出未受控拼写的案例，因此关键做法准确率未达标；这属于 Prompt 遵循和视觉证据不足，不继续扩大做法枚举。
- **规则与 Schema**：`TOMATO` / `FISH` 的有限补齐提高了受控食材覆盖率；剩余低频未知食材继续走保守兜底。本轮不再扩词表，不改变数量契约、0.8/1.2 评级阈值或严格共享 Schema。
- **UI**：P03 已允许用户确认和选择实际做法，不需要为本轮评测失败新增界面行为。

## 素材与局限

- 文字案例为固定中文输入。
- 菜单截图为本仓库确定性生成的合成界面，不属于任何真实平台。
- 餐食图片是确定性合成示意素材，不是真实用户拍摄照片；受当前环境没有内置图像生成工具的限制，图片结果只能检验当前模型对这些素材的表现，不能外推到真实餐食照片。
- 数据集数量有限且是为 P0 演示风险定向设计，所有比例只能作为本版本回归基线。

## 迭代边界

本报告为用户批准后的第一次有限迭代结果。基线原始结果与报告保持不变；本轮未扩大数量字段、接口契约、评级阈值或完整营养数据库范围。
