# 智座 Demo 开发计划

## Summary
基于 [智座_Demo_PRD_V2.1.md](file:///e:/CodeX/Projects/SeatArranger/%E6%99%BA%E5%BA%A7_Demo_PRD_V2.1.md) 的五大模块，采用「纯函数领域层 → 状态层 → Feature 模块 → 应用外壳」四层架构。全部工作被拆解为 **62 个半日级（2–4h）原子任务**，每个任务遵循 Red-Green-Refactor：先在任务描述中给出的测试文件里写用例，再实现代码，最后重构。任何跨模块通信只经过 Store 或纯函数接口，UI 层严禁互相 import。

## 分层与解耦约束（强制）

| 层 | 目录 | 依赖方向 | 允许 import |
|---|---|---|---|
| L1 领域层（纯函数） | `src/domain/{geometry,layout,rules,scoring}` | 不依赖任何上层 | 仅 `types.ts` 与工具库 |
| L2 状态层 | `src/stores/{venue,guest,ui,history}` | 依赖 L1 | L1 + zustand/immer |
| L3 Feature 层 | `src/features/{venue,tables,guests,seating,export}` | 依赖 L1、L2 | L1 + L2 + antd/react-konva |
| L4 应用外壳 | `src/app/` | 依赖 L3 | L3 组件组合 |
| 通用工具 | `src/lib/{excel,image,storage}` | 独立 | 第三方库 |

**关键规则：**
- Feature 之间**禁止直接 import**，必须通过 Store 通信。
- Konva 组件只读 Store selector，不写 Store（写操作走 hook 或 command）。
- L1 每个函数必须是无副作用、可 tree-shake 的纯函数，坐标单位统一为米。
- 每个 PR 通过条件：新增/修改文件对应的测试全部通过 + `pnpm typecheck` + `pnpm lint`。

## 目录结构（固定，M0 落地）

```
src/
  app/                     # 步骤条 + 三栏布局
  features/
    venue/    tables/    guests/    seating/    export/
  stores/     venue.ts  guest.ts  ui.ts  history.ts
  domain/
    geometry/ coord.ts collision.ts snap.ts
    layout/   seatSlots.ts autoLayout.ts
    rules/    engine.ts constraints.ts
    scoring/  score.ts
  lib/        excel.ts image.ts storage.ts
  types/      index.ts (Venue/Table/Guest/GuestRelation/Constraint...)
  components/ (通用 UI)
  assets/icons/ (已存在)
tests/e2e/    playwright specs
```

## 里程碑与任务

任务 ID 格式：`M{里程碑}-{序号}`；每个任务标注 **依赖任务**、**测试文件**、**验收点**。所有测试文件命名遵循：单元 `*.test.ts`（`src/**/__tests__/`）、组件 `*.test.tsx`、E2E `tests/e2e/*.spec.ts`。

---

### M0 · 项目脚手架与基础设施（6 任务，1 天）

| ID | 任务 | 测试/验收 | 依赖 |
|---|---|---|---|
| M0-1 | `pnpm create vite` 初始化 React 18 + TS + SWC；配置 `tsconfig` strict、路径别名 `@/*` | `pnpm dev` 可启动；`pnpm typecheck` 通过 | — |
| M0-2 | 安装依赖：`konva react-konva zustand immer antd xlsx`；配置 antd ConfigProvider 中文 | 空页面渲染 `<Button>你好</Button>` 通过 RTL 冒烟测试 `App.test.tsx` | M0-1 |
| M0-3 | 配置 Vitest + RTL + jsdom；写 `sample.test.ts` 冒烟测试；CI 脚本 `pnpm test` | `pnpm test` 通过 1 个 dummy 用例 | M0-1 |
| M0-4 | 配置 Playwright；写 `tests/e2e/smoke.spec.ts` 打开首页检查 title | `pnpm e2e` 冒烟通过 | M0-2 |
| M0-5 | 配置 ESLint（Airbnb-TS）+ Prettier + husky pre-commit（typecheck+test 变更文件） | `pnpm lint` 通过；提交时钩子生效 | M0-1 |
| M0-6 | 在 `src/types/index.ts` 落地 PRD 五章全部 interface（Venue/VenueElement/Table/SeatSlot/Guest/GuestRelation/Constraint 等） | 类型编译通过；提供 `types.test-d.ts` 用 `expectTypeOf` 断言必需字段 | M0-1 |

---

### M1 · 领域层：几何与坐标（8 任务，2 天，纯 TDD）

所有任务位于 `src/domain/geometry/`，**零 React/Konva 依赖**。

| ID | 任务 | 测试用例（先写） | 依赖 |
|---|---|---|---|
| M1-1 | `coord.ts`: `metersToPixels / pixelsToMeters / konvaToMeters / metersToKonva` | scale=50 时 3.5m↔175px；stagePos+scale 组合还原验证（3 用例） | M0-6 |
| M1-2 | `coord.ts`: 旋转坐标 `slotToGlobal(slot, table)`（PRD §4.3.1） | rotation=0/90/180 三角函数正确；边界 rotation=45 | M1-1 |
| M1-3 | `geometry/venue.ts`: `isInsideVenue / constrainToVenue`（margin=0.2） | 边界内/外/贴边三用例；负值 clamp | M1-1 |
| M1-4 | `geometry/collision.ts`: 两矩形（含 rotation）AABB + OBB 相交检测 | 无旋转重叠、无旋转不重叠、45°旋转贴合三用例 | — |
| M1-5 | `geometry/collision.ts`: `resolveCollision`（PRD §4.2.4，尊重 locked） | locked 对方不动、当前 locked 不动、双方 free 时推开 | M1-4 |
| M1-6 | `geometry/snap.ts`: `snapToGrid(value, 0.5)` 软吸附阈值 0.15 | 3.55→3.5、3.7→保持、-0.1→0（clamp） | — |
| M1-7 | `geometry/snap.ts`: `getSnapLines / findNearestSnapLine`（六线对齐） | 两元素中心对齐、边缘对齐、超出阈值不返回 | — |
| M1-8 | 导出 `domain/geometry/index.ts` barrel；写 `README.md` API 说明 | 无新测试；tree-shake 检查通过 | M1-1..7 |

---

### M2 · 领域层：桌椅点位算法（4 任务，1.5 天）

`src/domain/layout/seatSlots.ts` — PRD §4.3.1 的动态点位算法。

| ID | 任务 | 测试用例 | 依赖 |
|---|---|---|---|
| M2-1 | `calculateSeatSlots` for `conference-long` / `training-desk` | 3m×1m + 8 椅：上下各 3、左右各 1；容量上限 clamp | M1-1 |
| M2-2 | `calculateSeatSlots` for `round`（圆桌沿圆周分布） | 直径 1.6m 时最大容量匹配公式；均匀角度 | — |
| M2-3 | `calculateSeatSlots` for `u-shape`（底部+左右翼三段） | 6m×4m + 14 椅：底部/左翼/右翼数量按边长比例；朝向角度 | M1-2 |
| M2-4 | `calculateSeatSlots` for `head`（主席台单侧） | 4m 台面 6 椅：全部 localY 在同侧；角度=180 | — |

---

### M3 · 领域层：自动布局与规则引擎（6 任务，2 天）

| ID | 任务 | 测试用例 | 依赖 |
|---|---|---|---|
| M3-1 | `layout/autoLayout.ts`: 汇报/培训/谈判/圆桌四种策略生成 Table[] | 15×10 会议室 40 人培训 → 6–10 桌均匀分布，不越界不重叠 | M1-3,M1-4,M2 |
| M3-2 | `autoLayout` 尊重 locked：屏幕锁定时以屏幕为中线对称；已锁桌子不动 | 锁定投影幕后 CTL 位置正确；锁定桌子位置字段不变 | M3-1 |
| M3-3 | `rules/constraints.ts`: DSL 构建器（isolate/adjacent/same-table/priority-front/priority-center） | 从 GuestRelation[] + PersonalTag 构造出预期 Constraint[] | M0-6 |
| M3-4 | `scoring/score.ts`: 按 PRD §4.4 逐条评分（相邻+20、隔离-40 等） | 20 人小场景手工计算 vs 函数输出一致；权重 VIP×3 生效 | M3-3 |
| M3-5 | `rules/engine.ts`: 贪心分配算法（PRD §6.4）+ 硬约束回溯降级 | 20 人 4 组关系 100% 满足硬约束；座位不足时未分配数正确 | M3-3,M3-4 |
| M3-6 | `rules/engine.ts`: 3 秒响应保证（性能测试） | 100 人 × 50 座位 benchmark ≤ 3s，断言 `performance.now()` | M3-5 |

---

### M4 · 状态层 Store（4 任务，1 天）

`src/stores/`，使用 zustand + immer，**Store 内不包含算法逻辑**，只调用 L1 函数。

| ID | 任务 | 测试用例 | 依赖 |
|---|---|---|---|
| M4-1 | `venue.ts`: Venue state + 元素 CRUD + 锁定切换 + 模板加载 | addElement/updateElement/removeElement/toggleLock；loadTemplate('medium') 后 tables.length 正确 | M1,M2,M3-1 |
| M4-2 | `guest.ts`: Guest CRUD + GuestRelation CRUD + 规则场景切换 + 自动排座 action | setGuests 后长度；addRelation 去重；autoAssignSeats 调用 M3-5 并写回 seatSlotId | M3-5 |
| M4-3 | `ui.ts`: currentStep/previewMode/selectedId | 步骤跳转不影响数据；预览模式切换 | — |
| M4-4 | `history.ts`: Command 栈（PRD §6.5），30 步上限，undo/redo 序列 | 连续 3 次 move → undo 3 次回到初始；超过 30 步丢弃最早 | M4-1 |

---

### M5 · 应用外壳与步骤条（3 任务，0.5 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M5-1 | `app/AppShell.tsx`：三栏布局（左侧/画布/右侧）+ 顶部 Steps 组件 | RTL：点击第 3 步后 `currentStep===3` | M4-3 |
| M5-2 | `app/CanvasStage.tsx`：4 层 Layer（grid/venue/furniture/overlay）骨架 | 快照测试 4 个 `<Layer>` 存在 | M4-1 |
| M5-3 | 键盘快捷键 hook `useHotkeys`（Ctrl+Z/Y、Delete、方向键微调、Esc） | RTL fireEvent keyDown 触发对应 store action | M4-1,M4-4 |

---

### M6 · Feature：场地画布（模块 1，8 任务，2 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M6-1 | `features/venue/RoomRect.tsx`：填充矩形+边框，用 metersToPixels 计算 | 组件测试：15×10 会议室渲染 750×500 rect | M5-2 |
| M6-2 | `GridLayer.tsx`：0.5m 网格背景，可开关 | 15×10 会议室渲染 31×21 条虚线 | M5-2 |
| M6-3 | `VenueElementShape.tsx`：拖拽+网格吸附+越界约束（复用 M1） | dragEnd 事件模拟，最终坐标经 snapToGrid + constrainToVenue | M6-1 |
| M6-4 | `WallAttachmentMenu.tsx`：悬浮 0.5s 显示 `+`、展开门/窗/屏三图标 | vi.useFakeTimers 推进 500ms 后按钮出现；3s 未操作自动收回 | M6-3 |
| M6-5 | 门/窗/屏拖拽到墙释放：吸附墙边 + 突出显示动画 0.3s | 释放后 element.y 与墙 y 差值 ≤ CHAIR_SIZE/2；locked=false | M6-4 |
| M6-6 | 减号删除交互（两次点击确认） | 首次点击进入高亮态，第二次点击才 remove | M6-4 |
| M6-7 | `LockIcon.tsx`：悬浮 0.5s 浮现 1.5s 自动隐藏；点击 toggleLock | 计时器序列断言 + 冒泡阻止；locked=true 后 draggable=false | M4-1 |
| M6-8 | `SnapLinesLayer.tsx`：拖拽时渲染六线对齐辅助线 | 拖拽两元素中心接近时 overlay 层出现 1 条 Line | M1-7,M6-3 |

---

### M7 · Feature：桌椅布局（模块 2，5 任务，1.5 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M7-1 | `TableShape.tsx`：绘制桌子矩形/圆/U 型/主席台 + 桌号 label | 4 种 type 快照；rotation=90 变换正确 | M4-1 |
| M7-2 | `ChairShape.tsx`：根据 `SeatSlot` 渲染椅子（含 isFreeFloating 分支） | 绑定态随桌子移动；解绑态使用 freeX/freeY | M2 |
| M7-3 | `AutoLayoutPanel.tsx`：人数/会议类型输入 + 一键生成按钮 | 输入 40 + "培训" 点击后 store.tables 长度 > 0 | M4-1,M3-1 |
| M7-4 | 拖拽桌子实时碰撞高亮（红色闪烁），释放后弹开到合法位置 | mock 一张锁定桌子 + 拖拽入侵桌子 → dragEnd 后 x 被推开 | M1-5,M7-1 |
| M7-5 | 双击椅子 → 解绑/绑定切换；解绑后独立拖拽 | 双击后 slot.isFreeFloating=true；再次双击回到最近空点位 | M7-2 |

---

### M8 · Feature：参会者管理（模块 3，4 任务，1 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M8-1 | `lib/excel.ts`：`importXlsx / exportXlsx`（SheetJS，多编码兜底） | 提供 fixtures/guests.xlsx，解析 20 行；UTF-8/GBK 均成功 | M0-2 |
| M8-2 | `GuestList.tsx`：列表 + 搜索 + 筛选（未分配/已分配/VIP/冲突） | 输入"张" 只保留匹配项；点击筛选切换正确 | M4-2 |
| M8-3 | 拖拽参会者卡片到座位/桌子/背景 → 分配/取消 | 使用 react-dnd 或 HTML5 DnD；dragEnd 后 guest.seatSlotId 变更 | M4-2,M7-2 |
| M8-4 | 关系设置弹窗（选择关联参会者 + 关系类型），保存到 GuestRelation | 保存后 store.relations 长度+1；重复关系去重 | M4-2 |

---

### M9 · Feature：规则排座（模块 4，4 任务，1 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M9-1 | `RuleScenePanel.tsx`：企业/政府/通用切换 + 规则说明展示 | 切换后 store.ruleScene 变更；文案随场景切换 | M4-2 |
| M9-2 | 一键智能排座按钮 + 3 秒进度动画 | 触发 autoAssignSeats；> 2s 显示进度 | M3-5,M3-6 |
| M9-3 | 座位颜色：绿/黄/红 based on `guest.satisfaction` + 冲突角标 | 20 人预置场景断言颜色分布；冲突 guest 显示 ⚠ | M3-4 |
| M9-4 | `ConflictList.tsx`：冲突列表 + 点击定位到画布座位（滚动+闪烁） | 点击后 selectedId 更新；Konva stage 平移到目标位置 | M9-3 |

---

### M10 · Feature：导出预览（模块 5，4 任务，1 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M10-1 | 预览模式：隐藏 grid/overlay/lock 图标，画布全宽 | 切换 previewMode 后 grid Layer 不渲染 | M4-3 |
| M10-2 | `lib/image.ts`：`exportStageToPNG(stage, {pixelRatio:2})` + 命名规则 | mock Konva stage 调用 toDataURL；文件名匹配正则 | M5-2 |
| M10-3 | Excel 名单导出（按桌号排序 6 列） | fixture 20 人生成 xlsx，parse 后行数=20，列顺序正确 | M8-1 |
| M10-4 | 扫码查座输入框：姓名 → 结果卡片 + 平面图高亮 | 输入"张明远" 后卡片显示"主席台"；高亮 seatSlotId 匹配 | M4-2 |

---

### M11 · 持久化与预置数据（3 任务，0.5 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M11-1 | `lib/storage.ts`：500ms debounce 写 localStorage + schemaVersion=2 迁移 | schemaVersion 不匹配时清空；QuotaExceededError 捕获后 toast | M4 |
| M11-2 | Store 订阅变更自动持久化；启动时恢复 | 修改 venue 后 500ms 内 localStorage 有值；reload 后状态恢复 | M11-1 |
| M11-3 | "加载演示数据"按钮：中型模板 + 20 人 + 4 组关系，自动跳步骤 2 | 点击后 store 状态与 PRD §6.8 一致；currentStep=2 | M4-1,M4-2 |

---

### M12 · E2E 与部署（3 任务，0.5 天）

| ID | 任务 | 测试 | 依赖 |
|---|---|---|---|
| M12-1 | `e2e/full-flow.spec.ts`：模板→加数据→生成布局→排座→导出 PNG 全流程 | Playwright 单测覆盖 5 个步骤，总耗时 ≤ 3 分钟脚本超时保护 | 全部前置 |
| M12-2 | `e2e/attach-lock.spec.ts`：墙挂门/窗/屏 + 锁定交互 | 悬浮 500ms 后加号出现；拖拽释放后元素存在 | M6 |
| M12-3 | Vercel 部署：`vercel.json` + `pnpm build` 静态输出 + README 部署说明 | 部署 preview URL 可访问；lighthouse 性能 ≥ 80 | M12-1 |

---

## Test Plan（统一约束）

- **Red-Green-Refactor 强制流程：** 每个任务 PR 中第一 commit 必须只包含失败测试，第二 commit 才是实现。
- **覆盖率目标：** `src/domain/**` 100% 分支覆盖；`src/stores/**` ≥ 90%；`src/features/**` ≥ 70%；E2E 覆盖 PRD 八章验收标准全部 8 条。
- **性能测试：** M3-6（排座 ≤ 3s）、M12-3（Lighthouse）为硬性指标，未达标不合并。
- **CI：** GitHub Actions 三 job 并行 —— `typecheck` / `unit+component (vitest --run)` / `e2e (playwright)`。全绿才允许合并。
- **fixtures 目录：** `tests/fixtures/` 存放 `medium-room.json`、`guests-20.xlsx`、`guests-100.json`（性能测试用）。

## Assumptions

- 使用 pnpm 作为包管理器，Node ≥ 20。
- Vite 5 + React 18，无需 SSR；构建产物为纯静态。
- Playwright 只跑 Chromium（Demo 演示环境）；Safari/Edge 靠人工回归 PRD §7 兼容性条目。
- iPad 触摸手势（PRD §6.7）用桌面 Chrome DevTools 触摸模拟通过即算达标，不安排真机测试任务。
- Excel 导入最大 200 行、参会人数 ≤ 200 为算法性能边界，不做超大数据优化。
- 撤销栈上限 30（PRD §6.5），未安排"合并连续同类操作"高级优化。
- 若某个 M6/M7 任务发现 Konva 事件 API 无法覆盖测试，允许改用 `stage._fire` 私有 API 触发事件，并在 PR 中标注。

## 里程碑汇总

| 里程碑 | 任务数 | 预估工期 | 累计 |
|---|---|---|---|
| M0 基础设施 | 6 | 1.0d | 1.0d |
| M1 几何领域 | 8 | 2.0d | 3.0d |
| M2 点位算法 | 4 | 1.5d | 4.5d |
| M3 布局+规则+评分 | 6 | 2.0d | 6.5d |
| M4 Store 层 | 4 | 1.0d | 7.5d |
| M5 应用外壳 | 3 | 0.5d | 8.0d |
| M6 场地画布 | 8 | 2.0d | 10.0d |
| M7 桌椅布局 | 5 | 1.5d | 11.5d |
| M8 参会者管理 | 4 | 1.0d | 12.5d |
| M9 规则排座 | 4 | 1.0d | 13.5d |
| M10 导出预览 | 4 | 1.0d | 14.5d |
| M11 持久化+预置 | 3 | 0.5d | 15.0d |
| M12 E2E+部署 | 3 | 0.5d | 15.5d |
| **合计** | **62** | **≈15.5 人日** | |

**关键路径：** M0 → M1 → M2/M3 并行 → M4 → M5 → (M6/M7/M8 并行) → M9 → M10 → M11 → M12。M8 可与 M6/M7 完全并行开发（不共享代码路径），单人开发时按顺序，双人时可将 M8+M10 剥离。
