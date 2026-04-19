# Tasks
- [ ] Task 1: 架构深度评估与落地方案
  - [ ] 盘点现状：模板静态坐标、网格吸附在视图层、锚点与布局无依赖关系
  - [ ] 给出差距结论：无法可靠支持“锚点拖拽后自动重排”
  - [ ] 形成重构方案：保留 Konva 渲染层，引入 Layout Engine（参数化模板 + 可重算布局）

- [ ] Task 2: 引入中心原点 world 坐标系与网格
  - [ ] 定义 world↔canvas 坐标转换（中心为 0 点）
  - [ ] 网格渲染与吸附统一在 world 坐标空间完成
  - [ ] 保持现有缩放/平移行为不回退

- [ ] Task 3: Layout Engine（参数化模板）
  - [ ] 为每个模板定义参数化输入（房间尺寸、锚点集合、桌型参数、间距参数）
  - [ ] 输出标准化 Scene（room + anchors + elements + seats + metadata/zone）
  - [ ] 定义“模板已有锚点/默认锚点”的合并策略，避免重复

- [ ] Task 4: 锚点拖拽触发布局重算
  - [ ] 允许门/窗/主席台/屏幕锚点拖拽
  - [ ] 拖拽结束后更新锚点 override，并触发布局重算
  - [ ] 定义 override 优先级：锚点优先；手工拖拽座椅/桌子是否覆盖重算结果（需明确规则并实现）

- [ ] Task 5: 模板选项 / 场景策略联动评估与修复
  - [ ] 检查首页“模拟现场”生成链路是否使用最新模板与参数
  - [ ] 检查策略切换是否会正确影响排座输出与解释（placementService + meetingStrategies）
  - [ ] 补齐必要的联动：切换选项后模拟现场/排座预览可正确刷新

- [ ] Task 6: 输出规则说明文档
  - [ ] 在仓库根目录生成 HowSeatsArraged.md（按 spec 要求说明布局与座次规则）
  - [ ] 内容与代码实现保持一致，避免“文档与行为”偏离

- [ ] Task 7: 验证与交付
  - [ ] npm run typecheck
  - [ ] npm run lint
  - [ ] npm run build
  - [ ] 手工验证：中心原点网格正确；锚点拖拽后自动重排；元素吸附网格；切换模板/策略后生成正确

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 6 depends on Task 3, Task 5
- Task 7 depends on Task 2, Task 3, Task 4, Task 5, Task 6

