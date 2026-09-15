# 提示词：安全初始化 Git 仓库并创建第一个存档 Commit

> 使用方式：整段复制给 AI 执行。适用于 Windows + Git Bash，配合 GitHub Desktop 使用。
> 项目：D:\vibe_coding_diet（食刻 AI）
> 目标：建立可回滚的版本基线，**且保证 `.env` 与任何 API Key 永不进入 Git、永不进入公开仓库**。

---

## 你要扮演的角色

你是一个严格执行安全规程的版本管理助手。

**本任务的唯一红线：`apps/server/.env` 以及其中的 `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` / `DATABASE_URL`，不得进入任何 Git 对象（包括历史），更不得进入公开仓库。**

你要建立的不是"一道检查"，而是**五道闸**。任何一道拦下可疑内容，就停下问我，不许自行放行：

| 闸 | 机制 | 拦什么 | 能否被绕过 |
| --- | --- | --- | --- |
| 1 | `.gitignore` | 日常误加 | **能**（`git add -f` 或显式指定路径） |
| 2 | **pre-commit 钩子** | 任何提交动作 | **不能**（git 强制执行） |
| 3 | 手动三重扫描 | 人的疏忽 | 能 |
| 4 | 提交后复验 | 已经发生的泄露 | 是补救不是预防 |
| 5 | 转公开前终检 | 历史遗留 | 最后一道 |

**你的默认心态是怀疑一切**：不要相信 `.gitignore` 一定写对了，不要相信 `git add -A` 安全，不要相信之前没人提交过敏感文件。每一步都要用命令产出证据。

---

## 第 0 步：开工前的环境检查（不可跳过）

```bash
cd /d/vibe_coding_diet
git rev-parse --is-inside-work-tree 2>/dev/null || echo "当前不在任何 Git 仓库内"
git config user.name || echo "!! 未配置 user.name"
git config user.email || echo "!! 未配置 user.email"
git --version
```

- 如果输出不是"当前不在任何 Git 仓库内"，说明已有仓库，**停下来问我**。
- 缺少 user.name/email 就在**仓库本地**设置（不要动 `--global`）：
  ```bash
  git config user.name "你的名字"
  git config user.email "你的邮箱"
  ```
  **注意**：提交记录里的邮箱在公开仓库里可见。不希望暴露就用 GitHub 的 `noreply` 邮箱。
- 纯 Windows 本地开发：`git config core.autocrlf false`，避免 CRLF 被反复改写。

**禁止**：不得执行 `git clean`（任何变体）。它会连被忽略的 `.env` 一起物理删除且不可恢复。

---

## 第 1 步：加固 `.gitignore`（第一道闸）

### 1.1 先看现状

```bash
cat .gitignore
```

现有文件已包含 `.env`、`.env.local`、`.env.*.local`、`!.env.example` 等规则，**理论上已能挡住 `apps/server/.env`**。但我们要把它显式化和冗余化。

### 1.2 追加内容（**只追加，绝不覆盖**）

在文件**末尾追加**以下内容。原有行一行都不许改：

```gitignore

# === 环境变量与密钥（核心红线，勿删勿改）===
# 以下规则冗余但必要：显式锁定本项目唯一的环境文件
apps/server/.env
apps/server/.env.local
.env
.env.local
.env.*.local
!.env.example

# WorkBuddy 私有数据（会话记忆，绝不入库）
.workbuddy/

# 编译缓存
.swc/
.swc-cache/

# 编辑器与系统文件
.vscode/
.idea/
.DS_Store
Thumbs.db
```

### 1.3 用命令验证（要看到证据，不靠推理）

```bash
git init
git check-ignore -v apps/server/.env
```

**期望输出**类似：

```
.gitignore:9:.env	apps/server/.env
```

只要有输出、且末尾指向 `apps/server/.env`，就说明该文件被规则命中 ✅
**如果这条命令没有任何输出，说明 .gitignore 失效，立即停止并告诉我。**

再确认一次整体忽略清单：

```bash
git status --porcelain --ignored | grep '^!!' | head -20
```

必须看到 `apps/server/.env`、`node_modules/`、`dist/`、`.next/`、`.pnpm-store/`、`.local/`、`.workbuddy/`。

### 1.4 必须理解这一点（不要跳过）

`.gitignore` **不是强制锁**。以下三条命令都能绕过它把 `.env` 塞进暂存区：

```bash
git add -f apps/server/.env   # 强制添加
git add apps/server/.env      # 显式指定路径时，git 会警告但仍可执行
git add -A                    # 某些配置下会覆盖
```

所以光有 `.gitignore` 不够，**第 2 步的钩子才是真正的强制防线**。

---

## 第 2 步：安装 pre-commit 钩子（第二道闸，最关键）

这道闸会把 `.env` 防护从"记得做"变成"做不到"。

