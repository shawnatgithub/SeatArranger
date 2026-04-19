# How Seats Arranged（座次与场地布局规则说明）

本文档描述本项目当前的两类规则：
- 场地/画布的“布局规则”（房间、网格、锚点与桌椅几何）
- 座次分配的“排座规则”（人员 → 座位的分配逻辑）

## 1. 坐标系与网格
- 使用 world 坐标系：场地中心点为 (0, 0)
- 渲染层将 world 坐标映射到画布坐标：`canvas = world + (canvasWidth/2, canvasHeight/2)`
- 网格线以 (0,0) 为中心对称分布，网格步长默认为 20
- 拖拽释放时对 world 坐标进行网格吸附：`x = round(x/grid)*grid`，`y = round(y/grid)*grid`

## 2. 房间与定位锚点（Anchors）
### 2.1 房间轮廓
- 默认房间为长方形轮廓，基于画布尺寸与边距生成
- 约定 roomPadding（默认 60），房间宽高为：
  - `roomWidth = canvasWidth - 2*roomPadding`
  - `roomHeight = canvasHeight - 2*roomPadding`
- 房间的 world 左上角为 `(-roomWidth/2, -roomHeight/2)`

### 2.2 默认定位元素
当模板未显式提供定位元素时，系统会生成默认锚点（并参与拖拽与布局重算）：
- screen：位于房间左侧（长条形）
- entrance：位于房间底部，左/右各一个
- window：位于房间顶部居中，长度为房间宽度的一半

## 3. 场地几何布局（桌子/座椅）
### 3.1 模板
模板定义主要描述“桌型/座位分布”的基础几何形状（例如长桌双侧座、U 型、回字形、主席台等）。

### 3.2 锚点驱动的自动调整（当前实现）
- 以 screen 作为主要方位锚点
- 当 screen 被拖拽到新位置后，系统会根据 screen 相对场地中心的方向变化，对桌子/座椅整体做旋转重算（绕场地中心旋转）
- entrance/window 的拖拽当前不直接触发几何重排（仍会被保存位置并参与渲染），后续可扩展为入口避让/窗侧留白等约束

## 4. 座次分配规则（arrangeSeats）
座次分配发生在领域层服务 `arrangeSeats`，输入包括：
- 场地模板（包含座位与元素/锚点信息）
- 人员列表（side、rank、roles）
- 场景策略（strategyId）
- 锁定分配（lockedAssignments）
- 用户指定主位（userMainSeatId，可选）

### 4.1 关键概念
- 主位（main seat）：由模板默认主位、用户指定主位、或锁定主宾座位共同决定
- 阵营（side）：
  - host：主人方
  - guest：主宾方
- 角色（roles）：
  - vip/leader：主宾/上级（用于决定主位优先）
  - presenter/hoster：主持/汇报（用于“靠近屏幕”的偏好）

### 4.2 排座优先级（概览）
1) 处理锁定分配：
   - 无效 seatId/personId 会被忽略并产生 warning
   - 重复锁定同一 seat/person 只保留第一次
2) 确定主位：
   - 优先使用用户指定主位（若有效）
   - 若主宾（vip/leader）被锁定到某座位，则该座位作为主位
3) 安排主宾（vipPrimary）：
   - 主宾/上级优先落在主位（若未被锁定且主位空闲）
4) 安排主人方最高职级（hostLeader）：
   - 在可用座位中选择一个“最优座位”靠近主位（且不占用主位）
5) 安排剩余人员：
   - 按“是否 VIP/是否关键角色（presenter/hoster）/职级 rank”排序后依次选择最优座位

### 4.3 “最优座位”打分模型（当前实现）
对于某个候选座位 s，打分由以下项构成：
- 阵营区（zone）加分：
  - host 人员偏好 host 区，其次 neutral 区
  - guest 人员偏好 guest 区，其次 neutral 区
- 主位距离（mainProximity）：
  - 越靠近主位越优先
- 屏幕距离（roleBonus）：
  - presenter/hoster 偏好靠近 screen（若存在 screen）
- 对称偏好（symmetryBonus）：
  - 越靠近场地中心线（x=0）越优先（鼓励布局对称）

### 4.4 输出
输出包含：
- assignments：人员与座位的分配结果
- explain：每个人的安排原因（基于场景策略名称 + 命中规则）
- warnings / errors：锁定异常、座位不足、缺少主宾等

## 5. 模板选项与场景策略的联动
- 模板选项决定：桌型结构、座位数量/位置、默认主位
- 场景策略决定：解释文案与“靠近主位/靠近屏幕”的偏好权重（当前策略名称用于 explain）
- 当用户切换模板/策略后，模拟现场应使用最新选择生成场地与（如执行排座）对应的座次结果

