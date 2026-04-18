# 开发计划：快速排座（Web 版 Next.js MVP）

## Summary
- 目标：基于现有 PRD/任务书/insights，先交付一个 **Web 版（Next.js）会议快速排座 MVP**，覆盖“模板 + 人员录入/CSV导入 + 自动排座 + 手动微调 + PNG 导出（免费：排队+水印）”完整闭环。
- 范围调整（已与你确认）：MVP **不做登录/会员/订阅/按次付费**，并且 **仅本地存储**（localStorage）；付费相关作为下一阶段计划保留。
- 核心技术决策（已与你确认）：Next.js（Web）+ npm；画布采用 Konva/react-konva。

## Current State Analysis
- 仓库当前仅包含产品/研发文档，位于 [docs/seat-arranger-prd.md](file:///workspace/docs/seat-arranger-prd.md)、[docs/seat-arranger-dev-tasks (1).md](file:///workspace/docs/seat-arranger-dev-tasks%20(1).md)、[docs/seat-arrangement-insights (1).md](file:///workspace/docs/seat-arrangement-insights%20(1).md)。
- 仓库中暂无现有代码工程（未发现 package.json / tsconfig / next.config 等），属于从 0 初始化工程。

## Assumptions & Decisions
- 平台：Web 版 Next.js 优先；未来若做微信小程序，将优先复用 domain/application 的纯业务逻辑。
- 存储：仅 localStorage（不含云同步）；因此“项目列表/历史项目”仅在当前浏览器可用。
- 账号/付费：MVP 不接入；但会在代码结构上预留能力（例如 ExportPolicy、MembershipPolicy 接口）。
- 免费限制：导出 PNG 采用“排队（10–20s 可配置）+ 水印”。
- 规则范围：会议场景优先实现 3 个策略：上级视察 / 客户到访 / 政府接待（对应 PRD 12.4）。

## Proposed Changes

### 1) 初始化工程（Next.js + TS + 质量基建）
**新增/修改文件（规划路径）**
- `/workspace/web/`：Next.js 工程根目录（使用 npm）
- `/workspace/web/package.json`：scripts（dev/build/lint/test）与依赖
- `/workspace/web/tsconfig.json`、`/workspace/web/next.config.*`、`/workspace/web/eslint.config.*`：基础配置
- `/workspace/web/README.md`：本地启动与常用命令

**实现要点**
- 启用 TypeScript
- 配置 ESLint（可选加上格式化工具；若引入需在 plan 执行阶段明确落地）
- 测试框架：优先使用 Vitest（domain/application 单测为主），UI 测试后置

### 2) 目录结构：按“Domain / Application / Adapters / UI”分层落地
**新增目录（规划路径）**
- `/workspace/web/src/domain/`：纯业务模型与规则引擎（不依赖 React）
- `/workspace/web/src/application/`：用例编排（导入、排座、导出）
- `/workspace/web/src/adapters/`：localStorage、文件导入、导出等适配
- `/workspace/web/src/ui/`：页面与组件

**边界规则**
- `ui -> application -> domain`
- adapters 以接口形式注入到 application（避免 domain 依赖浏览器/Next.js 环境）

### 3) Domain：模型、主位判定、策略规则、排座服务（可测试）
**新增文件（规划路径）**
- `src/domain/models/*`：Project、VenueElement、Seat、Person、Assignment、Strategy
- `src/domain/rules/*`：
  - MainSeatResolver：主位/主位区判定（参考 PRD 12.1）
  - MeetingStrategies：三种策略的 constraints + scoring（参考 PRD 12.4，insights 的可产品化规则补强）
- `src/domain/services/PlacementService.ts`：组合主位判定 + 策略 + 锁定逻辑，输出 assignments + explain + warnings

**关键行为（验收）**
- 未指定主宾/上级（roles vip/leader）时：按 PRD 要求禁止生成或明确提示
- 支持 lockedAssignments：锁定位在重排后不变化
- explain：关键人员（主宾/最高领导/主持/汇报人等）至少返回 1–3 条理由
- warnings：缺失关键锚点（门/屏幕/主位点）时给出降级提示

### 4) Templates：会议场地模板数据与可编辑锚点
**新增文件（规划路径）**
- `src/domain/templates/*.json|ts`：至少 6 个模板（PRD 4.2）
- 模板元素：Seat、Table、Entrance（带方向）、Screen、HostSeatAnchor（主位参考点）

**实现要点**
- 模板内的坐标系与朝向统一：为后续“进门左右”与“面向屏幕”计算提供稳定参考系（insights 1.3）
- 主位可由用户在 UI 显式标记并覆盖系统默认（PRD 12.1）

### 5) Application：用例层（项目、人员、导入、排座、导出、历史栈）
**新增文件（规划路径）**
- `src/application/usecases/*`
  - CreateProject / ListProjects / LoadProject / RenameProject / DeleteProject
  - ImportPeopleFromCsv
  - ArrangeSeats
  - ExportPng
  - SeatEditHistory（undo/redo）、LockSeat、SwapSeat

**实现要点**
- 用例只依赖 domain + adapters 接口
- undo/redo 最少 10 步（与 PRD 一致），优先覆盖 lock/swap/drag assignment 操作

### 6) Adapters：本地存储、CSV导入、导出策略（排队+水印）
**新增文件（规划路径）**
- `src/adapters/storage/LocalStorageAdapter.ts`
  - 版本化存储（schemaVersion），支持未来迁移
  - 自动保存策略（关键操作后写入，避免频繁写）
- `src/adapters/import/CsvPeopleImporter.ts`
  - 支持 PRD 6.1 字段：name, side, rank, roles, note
  - 逐行错误收集与部分成功
- `src/adapters/export/KonvaExporter.ts`
  - 基于 Konva stage 导出 PNG
  - 免费导出策略：排队（延迟）+ 水印（可配置开关与文案）

### 7) UI：页面流与交互（Konva 画布）
**页面（规划路径）**
- `src/ui/pages/projects`：项目列表（本地）
- `src/ui/pages/wizard`：新建向导（策略/模板/主位设置）
- `src/ui/pages/editor`：画布编辑（模板元素拖拽、缩放/平移、吸附）
- `src/ui/pages/people`：人员管理 + CSV 导入
- `src/ui/pages/result`：排座结果（锁定/交换/解释/告警）
- `src/ui/pages/export`：导出（排队倒计时、水印、下载）

**关键交互（验收）**
- 画布：拖拽移动、缩放/平移、网格吸附（先做网格，后续再做边界/中心线吸附）
- 排座：一键生成；锁定后重排不改变锁定位；支持交换；支持撤销/重做
- 导出：所见即所得；生成 PNG 并触发下载；免费版带水印且有排队等待

### 8) 测试与验证（自动化优先覆盖 Domain）
**新增文件（规划路径）**
- `src/domain/**/__tests__/*`：黄金用例（golden tests）
- `src/application/**/__tests__/*`：用例层集成测试（不依赖 UI）

**最低验收测试集**
- MainSeatResolver：不同模板锚点组合下主位判定正确
- PlacementService：锁定后重排不变；缺失锚点降级；主宾缺失提示
- CSV 导入：示例 CSV 正确解析；非法行能指出原因

### 9) 环境变量与可配置项文档（按你的要求：完整注释）
**新增文件（规划路径）**
- `/workspace/web/docs/environment.md`：集中说明所有可配置项、可选值、默认值、影响面与示例（全文带解释性注释）
- `/workspace/web/.env.example`：给出变量示例，并对每个变量写清用途

**计划纳入的配置项（示例）**
- `NEXT_PUBLIC_FREE_EXPORT_QUEUE_MS`：免费导出排队时长（默认在 10–20s 之间配置）
- `NEXT_PUBLIC_FREE_EXPORT_WATERMARK_TEXT`：水印文案
- `NEXT_PUBLIC_EXPORT_DPI_SCALE`：导出清晰度倍率（用于“标清/高清”预留）

## Verification Steps
- 安装依赖与启动：
  - `cd /workspace/web && npm ci`
  - `npm run dev`
- 静态检查：
  - `npm run lint`
  - `npm run typecheck`（若脚本提供）
- 测试：
  - `npm run test`
- 构建：
  - `npm run build`
- 手工验收脚本（覆盖 PRD 成功指标）：
  - 新建项目 → 选模板/策略 → 录入/导入 ≥30 人 → 快速排座 → 锁定/交换/撤销重做 → 导出 PNG（排队+水印）全流程 ≤ 2 分钟

## Phase 2 Backlog（后续迭代，不纳入本次 MVP）
- 登录与会员：引入账号体系后支持跨设备恢复（PRD 4.7）
- 支付：先订阅（月/年）后按次导出（你已选择的节奏）
- 云端存储：项目/人员/导出记录同步与权限控制