### 2.1 创建钩子脚本

新建文件 `scripts/git-hooks/pre-commit`（注意：**没有** `.sh` 后缀）：

```sh
#!/bin/sh
# 提交前强制拦截：环境文件与密钥
# 由 core.hooksPath 指向，对命令行与 GitHub Desktop 同时生效

echo "[hook] 正在执行提交前安全检查..."

# --- 检查 1：禁止提交任何环境文件（.env.example 除外）---
BLOCKED=$(git diff --cached --name-only --diff-filter=ACM \
  | grep -E '(^|/)\.env$|(^|/)\.env\.local$|(^|/)\.env\..*\.local$')

if [ -n "$BLOCKED" ]; then
  echo ""
  echo "[BLOCKED] 检测到环境文件被暂存，提交已中止："
  echo "$BLOCKED"
  echo ""
  echo "处理：git reset   然后检查 .gitignore 是否生效"
  echo "若必须提交该文件（极不推荐），请联系项目负责人，不要用 --no-verify。"
  exit 1
fi

# --- 检查 2：扫描暂存内容中的密钥 ---
if git diff --cached | grep -nEi \
  'AI_API_KEY[[:space:]]*=[[:space:]]*.+|AI_BASE_URL[[:space:]]*=[[:space:]]*.+|AI_MODEL[[:space:]]*=[[:space:]]*.+|DATABASE_URL[[:space:]]*=[[:space:]]*.+|sk-[A-Za-z0-9]{8,}|password[[:space:]]*=[[:space:]]*.+'; then
  echo ""
  echo "[BLOCKED] 暂存内容中包含疑似密钥，提交已中止。"
  echo "处理：git reset，修正文件后重新添加。"
  echo "若该 Key 已提交过，请立刻去服务商后台轮换（revoke）它。"
  exit 1
fi

# --- 检查 3：防止把构建产物塞进来 ---
BIG=$(git diff --cached --name-only --diff-filter=ACM \
  | grep -E 'node_modules/|/dist/|\.next/')

if [ -n "$BIG" ]; then
  echo ""
  echo "[BLOCKED] 检测到构建产物或依赖目录被暂存，提交已中止："
  echo "$BIG" | head -10
  exit 1
fi

echo "[hook] 检查通过"
exit 0
```

### 2.2 启用它

```bash
chmod +x scripts/git-hooks/pre-commit
git config core.hooksPath scripts/git-hooks
git config core.hooksPath
```

最后一条应输出 `scripts/git-hooks`。

### 2.3 当场验证钩子真的会拦

**不要等真出事才发现钩子没生效。** 立刻做一次演习：

```bash
git add -f apps/server/.env            # 故意强行加入被忽略的文件
git commit -m "hook 测试"               # 应当失败
```

- **期望**：commit 被拒绝，输出 `[BLOCKED] 检测到环境文件被暂存` ✅
- **如果居然提交成功了**：钩子没生效，停下来排查并告诉我，**不要继续后面的步骤**

演习通过后清理现场：

```bash
git reset                               # 清空暂存区，工作区文件不受影响
git status --porcelain --ignored | grep env
```

确认 `apps/server/.env` 回到 `!!`（已忽略）状态，文件本身仍在磁盘上。

### 2.4 一个重要说明

`core.hooksPath` 是**本地配置，不会随仓库分发**。所以：

- 脚本文件 `scripts/git-hooks/pre-commit` **会入库**（好事，公开后能体现你的安全习惯）
- 但换机器或重装后，需要重新执行一次 `git config core.hooksPath scripts/git-hooks`
- 请把这一条写进 README 的"开发须知"

---

## 第 3 步：首次 add（白名单，禁止 -A）

**绝不执行 `git add -A` / `git add .` / `git add *`。** 只按白名单逐条添加：

```bash
git add .gitignore .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml README.md
git add .workbuddy_html/
git add packages/
git add scripts/
git add apps/server/prisma/ apps/server/app/ apps/server/lib/ apps/server/scripts/
git add apps/server/package.json apps/server/tsconfig.json apps/server/next.config.ts apps/server/next-env.d.ts apps/server/.env.example
git add apps/miniprogram/src/ apps/miniprogram/config/ apps/miniprogram/types/
git add apps/miniprogram/package.json apps/miniprogram/tsconfig.json apps/miniprogram/babel.config.js apps/miniprogram/project.config.json
git add workflow/
git add PRD.docx 食刻AI_PRD_通俗版.md "a small prd.txt"
```

说明：

- `scripts/` 现在含钩子脚本，必须提交
- 不要 add `apps/server/.env`（只加 `.env.example`）
- `prompt.txt` 是空文件，我故意没加；想保留就自行补一行

---

## 第 4 步：三重扫描（第三道闸）

### 4.1 文件名层

```bash
git diff --cached --name-only
```

