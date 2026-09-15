# 用 VS Code 做 Git 提交与推送：完整操作手册

> 项目：D:\vibe_coding_diet（食刻 AI）
> 适用：Windows + VS Code（已登录 GitHub 账号）
> 前提：先看 `git-checkpoint-prompt.md` 理解五道闸，本文件是它在 VS Code 里的落地步骤。

---

## ⚠️ 开工前必须先搞清楚的三件事

### 1. 你登录了 GitHub 账号 ≠ 提交身份已配置

这是最常见的误解。VS Code 的 GitHub 登录只用于 Settings Sync、Pull Requests、Publish to GitHub 这些功能。**真正写进提交记录里的作者信息，来自 `git config user.name` / `user.email`。**

如果没配置，第一次提交会直接失败，报错类似：

```
Author identity unknown
Please tell me who you are.
```

所以**阶段 1 必须先配置身份**，别指望登录账号能自动解决。

### 2. VS Code 的"智能提交"诱导弹窗（默认开启，建议关掉）

`git.enableSmartCommit` 默认值是 **false**（这点很好，不会自动 `git add -A`）。

**但 `git.suggestSmartCommit` 默认是 true** —— 当你没暂存任何文件就点提交时，它会弹窗：

> There are no staged changes to commit. Would you like to stage all your changes and commit them directly?
> `[Never]` `[Always]` `[Cancel]` `[Yes]`

手滑点了 `Yes` 或 `Always`，就等于执行了 `git add -A`，**你精心配置的白名单策略当场失效**。

**必须关掉它**，见阶段 0。

### 3. 不要用 VS Code 的 "Publish to GitHub"（重要）

这个功能会让你在 private / public 之间选（这点比 GitHub Desktop 强），但有**两个副作用**：

- 它可能**用新生成的空文件覆盖你已经加固好的 `.gitignore`**
- 它会让你"选择要包含在初始提交中的文件"，**没被选中的文件会被自动写进 `.gitignore`**

也就是说，你按五道闸策略精心写好的 `.gitignore`，可能被它悄悄改掉。

**改走这条路**：GitHub 网页建私有空白仓库 → VS Code 里 `Add Remote` → Push。见阶段 3。

---

## 阶段 0：VS Code 设置（一次性，必做）

按 `Ctrl + ,` 打开设置，在搜索框依次输入以下三项：

| 设置项 | 改成 | 默认值 | 为什么 |
| --- | --- | --- | --- |
| `git.enableSmartCommit` | **false**（取消勾选） | false | 保持默认即可，禁止无暂存直接提交 |
| `git.suggestSmartCommit` | **false**（取消勾选） | **true** ⚠️ | 关掉那个"要不要帮你 add -A"的诱导弹窗 |
| `git.postCommitCommand` | **none** | none | 别改成 `push` 或 `sync`，否则每次提交自动推送 |

> 这三项里**只有第二项是默认不符合你需求的**，最容易被忽略。

如果你更习惯直接改 JSON：`Ctrl + Shift + P` → 输入 `Preferences: Open User Settings (JSON)` → 加入：

```jsonc
{
  "git.enableSmartCommit": false,
  "git.suggestSmartCommit": false,
  "git.postCommitCommand": "none"
}
```

---

## 阶段 1：建仓与装钩子（VS Code 集成终端）

这部分**必须在终端里做**，VS Code 的图形界面没有"安装钩子"的入口。

### 1.1 打开集成终端并切到 Git Bash（本机需手动配置）

**本机情况**：Git 安装在 `D:\Program Files\Git`，不是默认的 C 盘位置。所以 VS Code 的配置文件下拉列表里**不会自动出现 Git Bash**，必须手动指定路径。

#### 报错长什么样

如果你看到这类错误，说明还在 PowerShell 里跑：

```
标记"||"不是此版本中的有效语句分隔符。
CategoryInfo : ParserError: (:) [], ParentContainsErrorRecordException
```

