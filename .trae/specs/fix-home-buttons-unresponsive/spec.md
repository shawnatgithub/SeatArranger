# 首页按钮点击无响应修复 Spec（进入编辑 / 生成场地）

## Why
用户反馈在首页点击“进入编辑”与“生成场地”后无响应（不跳转、不生成平面图），说明前端事件绑定/触发链路在部分环境下失效，需要可复现、可验证的修复方案。

## What Changes
- 修复首页两个关键按钮的交互触发：在鼠标点击、触屏点击、以及 WebView/内嵌预览环境下均能稳定触发。
- 增加针对“生成场地”的可观测性：点击后必须进入“已生成”状态并渲染平面图（至少能显示画布容器与 Konva 内容）。
- 明确排查与验证流程：使用 Chrome DevTools MCP 工具抓取 console/network/DOM 状态来定位“无响应”原因。
- **不改变**业务语义：进入编辑仍创建项目并跳转；生成场地仍仅更新首页预览，不创建项目。

## Impact
- Affected specs:
  - 首页按钮交互可靠性
  - 平面图预览生成链路
  - 调试与验证流程（可重复）
- Affected code:
  - web/src/app/page.tsx
  - web/src/ui/components/HomeVenueSimulator.tsx
  - web/src/ui/components/VenueCanvas.tsx（如需确认 Konva 画布初始化/容器尺寸）
  - web/src/app/globals.css / web/src/app/page.module.css（若需修复环境相关的 pointer/click 行为）

## ADDED Requirements
### Requirement: “进入编辑”按钮可用
系统 SHALL 在用户点击“进入编辑”后创建项目并跳转到 `/project/[id]`，且在触屏/鼠标/WebView 环境下行为一致。

#### Scenario: 点击进入编辑成功
- **WHEN** 用户在首页点击“进入编辑”
- **THEN** 创建项目记录（localStorage 中新增项目）
- **AND** 页面跳转到对应项目页 `/project/<id>`

### Requirement: “生成场地”按钮可用
系统 SHALL 在用户点击“生成场地”后展示平面图预览，并且不创建项目、不跳转页面。

#### Scenario: 点击生成场地成功
- **GIVEN** 用户已选择模板
- **WHEN** 用户点击“生成场地”
- **THEN** “模拟现场”模块切换为已生成状态（出现“已基于模板…”或等价状态提示）
- **AND** 显示 Konva 平面图（画布可见，至少渲染元素/座位轮廓）

## MODIFIED Requirements
无

## REMOVED Requirements
无

