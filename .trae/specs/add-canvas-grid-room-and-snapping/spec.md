# 画板网格/房间轮廓/拖拽吸附 Spec

## Why
当前画布缺少统一的对齐基准与场地边界表达，用户在拖拽调整桌椅/人员位置时难以保持整齐布局，也缺少默认“房间”的空间语义。

## What Changes
- 在画布底层增加统一网格系统（可视化网格线），作为对齐参考且不遮挡场地元素。
- 自动生成房间轮廓（默认长方形）与基础房间构件：屏幕（左侧）、入口（底部左右各一个）、窗（顶部居中，长度为房间宽度的一半）。
- 支持用户交互拖拽并进行网格吸附：
  - 桌子/场地元素（如 screen/entrance 等）可拖拽并吸附
  - 座椅可拖拽并吸附
  - 人员（以“姓名标签/人员图元”的形式呈现）可拖拽并吸附
- **不改变**既有排座算法与项目存储语义；新增的“位置/吸附”数据仅作为画布布局用途。

## Impact
- Affected specs:
  - 画布渲染层次（底层网格、房间轮廓、场地元素、座椅、人员）
  - 编辑模式下的拖拽交互与持久化（座椅/元素/人员位置）
- Affected code:
  - web/src/ui/components/VenueCanvas.tsx
  - web/src/domain/models.ts（若需要扩展 VenueElementType 以表达 window/room）
  - web/src/domain/templates/templates.ts（若需要补默认房间构件或迁移现有模板元素）
  - web/src/app/project/[id]/page.tsx（拖拽后的覆盖数据保存/加载）
  - web/src/ui/components/HomeVenueSimulator.tsx（预览场景是否展示网格/房间）

## ADDED Requirements
### Requirement: 底层网格系统
系统 SHALL 在画布底层渲染可视化网格线，用于辅助对齐与布局。

#### Scenario: 网格不影响元素显示
- **WHEN** 用户打开画布
- **THEN** 网格线位于最底层
- **AND** 不遮挡房间、桌子、座椅、人员等图元（图元仍保持原有 fill/stroke 的可见性）

### Requirement: 自动房间轮廓与默认构件
系统 SHALL 自动生成房间轮廓（默认长方形）以及屏幕/入口/窗的默认布局，用于提供“空间边界”和“方位参考”。

#### Scenario: 默认房间布局
- **WHEN** 使用任意模板渲染画布
- **THEN** 画布中显示房间长方形轮廓
- **AND** 默认屏幕在房间左侧（垂直居中或接近上方的合理位置）
- **AND** 默认入口在房间底部左侧与右侧（两个入口）
- **AND** 默认窗在房间顶部居中，长度为房间宽度的一半

#### Scenario: 不重复生成
- **GIVEN** 模板已显式包含 screen/entrance 等元素
- **WHEN** 渲染画布
- **THEN** 系统优先使用模板元素位置
- **AND** 不重复叠加同类型默认构件（避免出现两个 screen/entrance 重叠）

### Requirement: 网格吸附拖拽
系统 SHALL 在用户拖拽移动座椅/场地元素/人员图元时进行网格吸附，使其对齐到最近的网格点或网格线。

#### Scenario: 拖拽吸附座椅
- **GIVEN** 用户开启编辑/可拖拽模式
- **WHEN** 用户拖拽座椅并松开
- **THEN** 座椅位置吸附到最近网格点（例如以网格间距为步长对 x/y 取整）
- **AND** 新位置被持久化（刷新页面后保持一致）

#### Scenario: 拖拽吸附场地元素
- **GIVEN** 用户开启编辑/可拖拽模式
- **WHEN** 用户拖拽桌子/入口/屏幕等场地元素并松开
- **THEN** 元素位置吸附到网格
- **AND** 新位置被持久化

#### Scenario: 拖拽吸附人员图元
- **GIVEN** 座椅已分配人员且画布显示人员图元（姓名标签或人物标记）
- **WHEN** 用户拖拽人员图元并松开
- **THEN** 人员图元位置吸附到网格
- **AND** 仅改变显示位置，不改变座椅归属与排座结果

## MODIFIED Requirements
无

## REMOVED Requirements
无

