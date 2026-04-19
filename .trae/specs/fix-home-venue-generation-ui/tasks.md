# Tasks
- [x] Task 1: 复现与定位（按钮空白 + 未生成平面图）
  - [x] 在深色模式环境复现首页按钮显示异常（截图所示空白按钮）
  - [x] 复现点击“生成场地”后“模拟现场”仍显示未生成的情况，并记录触发路径（首次/切换模板/重复点击）

- [x] Task 2: 修复前端显示问题（深色模式表单控件/按钮）
  - [x] 统一卡片区域的 `color-scheme` 与 `color` 策略，避免系统深色控件渲染导致白底不可读
  - [x] 为 secondary button / input / select 明确设置前景色，确保文字可见
  - [x] 回归验证：首页与项目编辑页均无“白底白字/控件发黑”问题

- [x] Task 3: 修复“生成场地”不生成平面图的问题
  - [x] 校正生成状态判断（避免 `seed` 的真假判断导致偶发不渲染）
  - [x] 确保 Konva 画布容器具备稳定尺寸（避免 0 高度导致画布不可见）
  - [x] 在点击事件后确保“模拟现场”模块切换到已生成状态并渲染平面图

- [x] Task 4: 验证与交付
  - [x] npm run typecheck
  - [x] npm run lint
  - [x] npm run build
  - [x] 手工验证：深色模式下按钮可见；点击生成后出现平面图；切换模板后仍能生成；不创建项目不跳转

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2, Task 3
