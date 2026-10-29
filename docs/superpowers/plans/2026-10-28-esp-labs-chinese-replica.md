# ESP Labs 简体中文复刻 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前工作区交付上游 ESP Labs 网站的完整简体中文单语言版本，保留全部 UI、路由、交互和浏览器本地状态。

**Architecture:** 以 `reyno2012-sudo/esp32-labs` 上游 React/Vite 应用为实现基线，先导入源码及公开数据，再在其既有 i18n、路由、设计 token 和组件边界上固定简体中文。保持 hash 路由与静态部署方式；通过上游已有测试、检查命令及生产构建验证整站。

**Tech Stack:** React 19、TypeScript、Vite、React Router（hash 路由）、i18next、TanStack Query、CSS Modules、Three.js、pnpm 11.10.0。

---

## 文件责任地图

当前工作区尚无应用文件。以下路径以 GitHub 上游的目录地图及 README 为依据；任务 1 导入源码后，实施者必须先核对真实文件名和脚本，再在同一职责范围内调整路径，不能另起一套应用。

- `package.json`、`pnpm-lock.yaml`、`vite.config.ts`：依赖与开发/构建/检查命令。
- `src/i18n/`、`src/locales/zh-CN/`（上游语言目录可能命名为 `zh`）：语言初始化、简体中文词条。
- `src/features/`：首页、导航、课程、引脚、代码阅读、工作台、设置等界面。
- `src/features/chip/`、`src/features/reference/`、`src/ui/parts/`、`src/ui/stage3d/`：芯片数据手册、参考书、零件图库与三维视图。
- `src/content/`、`src/labs/`、`src/domain/`：课程内容、模拟器和纯业务逻辑。
- `public/data/`、`public/`：工作台数据及静态资源。
- `src/**/__tests__` 或上游实际测试目录：语言配置和路由/状态回归测试。

## Task 1: 导入上游应用并记录可复现基线

**Files:**
- Create: 当前工作区中的上游跟踪文件与目录（保持原样）
- Inspect: `README.md`、`package.json`、`pnpm-lock.yaml`、`src/`、`public/`

- [ ] **Step 1: 获取上游源码**

从 `https://github.com/reyno2012-sudo/esp32-labs` 的 `main` 分支导入整个仓库到当前空工作区，保留其原始提交历史（若环境允许）。不要覆盖已存在的 `docs/superpowers/` 文件；导入前确认工作区目标仅含 `.git/` 与本计划/规格文档。

- [ ] **Step 2: 核对应用脚本与目录**

读取 `package.json`，确认 Node/pnpm 版本要求、`dev`、`check`、`build` 和测试脚本；列出 `src/i18n/`、`src/locales/`、路由入口、课程数据和模块页面的实际文件路径。若上游路径与文件责任地图不同，更新本计划内后续文件清单后再继续。

- [ ] **Step 3: 安装锁定依赖并记录基线结果**

使用仓库要求的包管理器执行锁文件冻结安装（README 当前要求 Node 24.14+ 与 pnpm 11），随后执行上游 `check` 和 `build`。记录失败项及环境原因，作为后续差异基线；不要用升级依赖来绕过失败。

- [ ] **Step 4: 提交导入基线**

```powershell
git add -A
git commit -m "chore: import upstream ESP Labs app"
```

## Task 2: 固定简体中文并移除语言切换

**Files:**
- Modify: `src/i18n/**` 中语言检测、初始化和资源注册文件
- Modify: `src/locales/**` 中语言注册与简体中文词条
- Modify: 显示语言选择器、语言菜单或语言参数的导航/设置组件
- Test: 上游实际测试目录中新增的 i18n 配置测试

- [ ] **Step 1: 写单语言配置失败测试**

新增测试，验证应用语言恒为 `zh-CN`（若上游 locale key 是 `zh` 则断言使用其既有 key）、可用语言列表只有简体中文，并且忽略 URL 中的 `?lang=en` 后仍使用中文。按上游测试框架与模块导入方式写测试。

