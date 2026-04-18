# 「快速排座」项目开发任务书（MVP：会议版，微信小程序优先）

本文档面向研发团队，基于《seat-arranger-prd.md》与《seat-arrangement-insights.md》，给出**可执行的开发任务拆分**，强调：
- 模块化与模块间解耦
- 原子化任务（1–2 天粒度）
- 单元测试驱动开发（TDD 优先）
- Git 工作流与代码质量约束

---

## 一、总体目标

在微信小程序上实现「会议快速排座」MVP：
- 支持上级视察 / 客户到访 / 政府接待三类会议场景
- 支持场地模板选择与画布编辑、人员录入/导入、自动推荐座次 + 手动微调、导出 PNG
- 接入账号系统与订阅+按导出付费
- 规则引擎可解释、可覆盖（锁定/交换/重排）

---

## 二、架构设计与模块划分

### 2.1 分层架构

推荐自上而下分为四层（依赖方向：UI → Application → Domain；Adapters 通过接口注入）：

1. **Domain（领域层）**
   - 核心业务模型：Project / Venue / Seat / Person / Assignment / Strategy / Membership
   - 规则引擎：座次约束与打分、主位判定、策略选择
   - 导出模型：导出场景所需的纯数据结构（不包含平台 API）

2. **Application（用例层）**
   - 用例服务：新建项目、加载项目、导入人员、快速排座、锁定/交换座位、导出座次图
   - 事务/流程编排：调用 Domain + Storage + 导出/支付适配器

3. **Adapters（适配层）**
   - StorageAdapter：本地缓存 + 云端存储（如有）
   - WechatAdapter：登录、文件选择、图片保存、支付
   - CanvasAdapter：将 Domain 层的布局数据映射到画布渲染/交互

4. **UI（界面层）**
   - 页面与组件：项目列表、向导、画布编辑、人员管理、排座结果、导出与支付等
   - 状态管理（如使用 Zustand/MobX/轻量自研 store）

### 2.2 模块边界（以代码目录为例）

- `domain/`
  - `models/`（Project / Venue / Seat / Person / Strategy / Membership 等）
  - `rules/`（MeetingStrategies：上级视察 / 客户到访 / 政府接待）
  - `services/`（PlacementService / MainSeatResolver / RankingService）
- `application/`
  - `usecases/`（CreateProject / ImportPeople / ArrangeSeats / ExportLayout / PurchaseExport 等）
- `adapters/`
  - `storage/`（LocalStorageAdapter / CloudStorageAdapter）
  - `wechat/`（AuthAdapter / PaymentAdapter / FilePickerAdapter）
  - `canvas/`（CanvasRenderer / CanvasInteractionAdapter）
- `ui/`
  - `pages/`（Projects / Wizard / Canvas / Result / Membership / Settings）
  - `components/`（SeatMap / PersonList / StrategySelector / ExportDialog 等）
  - `store/`（全局/局部状态）
  - `hooks/`

模块间依赖规则：
- UI 不直接访问 WeChat 原生 API，而是只调用 Application / Adapters 的接口。
- Domain 不依赖任何第三方库（除少量工具库）。

---

## 三、原子化开发任务清单（按模块）

> 粒度控制在 1–2 个工作日内可完成，并且有明确验收标准与测试要求。

### 3.1 Domain 模块

**D1. 领域模型定义**
- 内容：
  - 定义 TypeScript 模型：Project / VenueElement / Seat / Person / Assignment / Strategy / Membership
  - 建立基础枚举：StrategyType、PersonSide（主/客）、MeetingRole、RankEnum 等
- 验收：
  - 所有模型有类型定义和必要的构造/验证函数
  - 含至少 1 组完整的“项目样例”数据（便于测试）

**D2. 职级与角色映射服务（Rank & Role Mapping Service）**
- 内容：
  - 支持 M1–M6 职级枚举与内部分值映射
  - 支持会议角色（leader/vip/hoster/presenter 等） → 权重
- 测试：
  - 对每个枚举输出正确分值
  - 同 rank 多人排序稳定（相同输入顺序输出不乱序）

**D3. 主位判定服务（MainSeatResolver）**
- 内容：
  - 输入：场地模板中的座位 + 定位元素（门/主席台/屏幕） + 用户手动标记的主位
  - 输出：主位 Seat 或主位区 Seat 集合
- 规则：
  - 若用户显式标记主位 → 优先使用
  - 否则按 PRD 中的优先级（主席位 → 主席台中心 → 面向屏幕前排中心 → 模板预设）
- 测试：
  - 针对有/无门、有/无屏幕、有/无主席台的模板各写 1–2 个案例

**D4. 会议策略规则实现（MeetingStrategies）**
- 内容：
  - 为上级视察 / 客户到访 / 政府接待分别实现：
    - 硬约束集合（Constraints）
    - 软偏好打分规则（Scoring）
  - 输出统一的规则接口：`apply(project, people, seats) => CandidatePlacement`（不含锁定）
- 测试：
  - 为每种策略至少写 2–3 个“黄金用例”，包含：主宾缺失、主位缺失、锁定冲突等情况的行为。

**D5. 排座服务（PlacementService）**
- 内容：
  - 组合主位判定 + 策略规则 + 锁定逻辑，生成最终 `Assignment[]`
  - 支持：
    - 锁定座位后重排不变
    - 输出 explain/warnings
- 测试：
  - 确认锁定 seat 后重排 assignment 不变
  - 确认 explain 至少为关键人员返回非空理由

### 3.2 Application 用例层

**A1. 新建/管理项目用例**
- 内容：
  - `CreateProject`：按向导输入创建 Project
  - `ListProjects`、`LoadProject`、`ArchiveProject` 等
