# Tasks
- [x] Task 1: 复现与记录“无响应”行为（Chrome DevTools MCP 不可用时使用 integrated_browser）
  - [x] 尝试使用 mcp_Chrome_DevTools_MCP.list_pages / select_page（该环境下报 Target closed）
  - [x] 使用 integrated_browser 验证首页 DOM 中“进入编辑/生成场地”按钮存在且可点击
  - [x] 通过 click + screenshot 记录点击后页面是否发生跳转/预览区是否更新

- [x] Task 2: 修复“进入编辑”按钮点击无响应
  - [x] 修复 Dev 资源跨域阻断导致的交互失效（next.config.ts 增加 allowedDevOrigins）
  - [x] 保持按钮为 type=button 且仅使用 onClick，避免重复触发
  - [x] 使用 integrated_browser 再次点击按钮，验证项目被创建且 URL 变为 `/project/[id]`

- [x] Task 3: 修复“生成场地”按钮点击无响应 / 不生成平面图
  - [x] 修复 Dev 资源跨域阻断导致的交互失效（next.config.ts 增加 allowedDevOrigins）
  - [x] 使用 integrated_browser 点击“生成场地”，确认“模拟现场”进入已生成状态并显示 Konva 平面图

- [x] Task 4: 完整回归验证
  - [x] npm run typecheck
  - [x] npm run lint
  - [x] npm run build
  - [x] 通过 integrated_browser 完成一次“进入编辑”与一次“生成场地”的端到端验证并截图

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2, Task 3