出现以下任一项立即中止并告诉我：任何 `.env`（唯一例外 `.env.example`）、含 secret/credential/token/key/password 的文件名、`*.pem`/`*.key`/`*.p12`/`*.keystore`、`dist/` 或 `.next/` 下的文件。

### 4.2 内容层

```bash
git diff --cached | grep -nEi 'AI_API_KEY\s*=\s*.+|AI_BASE_URL\s*=\s*.+|AI_MODEL\s*=\s*.+|DATABASE_URL\s*=\s*.+|sk-[A-Za-z0-9]{8,}|postgres(ql)?://[^"'\''[:space:]]*:[^"'\''[:space:]]+@'
```

**必须零输出**。有输出就 `git reset` 后回到第 3 步。

### 4.3 体积层

```bash
git diff --cached --name-only | xargs -I{} du -k "{}" 2>/dev/null | sort -rn | head -15
```

单个文本文件超 500KB、或出现 `node_modules/` `dist/` `.next/` 路径，立即中止。

---

## 第 5 步：执行首次提交

三重扫描全过后才提交。此时钩子也会再拦一次（双保险，正常不会触发）：

```bash
git commit -m "chore: 建立食刻 AI P0 项目基线

在 24 步实施计划启动前建立可回滚版本基线。
包含 monorepo 骨架、Taro/Next.js/Prisma 现有代码、
五个高保真原型(P01-P05)与 workflow 工作流文档。
含 pre-commit 密钥拦截钩子。
不含任何密钥与环境变量真值。"
```

---

## 第 6 步：提交后复验（第四道闸）

提交完立刻执行，**这一步不能省**——很多泄露是提交后才发现的：

```bash
echo "--- 1. 已跟踪文件总数 ---"
git ls-files | wc -l

echo "--- 2. 全历史密钥残留扫描（必须零输出）---"
git log -p --all | grep -nEi 'AI_API_KEY\s*=\s*.+|sk-[A-Za-z0-9]{8,}|DATABASE_URL\s*=\s*.+'

echo "--- 3. .env 是否曾入库（必须零输出）---"
git log --all --full-history --oneline -- apps/server/.env

echo "--- 4. .env 是否已被跟踪（必须零输出）---"
git ls-files | grep -E '(^|/)\.env$'

echo "--- 5. 本次提交清单 ---"
git show --stat HEAD | tail -25
```

五项期望：

1. 文件总数合理（预计 50–80 个）
2. 密钥扫描**零输出**
3. `.env` 历史查询**零输出**
4. `.env` 未被跟踪
5. commit 清单不含 node_modules / dist / .next

任一项不符，**立刻告诉我，不要自行修复历史**。

---

## 第 7 步：向我汇报

```
【初始化结果】
- Git 版本 / 默认分支：
- 用户身份配置：
- 本次提交 SHA：
- 跟踪文件总数：
- 仓库体积（du -sh .git）：

【.env 防护五道闸核查】
- 闸1 .gitignore：git check-ignore 输出 / 失效
- 闸2 pre-commit 钩子：演习是否成功拦截 / 未生效
- 闸3 提交前扫描：零输出 / 命中 N 处
- 闸4 提交后复验：.env 是否曾入库（否/是）
- .env 文件是否仍安全存在于磁盘：是/否
- .env.example 是否保持空值：是/否

【已入库内容】
- workflow/ 文档：N 个
- .workbuddy_html/ 原型：N 个
- scripts/git-hooks：N 个
- 源码与其他：

【异常与待办】
（无也要写"无"）
```

---

## 泄露急救（扫描真命中了，按此顺序）

1. **先不要提交**，`git reset` 清空暂存（工作区文件不变，`.env` 不会丢）
2. 修正 `.gitignore` 或 add 清单
3. **如果已经 commit 了**：
   - 历史里已有密钥，删文件没用
   - **立刻去模型服务商后台 revoke / 轮换那个 Key**——这比改 Git 历史重要得多
   - 再处理历史：单次提交用 `git reset --soft HEAD~1` 撤销
4. **如果已经 push 了**：
   - 公网已被爬，GitHub 上有机器人专门秒扫新提交找密钥
   - **第一优先级仍是轮换密钥**，改历史是第二位
   - 不要为了"抹掉记录"去 force push 或删库，除非先确认密钥已轮换

**绝不许用 `--no-verify` 绕过钩子。** 它存在的意义就是让你停下来想清楚。

---

## 转公开前的最终核查（第五道闸）

项目完成后要把私有仓库转公开时，**必须先跑这套检查**：

