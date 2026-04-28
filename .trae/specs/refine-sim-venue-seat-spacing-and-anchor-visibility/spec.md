# “模拟现场”座位圆圈规则与主位呈现 Spec

## Why
当前“模拟现场”的座位圆圈呈现与排布缺少统一的“真实尺寸”约束，导致不同桌面尺寸下的人员密度不稳定、观感不接近真实会议室。

## What Changes
- 不再显式渲染 SeatAnchor（现为 `hostSeatAnchor` 类型元素），其仅作为主位推导/布局参考存在。
- 主位人员对应的圆圈使用红色填充表达（而不是通过额外锚点/特殊图元表达）。
- 座位圆圈排布规则参数化为“真实尺寸”：
  - 单个圆圈占据 0.6m × 0.6m 的空间（直径 0.6m）。
  - 圆圈之间最小间距为 0.5 格（0.1m）。
  - 圆圈与桌子之间距离为 1 格（0.2m）。
- 座位在桌边的“每边可容纳人数/分行数”随桌边长度自动调整（同一边不足则自动向外分行）。

## Impact
- Affected specs:
  - “模拟现场”座位圆圈渲染规则
  - “模拟现场”桌边排座（Layout Engine）间距约束
  - 主位可视化表达
- Affected code:
  - web/src/ui/components/VenueCanvas.tsx（座位/锚点渲染与主位样式）
  - web/src/domain/services/layoutEngine.ts（桌边排座距离模型）
  - web/src/domain/config/venueRules.ts（统一规则配置）
  - web/src/domain/rules/mainSeatResolver.ts（主位推导继续使用锚点，但不再渲染锚点）
  - web/src/ui/components/HomeVenueSimulator.tsx（模拟现场主位标记来源）

## ADDED Requirements
### Requirement: 隐藏 SeatAnchor 图元
系统 SHALL 不在“模拟现场”画布中显式渲染 `hostSeatAnchor` 类型元素。

#### Scenario: 仅作为逻辑锚点
- **GIVEN** 模板/场景中包含 `hostSeatAnchor`
- **WHEN** 渲染“模拟现场”
- **THEN** 画布中不出现该锚点的可见图元
- **AND** 主位推导逻辑仍可使用该锚点（不影响主位计算）

### Requirement: 主位圆圈红色填充
系统 SHALL 以“红色填充”的方式呈现主位人员所在的座位圆圈。

#### Scenario: 主位高亮
- **GIVEN** 画布收到 `mainSeatId`
- **WHEN** 渲染座位圆圈
- **THEN** `mainSeatId` 对应的圆圈使用红色填充
- **AND** 其他座位维持原有配色规则

### Requirement: 座位圆圈真实尺寸与间距模型
系统 SHALL 按以下尺寸模型生成桌边座位圆圈位置（以世界坐标 meters 为基准，并通过规则配置换算为像素）：
- 圆圈直径 `seatDiameter = 0.6m`（占据 0.6m × 0.6m）
- 圆圈间最小净距 `seatMinGap = 0.1m`（0.5 格）
- 圆圈中心最小间距 `seatPitch = seatDiameter + seatMinGap = 0.7m`
- 圆圈与桌边最小净距 `seatTableGap = 0.2m`（1 格）
- 圆圈中心到桌边的首行偏移 `seatRowOffset = seatTableGap + seatDiameter/2 = 0.5m`

#### Scenario: 单边按桌边长度自动容纳
- **GIVEN** 一张桌子的某条边长度为 `edgeLength`
- **WHEN** 在该边放置 `n` 个座位圆圈
- **THEN** 系统按 `seatPitch` 计算该边每行最大容纳数 `maxPerRow`
- **AND** 若 `n > maxPerRow` 则自动向桌外侧生成下一行（行间距同 `seatPitch`）
- **AND** 每个圆圈均满足：
  - 圆圈与桌边净距 ≥ `seatTableGap`
  - 任意两圆圈净距 ≥ `seatMinGap`

## MODIFIED Requirements
### Requirement: “模拟现场”生成座位位置（桌边排座）
系统 SHALL 以规则配置中的“真实尺寸与间距模型”替换当前基于像素/经验值的座位半径与间距计算方式，并保持以下行为不变：
- 仍以“桌边”为落座边界（top/right/bottom/left）
- 仍支持人数超出单边容量时向外分行
- 仍保留门洞通行区避让（doorClearance）与墙距约束（wallMargin）

## REMOVED Requirements
无

