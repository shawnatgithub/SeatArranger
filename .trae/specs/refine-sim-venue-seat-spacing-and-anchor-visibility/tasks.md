# Tasks
- [x] Task 1: 统一“座位圆圈”尺寸与间距配置
  - [x] 将座位尺寸/间距（直径0.6m、最小间距0.1m、桌边距离0.2m）写入规则配置并在领域层统一读取
  - [x] 明确座位的“中心偏移/行距/列距”计算公式与单位换算（m → px）

- [x] Task 2: 隐藏 SeatAnchor 可见渲染并保留主位推导
  - [x] 画布渲染层跳过 `hostSeatAnchor` 元素的可视化绘制
  - [x] 主位推导仍可使用 `hostSeatAnchor`（或在无锚点时使用既有 fallback 逻辑）

- [x] Task 3: 主位圆圈改为红色填充
  - [x] 将 `mainSeatId` 对应座位圆圈设为红色填充（不依赖额外锚点图元）
  - [x] 在“模拟现场”生成座位（seatCount 模式）时，为主位提供稳定的 `mainSeatId`（默认使用 “1” 或明确的主位推导结果）

- [x] Task 4: 按桌面大小动态调整桌边座位容量与分行
  - [x] 修改 Layout Engine 桌边排座逻辑：使用 seatDiameter/seatPitch/seatRowOffset 计算每边每行可容纳数量
  - [x] 保持门洞避让、墙距约束仍生效

- [x] Task 5: 测试与验证
  - [x] 更新/新增单元测试覆盖：间距规则（0.6m占位、0.1m最小间距、0.2m桌边距离）、不渲染 hostSeatAnchor（可通过快照/渲染层逻辑测试或最小化断言）
  - [x] 本地验证 typecheck/lint/test/build 通过

# Task Dependencies
- Task 4 依赖 Task 1（需要统一的规则参数）
- Task 3 与 Task 2 可并行，但最终需与 Task 4 联调确认主位位置与样式一致