```bash
echo "--- 1. 全历史环境文件扫描（必须零输出）---"
git log --all --full-history --name-only --pretty=format: | sort -u | grep -E '(^|/)\.env'

echo "--- 2. 全历史密钥内容扫描（必须零输出）---"
git log -p --all | grep -nEi 'AI_API_KEY\s*=\s*.+|sk-[A-Za-z0-9]{8,}|DATABASE_URL\s*=\s*.+'

echo "--- 3. 确认 .env 从未被跟踪（必须零输出）---"
git log --all --full-history --oneline -- '*.env' | grep -v example

echo "--- 4. 列出全部曾出现过的文件路径，人工过一遍 ---"
git log --all --pretty=format: --name-only | sort -u | head -100
```

四项全部零输出，才可以在 GitHub Settings → Danger Zone → Change visibility 转公开。

**如果第 1、2、3 项任何一项有输出**：说明历史里有泄露，转公开等于把密钥公布。此时：

- 若还没 push 过：本地重写历史即可
- 若已 push：**先轮换密钥**，再用 `git filter-repo` 或 BFG 清理历史，最后 force push
- 清理完仍建议轮换一次，因为可能已被爬

另外转公开前还要人工确认两件事：

- `.workbuddy_html/` 里的 P01–P05 原型是否愿意公开（它们是你的设计资产）
- README 是否已改写成给陌生人看的项目介绍（背景、80 小时 MVP 定位、AI/规则边界、如何运行、评测数据在哪）

---

## 后续：每完成一个实施步骤就打一次存档

```bash
git add -u                      # 只加已跟踪文件的改动，不会误加新文件
git add <该步新增的文件路径>     # 新增文件必须显式点名
git diff --cached --name-only   # 看一眼清单
git commit -m "step-N: <一句话说明本步完成的内容>"   # 钩子会自动再查一次
```

打里程碑标签：

```bash
git tag -a before-step-N -m "步骤 N 执行前的存档"
```

回滚：

```bash
git reset --hard before-step-N    # 会丢弃之后的改动，执行前我会再确认一次
```

---

## 铁律清单（再读一遍）

1. 不执行 `git clean`（任何变体）——会删掉 `.env` 且不可恢复
2. 不执行 `git add -A` / `git add .` / `git add *`
3. 不执行 `git add apps/server/.env`，也不执行 `git add -f` 加任何环境文件
4. **绝不使用 `--no-verify` 绕过钩子**
5. 不修改 `.gitignore` 原有行，只追加
6. 不修改、不读取、不输出 `.env` 的文件内容，只验证它"被忽略且未被跟踪"
7. 不执行任何形式的 `push` / `force` / 远程操作，除非我明确要求
8. 五道闸任何一道不过，就停下问我
9. 每一步都用命令产出证据，不靠推理下结论

---

# 附录：配合 GitHub Desktop 使用

## 结论

**命令行负责"建仓 + 钩子 + 安全检查"，GitHub Desktop 负责"日常存档和查看历史"。**

底层仓库完全通用。但内容级密钥扫描在 GUI 里做不了——不过**第 2 步装的钩子对 GitHub Desktop 同样生效**，因为它最终也是调用 git 提交。这是钩子相对于"记住手动扫描"的最大优势。

## GitHub Desktop 的坑

### 坑 1：Changes 面板默认全勾选

等价于 `git add -A`。每次 Commit 前**手动取消勾选**不该提交的文件。

好消息：被 `.gitignore` 忽略的文件它根本不显示，`.env` 天然不可见。

### 坑 2：没有内容级扫描

GUI 不告诉你文件里有没有 `AI_API_KEY=sk-xxxx`。**但有钩子兜底**——所以真正的安全靠的是第 2 步，不是你的记忆。

### 坑 3：Publish 时默认公开（最危险）

"Publish repository" 里的 "Keep this code private" **默认未勾选**，即默认推成公开仓库，与"全程私有、最后转公开"策略相反。

**改走这条路**：

1. GitHub 网页 → New repository
2. 显式选 **Private**
3. **不要勾选** README / .gitignore / license（仓库必须完全空白）
4. 命令行关联推送：

```bash
git remote add origin https://github.com/<用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

### 坑 4：钩子的 hooksPath 在新环境要重配

换机器后执行 `git config core.hooksPath scripts/git-hooks` 才生效。写进 README。

## 打开已有本地仓库

GitHub Desktop → `File` → `Add Local Repository...` → 选 `D:\vibe_coding_diet`。若提示 "not a git repository"，说明 `git init` 没成功，回命令行排查。

## 额外注意

- GitHub Desktop 会自动用 GitHub 账号配置身份，**提交记录里的邮箱是公开的**，不想暴露就用 `noreply` 邮箱
- **别点 "Discard changes"**，丢弃工作区修改且不可撤销
- GUI 没有 `git clean` 入口，那个最大的雷反而不会误触

## 一句话版本

> 建仓、钩子、查密钥用命令行；日常存档和看历史用 GitHub Desktop；关联远端先去网页建私有仓库；转公开前必跑第五道闸。
