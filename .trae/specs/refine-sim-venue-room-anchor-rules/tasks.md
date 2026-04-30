# Tasks
- [ ] Task 1: 扩展规则配置（门数量/边距/最小间隔）
  - [ ] 在 `venueRules.ts` 增加 `door.count`、`door.cornerInsetM`、`door.minGapM`（或等价字段）并给出默认值
  - [ ] 明确“屏幕/窗居中”的计算方式（按 room 尺寸与元素长度）

- [ ] Task 2: Step1 默认生成锚点（分墙 + 居中 + 两扇门）
  - [ ] 修改 `venueWizard.buildAnchors`：生成 `screen-1`、`window-1`、`entrance-1/entrance-2`
  - [ ] 确保 `screen.wall`、`window.wall`、`door.wall` 三者不同；两扇门在 `door.wall` 两端且不贴角
  - [ ] 默认生成阶段强制“长边贴墙”

- [ ] Task 3: 定位元素互斥（不可重叠）
  - [ ] 新增/改造锚点碰撞消解：至少覆盖门墙两扇门不重叠；并避免锚点之间重叠
  - [ ] 拖拽吸附后：若发生重叠，沿墙方向做最小位移消解（保持贴墙与长边规则）

- [ ] Task 4: Layout Engine 缺省锚点补全策略对齐
  - [ ] 调整 `layoutEngine` 的 auto-screen/auto-window/auto-entrance 生成：符合本 spec 的分墙/居中/两门策略
  - [ ] 保持“不重复生成”逻辑

- [ ] Task 5: 测试与验证
  - [ ] 新增/更新单测：三类分墙、长边贴墙、窗/屏幕居中、两扇门分布且不贴角、锚点不重叠
  - [ ] 本地验证 typecheck/lint/test/build 通过

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 1, Task 2
- Task 5 依赖 Task 1-4

