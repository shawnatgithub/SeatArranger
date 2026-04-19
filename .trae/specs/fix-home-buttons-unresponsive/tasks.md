# Tasks
- [ ] Task 1: 使用 Chrome DevTools MCP 复现与记录“无响应”行为
  - [ ] 使用 mcp_Chrome_DevTools_MCP.list_pages / select_page 选择首页页面
  - [ ] 调用 evaluate_script 检查首页 DOM 中“进入编辑/生成场地”按钮是否存在、disabled 状态是否为 false
  - [ ] 通过 click + wait_for + take_screenshot 记录点击后页面是否发生跳转/预览区是否更新

- [ ] Task 2: 修复“进入编辑”按钮点击无响应
  - [ ] 确认 onClick/onPointerUp 绑定是否在所有环境中触发（必要时兼容两者）
  - [ ] 修正可能导致事件被阻断的因素（如 type 属性缺失、外层 form 提交等）
  - [ ] 使用 Chrome DevTools MCP 再次点击按钮，验证项目被创建且 URL 变为 `/project/[id]`

- [ ] Task 3: 修复“生成场地”按钮点击无响应 / 不生成平面图
  - [ ] 检查 generateVenue → HomeVenueSimulator 的 props 传递是否正确（模板 id、seed 等）
  - [ ] 使用 evaluate_script 检查点击后 React state 中 generatedTemplateId / seed 是否更新
  - [ ] 若 Konva Stage 未显示，排查容器尺寸/初始渲染时机，并修复
  - [ ] 使用 Chrome DevTools MCP 再次点击按钮，确认“模拟现场”区域显示平面图

- [ ] Task 4: 完整回归验证
  - [ ] npm run typecheck
  - [ ] npm run lint
  - [ ] npm run build
  - [ ] 通过 Chrome DevTools MCP 完成一次“进入编辑”与一次“生成场地”的端到端验证并截图

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2, Task 3