- [ ] **Step 2: 运行测试确认失败**

运行上游测试脚本，仅执行新增测试。预期测试因仍注册多语言/读取 URL 语言参数而失败。

- [ ] **Step 3: 实现固定中文配置**

删除浏览器语言自动识别与查询参数语言覆盖；将 i18n 默认语言和回退语言设置为上游简体中文资源 key；资源注册仅包含简体中文；删除语言切换控件及关联的非中文菜单词条。保留 hash 路由自身 query 状态所需的其他查询参数。

- [ ] **Step 4: 移除其余语言资源**

删除非中文 locale 文件/目录和只服务于多语言切换的 locale 资源加载代码。中文仍使用原项目词条，不把芯片引脚名、代码标识符、命令、协议名称和标准单位翻译成非标准术语。

- [ ] **Step 5: 运行测试确认通过并提交**

```powershell
pnpm test
git add src
git commit -m "feat: fix interface language to simplified Chinese"
```

预期新增语言配置测试通过，应用中没有其他语言入口。

## Task 3: 核对所有页面入口与中文界面文案

**Files:**
- Modify: `src/features/**` 中可见页面与共享导航组件（只修改缺失或错误的中文文案/语言分支）
- Modify: `src/content/**` 中用户可见课程标题、说明和提示
- Test: 上游路由测试目录中新增关键路由覆盖

- [ ] **Step 1: 写关键路由失败测试**

为上游已有路由机制增加测试，覆盖首页、实验课程/课程详情、引脚图、代码阅读器、工作台、数据手册/参考阅读器、零件库和设置入口；断言每个路由能解析并显示中文页面标题或稳定的页面标识。优先复用上游 route manifest/loader 测试，不在测试中复制路由表。

- [ ] **Step 2: 运行测试确认缺口**

运行路由测试，确认缺少路由、加载器或中文标签时按预期失败；如果所有现有路由已通过，则保留测试作为回归保护。

- [ ] **Step 3: 修正页面标签与中文状态**

沿用原有页面组件、数据模型与 CSS，只补齐仍可见的英文界面控件文案及加载、空、错误状态中文文案。代码示例、固件输出、芯片型号和标准专有名词保留原文。不得用静态占位页替换现有功能组件。

- [ ] **Step 4: 执行并提交路由测试**

```powershell
pnpm test
git add src
git commit -m "feat: complete Chinese labels across app routes"
```

预期全部关键页面的路由测试通过。

## Task 4: 保留并回归课程、模拟器与本地状态

**Files:**
- Modify: `src/content/lessons/**`、`src/labs/**`、`src/domain/**`（仅修复语言固定后发现的回归）
- Modify: `src/features/progress/**`、`src/lib/storage*`（仅修复本地状态回归）
- Test: 上游课程、模拟器、进度与存储测试目录

- [ ] **Step 1: 为课程进度恢复补充失败测试**

依据上游真实存储 API，增加一个回归测试：完成一个课程步骤后可读取已完成状态，重新初始化应用状态时仍恢复该状态；不虚构新的数据结构或 storage key。

- [ ] **Step 2: 运行相关测试建立红灯**

执行该测试和受语言变更影响的课程/模拟器现有测试。预期新增持久化测试在尚未接入真实存储行为时失败；若现有实现已满足，则测试应绿并作为保护，不为制造失败而破坏原实现。

- [ ] **Step 3: 修复必要的回归**

只修复由单语言调整或导入导致的真实问题。确认课程步骤、模拟串口输入/输出、变体选择、最近访问和主题/进度仍走上游现有逻辑，并继续由浏览器本地存储保存。

- [ ] **Step 4: 运行受影响测试并提交**

```powershell
pnpm test
git add src
git commit -m "test: preserve lesson simulations and local progress"
```

预期受影响测试全部通过，静态数据与本地持久化行为维持上游实现。

## Task 5: 回归引脚/3D、数据手册、参考阅读和零件库

