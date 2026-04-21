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

## Iteration 3：座椅碰撞/墙体/门洞避让 + 动态高低侧 + 长边贴墙 + 整体朝向

### 目标
- 碰撞扩展：seat-seat、seat-wall、seat-door（门洞通行区）
- 动态高侧/低侧：随“主位→屏幕”朝向变化，不再固定右侧
- 墙体吸附：门/窗/屏幕“长边贴墙”，必要时自动 90° 旋转
- 锚点移动：桌椅/座位整体调整朝向，保持相对关系（碰撞时仅做必要微调）

### 代码变更摘要
- Layout Engine：
  - 锚点吸附升级为“长边贴墙”（返回 width/height 可能交换）并用于角度计算：[snapAnchorToRoomWall](file:///workspace/web/src/domain/services/layoutEngine.ts)
  - 生成门洞通行留白（doorClearance）并在排座时避让：[buildDoorClearances](file:///workspace/web/src/domain/services/layoutEngine.ts)
  - 座位排布升级：
    - 同边均匀分布 + 多排（当同边座位过多时向外扩展多排）保持最小间距
    - 动态高低侧：根据朝向选择“面向屏幕的左/右侧”，多余座位优先落低侧
    - seat-seat 最小间距（最终迭代微调）+ seat-wall 夹紧： [layoutSeatsOnTables](file:///workspace/web/src/domain/services/layoutEngine.ts)
- 交互层：
  - 拖拽门/窗/屏幕释放时沿墙吸附（使用新的 snapAnchorToRoomWall 返回值）：[VenueCanvas.tsx](file:///workspace/web/src/ui/components/VenueCanvas.tsx)
- 单测：
  - 新增/扩展单测覆盖：长边贴墙、门洞避让、动态低侧重平衡：[layoutEngine.test.ts](file:///workspace/web/src/domain/services/layoutEngine.test.ts)

### 修改-测试循环
#### 第一次尝试（部分失败：lint）
- `npm run typecheck` → 通过
- `npm test` → 通过
- `npm run lint` → 失败（prefer-const）

修复动作：
- 将局部变量由 `let` 改为 `const`（仅属性变更不需要 let）

#### 第二次尝试（全部通过）
- `npm run typecheck` → 通过
- `npm run lint` → 通过
- `npm test` → 通过
- `npm run build` → 通过