原因：`||` 在 PowerShell 5.1 里不是合法分隔符（7.0+ 才支持），`/dev/null` 也是 Unix 写法。**不要试图在 PowerShell 里硬跑 Unix 命令**，直接切 Git Bash。

#### 配置步骤（一次性）

1. `Ctrl + Shift + P` 打开命令面板
2. 输入 `Preferences: Open User Settings (JSON)`，回车
3. 在打开的 `settings.json` 里加入：

```jsonc
{
  "terminal.integrated.profiles.windows": {
    "Git Bash": {
      "path": "D:\\Program Files\\Git\\bin\\bash.exe",
      "args": ["--login", "-i"],
      "icon": "terminal-bash"
    }
  },
  "terminal.integrated.defaultProfile.windows": "Git Bash"
}
```

> 路径里的反斜杠必须写成双反斜杠 `\\`，这是 JSON 转义要求。

4. **完全关闭 VS Code 再重新打开**（改 profile 必须重启才生效）
5. `Ctrl + \`` 打开终端，看提示符是不是变成了 `$` 或带 `MINGW64` 字样

#### 验证是否切换成功

```bash
echo $SHELL
```

- 输出 `/usr/bin/bash` 或类似 → 成功 ✅
- 输出 `$SHELL` 原样、或提示 `PS D:\...>` → 还在 PowerShell，回第 3 步

#### 如果不想改设置（临时方案）

在 PowerShell 里手动进入 bash：

```powershell
& "D:\Program Files\Git\bin\bash.exe"
```

但这样嵌了两层 shell，容易混乱，**只适合救急**。建议还是按上面配置好。

#### 备选：直接开独立的 Git Bash 窗口

双击 `D:\Program Files\Git\git-bash.exe`，会弹出一个独立窗口。在里面 `cd /d/vibe_coding_diet` 也能干活，只是不在 VS Code 界面里。

> 为什么非要 Git Bash：钩子脚本是 `#!/bin/sh`，后面还要用 `grep`、`chmod`、`xargs` 这些 Unix 工具，PowerShell 里全都没有。

> **复制命令时的注意**：本手册的代码块都带 ` ``` ` 围栏。复制时**只选围栏内部的那几行**，不要把 ` ```bash ` 和结尾的 ` ``` ` 一起粘进终端——在 bash 里反引号是命令替换语法，会被解析成"执行 bash"，结果是套了一层子 shell，什么都不显示也不报错，很难排查。

---

### 1.1b 本机 Git 环境的一个注意点

`where git` 会返回两个路径：

```
C:\Users\suyy\.workbuddy\binaries\PortableGit\versions\...\git.exe   ← WorkBuddy 自带的便携版
D:\Program Files\Git\cmd\git.exe                                      ← 正式安装版
```

两个都能用，且共享同一份 `~/.gitconfig`（都在 `C:\Users\suyy` 下），所以配置不会错乱。但为避免版本差异带来的怪问题，建议**统一用 D 盘那个正式版**。

验证当前用的是哪个：

```bash
which git
```

期望输出 `/d/Program Files/Git/cmd/git.exe` 或 `/d/Program Files/Git/mingw64/bin/git.exe`。如果显示的是 PortableGit 路径，说明 PATH 顺序把便携版排在前面了，可以忽略（不影响本项目），也可以调整 PATH 顺序。

### 1.2 配置身份与换行符

```bash
cd /d/vibe_coding_diet
git config user.name "你的名字"
git config user.email "你的邮箱"
git config core.autocrlf false
```

**关于邮箱**：提交记录里的邮箱在公开仓库中**任何人可见**。不想暴露真实邮箱，去 GitHub → Settings → Emails，勾选 `Keep my email addresses private`，它会给你一个形如 `12345678+username@users.noreply.github.com` 的地址，把这个填进 `user.email`。

验证：

```bash
git config user.name
git config user.email
```

### 1.3 初始化仓库并加固 .gitignore

```bash
git rev-parse --is-inside-work-tree 2>/dev/null || echo "尚未初始化"
git init
git check-ignore -v apps/server/.env
```

最后一条**必须有输出**（显示哪条规则命中了 `apps/server/.env`）。没输出说明 `.gitignore` 失效，停下来排查。

然后按 `git-checkpoint-prompt.md` 第 1.2 节，向 `.gitignore` **末尾追加**加固内容（只追加，不改原有行）。

### 1.4 安装 pre-commit 钩子

按 `git-checkpoint-prompt.md` 第 2 节操作，关键三步：

```bash
mkdir -p scripts/git-hooks
# （用 VS Code 新建文件 scripts/git-hooks/pre-commit，内容照抄 prompt 里那份）

