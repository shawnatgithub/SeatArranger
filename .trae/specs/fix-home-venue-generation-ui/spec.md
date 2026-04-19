# 首页“生成场地”按钮与平面图生成修复 Spec

## Why
当前首页在深色模式/某些浏览器环境下出现按钮文字不可见、控件样式异常，以及点击“生成场地”后未展示平面图的问题，影响核心体验与可信度。

## What Changes
- 修复首页“生成场地”按钮的可见性问题（文字颜色/控件主题导致的不可读）。
- 修复“生成场地”点击后平面图未生成/未显示的问题，确保生成结果稳定渲染。
- 明确“生成场地”为前端生成并渲染的平面图（Konva Canvas），不依赖服务端。
- **不改变**“进入编辑”创建项目与跳转逻辑。

## Impact
- Affected specs:
  - 首页新建项目操作区可用性
  - “模拟现场”平面图生成与渲染
  - 暗色模式下的表单控件可读性/一致性
- Affected code:
  - web/src/app/globals.css
  - web/src/app/page.tsx
  - web/src/app/page.module.css
  - web/src/ui/components/HomeVenueSimulator.tsx
  - web/src/ui/components/VenueCanvas.tsx（如需确保容器尺寸/渲染时序正确）

## ADDED Requirements
### Requirement: 首页按钮可见性
系统 SHALL 保证首页“进入编辑”和“生成场地”按钮在深色模式/浅色模式下均可读、可点击，且不会出现“按钮为空白块”的现象。

#### Scenario: 深色模式下按钮可读
- **GIVEN** 用户设备开启深色模式（`prefers-color-scheme: dark`）
- **WHEN** 用户打开首页
- **THEN** “生成场地”按钮文字可见（与背景有足够对比度）
- **AND** 模板/策略等表单控件不会强制渲染为“深色控件 + 白底卡片”导致的不可读组合

### Requirement: 平面图生成结果可见
系统 SHALL 在用户点击“生成场地”后，于首页下方“模拟现场”模块中展示生成的平面图。

#### Scenario: 点击生成后展示平面图
- **GIVEN** 用户已选择模板
- **WHEN** 用户点击“生成场地”
- **THEN** “模拟现场”模块从“尚未生成/占位提示”切换为“平面图画布”
- **AND** 平面图内容与所选模板一致（座位与元素可见）

#### Scenario: 重复点击/切换模板后仍可生成
- **GIVEN** 用户已生成过一次平面图
- **WHEN** 用户再次点击“生成场地”（可在切换模板后触发）
- **THEN** “模拟现场”模块展示新的生成结果（至少时间戳 seed 改变导致布局变化，或模板变化导致图形变化）

## MODIFIED Requirements
### Requirement: “生成场地”行为边界
点击“生成场地” SHALL 仅影响首页预览状态，不创建项目、不写入项目列表、不进行页面跳转。

## REMOVED Requirements
无

