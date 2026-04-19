# Tasks
- [x] Task 1: 画布网格系统（底层渲染）
  - [x] 在 VenueCanvas 增加网格渲染（可配置网格间距、颜色、透明度）
  - [x] 确认渲染层级：网格 < 房间轮廓 < 场地元素 < 座椅 < 人员图元
  - [x] 验证网格在不同缩放下仍可见且不遮挡元素

- [x] Task 2: 自动房间轮廓与默认构件生成
  - [x] 生成房间矩形轮廓（基于 canvas 尺寸与边距）
  - [x] 生成默认屏幕（左侧）、入口（底部左右）、窗（顶部居中，长度为房间宽度一半）
  - [x] 与模板元素合并策略：模板已有同类元素则不重复生成
  - [x] 视觉验收：轮廓/构件风格不喧宾夺主（stroke/透明度）

- [x] Task 3: 拖拽交互与网格吸附（座椅/场地元素/人员图元）
  - [x] 定义网格吸附函数（x/y 对齐到最近网格点；可配置吸附阈值）
  - [x] 座椅拖拽：拖拽结束时应用吸附并持久化到 seatOverrides
  - [x] 场地元素拖拽：为 elements 增加 overrides 存储结构并在渲染时应用
  - [x] 人员图元拖拽：实现“姓名标签/人员图元”可拖拽与吸附，并持久化其显示位置（不影响座椅归属）

- [x] Task 4: 兼容性与配置
  - [x] 首页预览与项目编辑页：确认网格/房间显示策略（默认开启，或仅编辑页开启）
  - [x] 确认移动端拖拽体验（触控拖拽 + 吸附）

- [x] Task 5: 验证与交付
  - [x] npm run typecheck
  - [x] npm run lint
  - [x] npm run build
  - [x] 手工验证：网格底层、房间轮廓正确、默认构件位置正确；拖拽吸附与持久化生效

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2, Task 3
- Task 5 depends on Task 1, Task 2, Task 3, Task 4