**Files:**
- Modify: `src/features/board/**` 或上游实际引脚图目录
- Modify: `src/features/chip/**`、`src/features/reference/**`、`src/ui/stage3d/**`、`src/ui/parts/**`
- Test: 相应模块已有的单元/组件测试；必要时补页面加载测试

- [ ] **Step 1: 明确本地与可选资料边界**

核对 `public/` 中 3D 模型/图片、数据手册章节数据、零件插图和参考文件；核对 `vite.config.ts` 是否由构建插件生成固件或参考 JSON。列出缺失的可选输入及上游降级文案，不将其误判为中文化缺陷。

- [ ] **Step 2: 为可选资料缺失状态写测试**

用上游现有 mock/loader 测试方式覆盖“资料不可用时显示中文局部说明且其余应用可加载”。测试需针对实际 error boundary 或模块 loader，不要 mock 整个应用。

- [ ] **Step 3: 维护原模块交互与样式**

确保引脚选择仍高亮引脚和关联课程；3D 板卡仍可旋转/缩放并显示标注；数据手册章节及引用仍可打开；参考书继续保存阅读勾选与继续阅读位置；零件库仍可浏览全部上游零件插图。只修改必要的中文文案和单语言分支。

- [ ] **Step 4: 运行模块测试并提交**

```powershell
pnpm test
git add src
git commit -m "test: preserve board datasheet and parts experiences"
```

预期相关测试通过，资料缺失时只影响对应可选模块。

## Task 6: 完成窄屏、无障碍、检查和生产构建

**Files:**
- Modify: `src/styles/**`、`src/features/**` 中由回归发现的响应式/焦点/降动效问题
- Modify: `README.md` 中启动、中文单语言和可选资料说明
- Test: 上游现有浏览器/e2e 测试目录（若项目包含）

- [ ] **Step 1: 增加或复用响应式关键路由巡检**

使用仓库已有浏览器测试工具，在桌面视口与 390px 视口逐一打开 Task 3 的关键路由，检查页面无横向溢出、导航和主要操作可用。若仓库没有浏览器测试基础设施，不新增大型依赖；用已有测试覆盖可验证的断点逻辑，并记录人工巡检页面清单。

- [ ] **Step 2: 修复发现的窄屏与无障碍问题**

修复实际出现的溢出、被遮挡控件、键盘焦点不可见或 `prefers-reduced-motion` 未被尊重等问题；保持上游 token 和布局结构。

- [ ] **Step 3: 更新中文项目文档**

在 `README.md` 中说明这是简体中文单语言版、启动命令、上游可选固件/参考资料的作用和缺失时的局部降级行为。确保命令与 `package.json` 当前 scripts 一致。

- [ ] **Step 4: 执行完整验证**

```powershell
pnpm check
pnpm build
```

预期类型检查、lint、测试与生产构建均退出码为 0。若 Node/pnpm 环境不满足 README 版本要求，记录准确版本和失败输出，不修改锁文件或升级依赖掩盖环境问题。

- [ ] **Step 5: 检查最终差异并提交**

```powershell
git diff --check
git status --short
git add README.md src
git commit -m "docs: document simplified Chinese ESP Labs app"
```

确认差异没有意外删除上游静态数据/插图，没有遗留语言选择器或非中文 locale 导入，并记录最终检查结果。

## 规格覆盖自检

- 单语言与无切换：Task 2。
- 首页、导航与全部关键路由：Task 3。
- 全部课程、模拟器、串口交互、本地进度：Task 4。
- 引脚图、3D、代码阅读器、工作台、数据手册、参考书、零件库：Task 3 与 Task 5（代码阅读器和工作台沿用上游组件，路由测试覆盖）。
- 缺资料局部降级：Task 5。
- 主题与本地状态恢复：Task 4。
- 390px 布局、键盘焦点、降低动态效果：Task 6。
- 类型、lint、测试和生产构建：Task 1 基线与 Task 6 最终验证。
