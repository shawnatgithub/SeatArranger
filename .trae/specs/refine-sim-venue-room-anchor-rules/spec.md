# “模拟现场”房间与定位元素关系规则 Spec

## Why
当前“模拟现场”在默认生成时对房间与定位元素（屏幕/窗/门）的墙面归属、对齐与互斥关系不够明确，导致生成结果难以稳定符合真实场地直觉。

## What Changes
- 默认生成时强制以下关系规则：
  - 屏幕、窗、门三类元素分别位于不同墙面（门可以有两个，但两扇门位于同一“门墙”）。
  - 屏幕/窗/门互不重叠；同墙面上的两扇门也不可重叠。
  - 门/窗/屏幕贴墙时必须“长边贴墙”（必要时自动旋转 90°）。
  - 窗与屏幕在各自墙面上默认居中。
  - 默认生成两扇门：在门墙的两端分布，但与角落保留边距（不贴角）。
- 统一将上述规则落到默认生成与吸附逻辑中，并补充单测验证。

## Impact
- Affected specs:
  - “模拟现场”默认场地生成（房间与定位元素）
  - 定位元素墙体吸附与旋转规则
  - 定位元素碰撞/互斥约束
- Affected code:
  - web/src/domain/services/venueWizard.ts（Step1 默认房间/锚点生成）
  - web/src/domain/services/layoutEngine.ts（缺省锚点补全与吸附/碰撞处理）
  - web/src/domain/config/venueRules.ts（规则配置：门数量/边距/最小间隔）
  - web/src/domain/services/layoutEngine.test.ts（单元测试）

## ADDED Requirements
### Requirement: 三类定位元素分墙
系统 SHALL 在默认生成房间时，保证屏幕、窗、门三类定位元素分别位于不同墙面：
- `screen.wall`、`window.wall`、`door.wall` 三者两两不相等
- 门可生成两扇，但两扇门均位于 `door.wall`

#### Scenario: 默认生成分墙成功
- **WHEN** 用户执行“生成场地”
- **THEN** 生成的屏幕、窗、门不在同一面墙上

### Requirement: 长边贴墙（铁律）
系统 SHALL 在以下场景保证门/窗/屏幕的长边与墙体边线平行，且元素贴合墙面边界：
- 默认生成定位元素时
- 用户拖拽定位元素并释放吸附时

#### Scenario: 自动旋转后贴墙
- **GIVEN** 元素长边方向与目标墙面不匹配
- **WHEN** 系统贴墙吸附该元素
- **THEN** 系统自动旋转 90° 使长边贴墙

### Requirement: 窗与屏幕默认居中
系统 SHALL 在默认生成定位元素时，使窗与屏幕沿其所在墙面的切向方向居中（centering）。

#### Scenario: 居中生成
- **WHEN** 用户执行“生成场地”
- **THEN** 屏幕位于其墙面的居中位置
- **AND** 窗位于其墙面的居中位置

### Requirement: 默认生成两扇门（非贴角）
系统 SHALL 在默认生成定位元素时生成两扇门，并满足：
- 两扇门位于同一门墙 `door.wall`
- 两扇门沿门墙切向方向分布于两端
- 与角落保留边距 `door.cornerInsetM`（不贴角）
- 两扇门之间互不重叠，且最小净距 ≥ `door.minGapM`

#### Scenario: 门位于两端
- **WHEN** 用户执行“生成场地”
- **THEN** 门墙上存在两扇门
- **AND** 两扇门分别靠近门墙两端且不贴角

### Requirement: 定位元素互斥（不可重叠）
系统 SHALL 保证默认生成的屏幕/窗/门之间不发生重叠；当用户拖拽定位元素导致与同墙元素冲突时，系统 SHALL 进行沿墙方向的最小移动以消除重叠。

#### Scenario: 门-门不重叠
- **GIVEN** 门墙上存在两扇门
- **WHEN** 默认生成或用户拖拽门锚点并释放
- **THEN** 两扇门的外接矩形不相交

## MODIFIED Requirements
### Requirement: 默认房间构件生成
系统 SHALL 用本 spec 的规则替换/补充既有默认构件生成策略（屏幕/入口/窗的生成位置），并保持以下兼容性：
- 若模板显式包含同类元素，不重复生成同类默认构件
- 生成结果仍落在网格步长上

## REMOVED Requirements
无

