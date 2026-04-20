# Tests In Process（修改-测试循环记录）

## Iteration 1：统一模数（网格最小单元）+ 模拟现场可拖拽

### 目标
- “模拟现场”中的元素按统一模数构建
- 模数 = 网格系统最小单元格大小（gridSize=20）
- 确保“模拟现场”元素可拖拽/移动并网格吸附

### 代码变更摘要
- 统一模数（gridSize=20）：
  - 模板坐标与尺寸在 world 坐标系下对齐到 gridSize（位置/宽高均为 20 的整数倍）：[templates.ts](file:///workspace/web/src/domain/templates/templates.ts)
  - Layout Engine 输出的 room/elements/seats 全量对齐到 gridSize（包含锚点拖拽触发的旋转后再吸附）：[layoutEngine.ts](file:///workspace/web/src/domain/services/layoutEngine.ts)
  - 增加针对“所有 scene 坐标满足模数”的单测： [layoutEngine.test.ts](file:///workspace/web/src/domain/services/layoutEngine.test.ts)
- “模拟现场”交互：
  - 首页预览中的 VenueCanvas 改为 editable，并接入 onSeatDragEnd/onElementDragEnd/onSeatLabelDragEnd，形成可拖拽的交互闭环（本页预览态，不写入项目）：[HomeVenueSimulator.tsx](file:///workspace/web/src/ui/components/HomeVenueSimulator.tsx)
  - 通过给 HomeVenueSimulator 增加 key，在每次生成时重挂载以清空本地 overrides，避免 effect 触发 setState 规则： [page.tsx](file:///workspace/web/src/app/page.tsx)

### 测试执行与结果
#### 第一次尝试（失败：依赖未安装）
- `cd /workspace/web && npm run typecheck` → 失败（缺少 vitest 类型定义）
- `cd /workspace/web && npm run lint` → 失败（缺少 eslint 包）
- `cd /workspace/web && npm test` → 失败（vitest: not found）

修复动作：
- `cd /workspace/web && npm ci`（安装依赖）

#### 第二次尝试（部分失败：lint 规则）
- `npm run typecheck` → 通过
- `npm test` → 通过（新增 layoutEngine 模数测试通过）
- `npm run lint` → 失败（react-hooks/set-state-in-effect）

修复动作：
- 移除 effect 内同步 setState，改为通过组件 key 触发重挂载清空状态

#### 第三次尝试（全部通过）
- `npm run typecheck` → 通过
- `npm run lint` → 通过
- `npm test` → 通过
- `npm run build` → 通过

### 手工验证要点（说明）
- 首页点击“生成场地”后：
  - 网格仍为最底层
  - 元素/座椅/锚点可拖拽，松开后吸附到网格
  - 元素位置变化不会导致坐标出现非 20 倍数（由 Layout Engine/拖拽吸附保证）

手工验证截图：
- /data/tool/browser_snapshots/sim-draggable-hint.png

## Iteration 2：增强排布逻辑（碰撞/墙体吸附/桌边均匀座位）

### 目标
- 场地元素之间不可重叠或碰撞（至少保证桌子与桌子/锚点不重叠；座位落在桌边）
- 门/窗/屏幕等定位元素只能吸附墙体边线
- 桌子边上的座位均匀分布（同一条边间距一致）；若左右边座位不均衡，优先让“低侧”承载更多座位

### 代码变更摘要
- 布局引擎：
  - 增加桌子碰撞消解（桌子-桌子、桌子-锚点），迭代推开并夹紧到房间内：[layoutEngine.ts](file:///workspace/web/src/domain/services/layoutEngine.ts)
  - 锚点统一吸附墙体边线（引擎内默认/override 都会落到墙边）：[snapAnchorToRoomWall](file:///workspace/web/src/domain/services/layoutEngine.ts)
  - 座位重新排布到“最近桌子边缘”，并在同一边均匀分布；左右不均衡时将多余座位移动到右侧（低侧）:[layoutSeatsOnTables](file:///workspace/web/src/domain/services/layoutEngine.ts)
- 交互层：
  - 拖拽锚点（门/窗/屏幕）时仅沿墙体边线吸附：[VenueCanvas.tsx](file:///workspace/web/src/ui/components/VenueCanvas.tsx)

### 测试执行与结果
- 依赖补齐：`cd /workspace/web && npm ci` → 通过
- `npm run typecheck` → 通过
- `npm run lint` → 通过
- `npm test` → 通过（新增/更新布局引擎测试覆盖“桌边均匀座位”与“锚点变更触发布局重算”）
- `npm run build` → 通过
