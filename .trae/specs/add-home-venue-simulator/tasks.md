# Tasks
- [x] Task 1: 首页新增“生成场地”按钮并接入模拟模块
  - [x] 在 web/src/app/page.tsx 新增按钮（与“进入编辑”并列）并绑定点击事件
  - [x] 点击事件读取当前模板选择，并触发“模拟现场”模块刷新
  - [x] 确认点击“生成场地”不写入项目列表、不跳转

- [x] Task 2: 新增“模拟现场”图形预览组件（模块化）
  - [x] 新增组件：web/src/ui/components/HomeVenueSimulator.tsx（或同等命名）
  - [x] 复用现有 Konva 画布组件（VenueCanvas）渲染模板元素与座位
  - [x] 支持三种状态：未生成占位 / 已生成展示 / 重新生成更新

- [x] Task 3: 首页样式调整（模块放到首页下方）
  - [x] web/src/app/page.module.css 增加“下方模块”样式（跨两列、响应式下正常排列）
  - [x] 新按钮布局（同一行并列，移动端可换行）

- [x] Task 4: 质量与验证
  - [x] npm run typecheck
  - [x] npm run lint
  - [x] 手工验证：模板切换 → 生成场地 → 展示更新；生成不创建项目；进入编辑仍正常

# Task Dependencies
- Task 1 depends on Task 2
- Task 3 depends on Task 1
- Task 4 depends on Task 1, Task 2, Task 3