- 验收：
  - 可创建/加载/归档项目，数据结构正确写入 StorageAdapter

**A2. 人员管理与 CSV 导入用例**
- 内容：
  - 手动新增/编辑/删除人员
  - 按 PRD 中定义的 `people_import_template.csv` 解析导入
  - 提供导入结果：成功条数/失败条数+原因
- 测试：
  - 正确解析示例 CSV、中英文名混合、非法行处理

**A3. 快速排座用例（ArrangeSeatsUseCase）**
- 内容：
  - 调用 Domain 层 PlacementService 完成一轮排座
  - 输入：当前 Project + People + Strategy + 锁定信息
  - 输出：Assignment + explain + warnings
- 验收：
  - 接口不依赖 UI 细节（只使用领域模型）
  - 可在 Node 环境单独运行单测

**A4. 锁定/交换/撤销重做用例**
- 内容：
  - 提供接口：lockSeat / unlockSeat / swapSeat / undo / redo
  - 内部维护简单的操作历史栈
- 测试：
  - 连续执行多次 swap/lock 后 undo/redo 序列正确

**A5. 导出座次图用例（ExportLayoutUseCase）**
- 内容：
  - 输入：Project + Assignments + 导出参数（清晰度/是否显示姓名等）
  - 输出：一份 CanvasLayoutDTO（由 CanvasAdapter 渲染，再交给 WeChat 导出）
- 验收：
  - 与 Domain/CanvasAdapter 解耦，不直接调用小程序 API

**A6. 支付与权限校验用例**
- 内容：
  - 订阅（月/年）与按导出次数购买
  - 提供：`canExportHD(user, project)` 判断是否允许高清无水印导出
  - 记录消费日志，关联订单信息

### 3.3 Adapters 层

**AD1. StorageAdapter（本地/云端）**
- 内容：
  - 定义接口：`getProjectList / saveProject / getProject / archiveProject`
  - 提供本地实现（小程序本地存储），云端可后置

**AD2. WechatAdapter.Auth**
- 内容：
  - 微信登录封装：获取 openid/unionid（视策略）
  - 暴露给 Application 的 `getCurrentUser()` 接口

**AD3. WechatAdapter.Payment**
- 内容：
  - 统一封装订阅和按次支付调用
  - 统一订单状态（成功/失败/取消）

**AD4. CanvasAdapter**
- 内容：
  - 把 Domain 中 Seat/Element 坐标转换为画布上的渲染对象
  - 提供接口：`render(layoutDTO)`、`exportToImage()` 等

### 3.4 UI 层

**U1. 项目列表页**
**U2. 新建项目向导（场景/模板/主位设置）**
**U3. 画布编辑页（场地 + 定位元素拖拽 + 主位标记）**
**U4. 人员管理与导入页面**
**U5. 排座结果页（换位/锁定/解释展示）**
**U6. 导出与支付页面**

每个 UI 任务需声明：
- 对应 Application 用例
- 所需的 Store/状态切片
- 成功/异常状态（加载中、空数据、错误提示）

---

## 四、测试驱动开发（TDD）与覆盖要求

### 4.1 Domain 层
- 使用 Jest/Vitest（按工程统一选择）
- 要求：
  - 覆盖率：Domain 文件行覆盖率 ≥ 80%
  - 关键模块（MainSeatResolver / PlacementService / MeetingStrategies）需有“黄金用例”测试：
    - 上级视察：上级未勾选主宾时禁止排座
    - 客户到访：主宾主位、主方接待靠近入口
    - 政府接待：对称与稳妥的座次分布

### 4.2 Application 层
- 对主要用例编写单元/集成测试：
  - ArrangeSeatsUseCase：给定项目+人员+策略 → 输出固定结果
  - ImportPeopleUseCase：校验 CSV 导入边界
  - ExportLayoutUseCase：输出的 DTO 与预期一致

### 4.3 UI 层
- MVP 阶段至少为关键组件/页面编写基础渲染测试（可后置），重点先放在 Domain + Application。

---

## 五、Git 策略与协作流程

### 5.1 分支策略（Trunk-based）
- 受保护主分支：`main`
  - 必须通过 CI
  - 必须经至少 1 人 code review
- 功能分支：
  - `feat/domain-placement-service`
  - `feat/ui-canvas-editor`
  - `fix/...`，`chore/...` 等

### 5.2 Commit 规范
- 使用 Conventional Commits：
  - `feat: add placement service`
  - `fix: correct main seat resolver when no screen`
  - `test: add golden cases for customer visit`
  - `chore: update lint config`

### 5.3 PR 规范（每个原子任务对应 1 个 PR 为佳）
- PR 模板包含：
  - 变更说明
  - 关联任务编号（如使用 issue/任务管理）
  - 测试说明（新增/修改的测试用例）
- 不允许在 PR 中同时引入多个大模块（保持可审阅性）

### 5.4 CI 要求
- 强制跑：
  - Lint（ESLint）
  - 单元测试
  - TypeScript 类型检查

---

## 六、里程碑与任务分配建议

可沿用 PRD 中的 Sprint 0–3 划分，将上文原子任务按 Sprint 安排。例如：
- Sprint 0：工程化 + D1/D2 + Git/CI 落地
- Sprint 1：D3/D4/D5 + A1/A3 + 初版 CanvasAdapter
- Sprint 2：A2/A4/A5 + UI 项目/画布/人员管理
- Sprint 3：支付/会员相关用例与 UI，导出/排队体验打磨

具体人员分配可按前端/规则工程/基础设施拆分，此处不强制约束。