chmod +x scripts/git-hooks/pre-commit
git config core.hooksPath scripts/git-hooks
```

### 1.5 当场演习，确认钩子真的会拦

```bash
git add -f apps/server/.env
git commit -m "hook 测试"
```

**必须看到 `[BLOCKED] 检测到环境文件被暂存` 并且提交失败。** 如果居然成功了，钩子没生效，不许继续。

演习完清理：

```bash
git reset
git status --porcelain --ignored | grep env
```

确认 `apps/server/.env` 前面是 `!!`（已忽略状态），文件仍在磁盘上。

---

## 阶段 2：首次提交（图形界面）

### 2.1 打开源代码管理

`Ctrl + Shift + G`，或者点左侧活动栏的分支图标。

你会看到两个区域：

- **更改**（未暂存）
- **暂存的更改**（空）

**先确认一件事：`.env` 不在列表里。** 这是对的——被 `.gitignore` 忽略的文件 VS Code 根本不显示。看不到它就说明第一道闸在工作。

### 2.2 暂存：推荐用「暂存所有更改」，不要手动逐个点

> **本条已修订。** 早期版本要求"绝不用暂存所有"，那是**钩子还没装好时**的过渡措施。
> 现在钩子（阶段 1.4）已是强制防线，会把 `.env` 家族、密钥内容、构建产物全部拦下，
> 防线重心已从"手动挑文件"转移到"钩子强制拦截"。

**推荐做法**：点 "更改" 标题栏的 `+`（等价 `git add .`），**然后逐行核对清单**。

**为什么不推荐手动逐个点**：实测踩过坑——手动挑选时漏掉了
`apps/miniprogram/src/`（整个首页源码）、`apps/miniprogram/config/`（Taro 配置）、
`apps/server/app/api/`（健康检查接口）等**折叠起来的整个目录**，
差点做出一份缺了主源码的基线提交。这类遗漏极难察觉。

**用 `git add .` 的前提（缺一不可）**：

1. `.gitignore` 已按阶段 1.3 加固并验证
2. 钩子已安装、**且演习确认会拦**（阶段 1.5）
3. 提交前**人工过一遍清单**：`git diff --cached --name-only`

三条都满足时，`git add .` 反而比手动挑选更可靠——`.gitignore` 先过滤一轮，钩子再拦一轮。

**核对清单时重点看两件事**：

- 有没有混入产物：`node_modules/`、`dist/`、`.next/`、`*.tsbuildinfo`
- 有没有**漏掉整个目录**：对照 `git status --porcelain | grep '^??'`，
  逐个确认剩下的项到底是"故意不加"还是"不小心漏了"

完整清单应包含：

```
.gitignore  .npmrc  package.json  pnpm-workspace.yaml  pnpm-lock.yaml  README.md
.workbuddy_html/          ← 含 memory/ 设计记录
packages/
scripts/                  ← 含钩子脚本
apps/server/prisma/ lib/ scripts/ *.json *.ts .env.example
apps/server/app/api/      ← 容易漏：健康检查接口
apps/miniprogram/src/     ← 容易漏：整个页面源码
apps/miniprogram/config/  ← 容易漏：Taro 配置
apps/miniprogram/types/
apps/miniprogram/*.json *.js
workflow/
PRD.docx  食刻AI_PRD_通俗版.md
```

已知**故意不提交**：`prompt.txt`（空文件）。

### 2.3 提交

- 在上方消息框里写提交信息
- 按 `Ctrl + Enter`，或点消息框上方的 ✓

此时**钩子会在后台自动执行**。三种结果：

| 结果 | 表现 |
| --- | --- |
| 通过 | 提交成功，"更改"和"暂存的更改"清空 |
| 被拦 | 弹出错误通知，提交中止。点通知里的 **"打开 Git 日志"/"查看输出"** 能看到 `[BLOCKED] ...` 字样 |
| 钩子没跑 | 提交直接成功且没有 `[hook]` 相关输出 → 回到 1.5 重新检查 `core.hooksPath` |

查看钩子输出：`Ctrl + Shift + U` 打开"输出"面板，右上角下拉选 **Git**。

### 2.4 提交后复验

在终端里跑一次（对应五道闸的第四道）：

```bash
git log --all --full-history --oneline -- apps/server/.env
git log -p --all | grep -nEi 'AI_API_KEY\s*=\s*.+|sk-[A-Za-z0-9]{8,}'
git ls-files | grep -E '(^|/)\.env$'
```

**三条都必须零输出。**

---

## 阶段 3：推送到 GitHub

### 3.1 先在网页建私有仓库

1. 打开 github.com → 右上角 `+` → `New repository`
2. Repository name 填 `food-sense` 或 `vibe-coding-diet`
3. **选 Private**
4. **什么都不要勾**：不要 Add README、不要 Add .gitignore、不要 Choose license
5. 点 Create repository
6. 停留在生成的空白页，复制那个 HTTPS 地址（形如 `https://github.com/用户名/food-sense.git`）

### 3.2 在 VS Code 里添加远端

`Ctrl + Shift + P` → 输入 `Git: Add Remote` → 回车 → 粘贴刚才的 URL → 回车 → 输入远端名 `origin` → 回车。

或者命令行：

```bash
git remote add origin https://github.com/<用户名>/<仓库名>.git
git remote -v
```

### 3.3 首次推送

- 源代码管理面板右上角 `...` → `推送`
- 或者点 VS Code 底部状态栏的同步图标（那圈箭头）

首次推送时 VS Code 会问是否发布分支并设置上游，选**发布/Publish Branch**。

如果用命令行：

```bash
git branch -M main
git push -u origin main
```

推送需要 GitHub 身份认证。你已经登录过 VS Code，通常会直接通过；若弹出浏览器授权页，按提示确认即可。

### 3.4 确认推送结果

- 去 GitHub 网页刷新仓库页，确认文件都在
- **确认 `.env` 不在文件列表里**
- 确认仓库名旁边有 `Private` 标签

---

## 阶段 4：日常每步提交（24 步实施计划用）

每完成一个实施步骤、你自己验收通过后：

1. `Ctrl + Shift + G` 打开源代码管理
2. 看一遍"**更改**"列表 —— 有没有不该提交的文件混进来
3. 逐个点 `+` 暂存（新增的文件更要单独确认）
4. 消息框写：`step-N: 一句话说明本步完成了什么`
5. `Ctrl + Enter` 提交（钩子自动拦截检查）
6. **不要点"同步更改"** —— 那是 pull + push，单人开发只在阶段末推一次就够

打里程碑标签（终端）：

```bash
git tag -a before-step-N -m "步骤 N 执行前的存档"
```

回滚（会丢弃之后的改动，执行前想清楚）：

```bash
git reset --hard before-step-N
```

---

## 附录：Unix 命令 → PowerShell 对照

**强烈建议先切到 Git Bash，别长期用这张表。** 后面步骤里的 `grep`、`chmod`、`xargs`、`2>/dev/null` 在 PowerShell 里都没有等价物，硬绕会越来越痛苦。

| 手册里的写法（Git Bash） | PowerShell 等效 | 说明 |
| --- | --- | --- |
| `git rev-parse --is-inside-work-tree 2>/dev/null \|\| echo "未初始化"` | `git rev-parse --is-inside-work-tree` | 直接跑即可，报错本身就说明未初始化 |
| `cmd 2>/dev/null` | `cmd 2>$null` | 丢弃标准错误 |
| `cmd 2>&1 \| grep xxx` | `cmd 2>&1 \| Select-String xxx` | `grep` → `Select-String` |
| `A \|\| B` | `A; if ($LASTEXITCODE -ne 0) { B }` | PS 5.1 不支持 `\|\|` |
| `A && B` | `A; if ($?) { B }` | PS 5.1 不支持 `&&` |
| `chmod +x file` | 无需执行 | Windows 上 Git 不靠权限位判断钩子可执行 |
| `ls` | `ls` 可以 | PowerShell 有别名 |
| `cat file` | `Get-Content file` | `cat` 在 PS 里是别名，也能用 |
| `which git` | `(Get-Command git).Source` | |
| `xargs -I{} du -k {}` | `ForEach-Object { ... }` | 复杂管道建议直接切 bash |
| `echo $SHELL` | `$PSVersionTable` | 用来判断当前是哪个 shell |

**判断自己在哪个 shell 的最快方法**：看提示符。`PS D:\...>` 是 PowerShell，`$` 或 `MINGW64` 是 Git Bash。

---

## 常见坑速查

| 现象 | 原因 / 处理 |
| --- | --- |
| 粘进终端后没输出、也没报错，或提示符莫名其妙 | **把 markdown 的 ` ```bash ` 围栏一起复制了**。bash 里反引号是命令替换语法，` ```bash ` 会被当成"执行 bash"，等于套了一层子 shell。**只复制围栏内部的行** |
| 报 `标记"||"不是此版本中的有效语句分隔符` | 你在 PowerShell 里跑 Unix 命令。见阶段 1.1 切到 Git Bash |
| 报 `"2>/dev/null" 不是有效语句` | 同上，PowerShell 要写 `2>$null` |
| 下拉列表里找不到 Git Bash | Git 装在 D 盘，VS Code 扫描不到。按阶段 1.1 手动写进 settings.json |
| 提交时报 `Author identity unknown` | 阶段 1.2 的身份没配。VS Code 的 GitHub 登录不顶用 |
| 弹出"要不要暂存所有更改" | `git.suggestSmartCommit` 没关，回阶段 0 |
| `.env` 在更改列表里出现了 | `.gitignore` 失效，立刻 `git check-ignore -v apps/server/.env` 排查 |
| 提交被拦，提示 `[BLOCKED]` | **这是好事**，钩子在工作。按提示 `git reset` 后修正 |
| 提交成功但没看到 `[hook]` 输出 | 钩子没生效，检查 `git config core.hooksPath` |
| 换电脑/重装后钩子不拦了 | `core.hooksPath` 是本地配置，需重新执行 `git config core.hooksPath scripts/git-hooks` |
| 想强制提交被拦的文件 | **不允许用 `--no-verify`**。钩子的意义就是让你停下来想清楚 |
| 状态栏一直显示大量待提交文件 | 检查 `.gitignore` 是否漏了某个大目录 |

---

## 速查：常用快捷键

| 操作 | 快捷键 |
| --- | --- |
| 打开/关闭终端 | `Ctrl + \`` |
| 打开源代码管理 | `Ctrl + Shift + G` |
| 打开设置 | `Ctrl + ,` |
| 打开设置 JSON | `Ctrl + Shift + P` → `Preferences: Open User Settings (JSON)` |
| 命令面板 | `Ctrl + Shift + P` |
| 提交（在消息框内） | `Ctrl + Enter` |
| 打开输出面板 | `Ctrl + Shift + U` |

---

## 一句话版本

> 关掉智能提交建议 → 终端（Git Bash）建仓配身份装钩子并演习 → 图形界面手动逐个暂存 → 提交时钩子自动拦 → 别用 Publish to GitHub，去网页建私有仓库再 Add Remote。
