# Tasks
- [ ] Task 1: 需求落地设计（布局引擎约束拆分）
  - [ ] 定义 seatRadius、minGap、wallMargin、doorClearance 的默认值与可配置方式
  - [ ] 定义“门洞”的几何表达（沿墙的开口范围 + 内侧缓冲区）
  - [ ] 定义“主位/屏幕缺失时”的降级策略（例如仅按屏幕/仅按 x 轴、或固定模板侧）

- [ ] Task 2: 座椅碰撞与墙体约束
  - [ ] 实现 seat-seat 最小距离约束（迭代推开 + 夹紧到房间内）
  - [ ] 实现 seat-wall 约束（考虑座椅半径/外接框）
  - [ ] 更新/新增单测覆盖：随机生成或构造用例验证不重叠与不越界

- [ ] Task 3: 门洞避让
  - [ ] 将 entrance 锚点转换为 door opening（沿墙方向的区间）
  - [ ] 定义并实现 doorClearance 区域（内侧矩形/扇形留白）避让
  - [ ] 单测覆盖：门洞附近不出现座椅

- [ ] Task 4: 定位元素“长边贴墙”吸附
  - [ ] 改造墙体吸附：区分横墙/竖墙，确保元素长边与墙平行
  - [ ] 必要时实现元素自动旋转 90°（并在渲染层体现）
  - [ ] 单测覆盖：拖拽到任意位置后，锚点最终落在墙边且长边贴墙

- [ ] Task 5: 动态高侧/低侧判定与不均衡分配
  - [ ] 计算朝向：主位→屏幕方向定义“面向屏幕”
  - [ ] 基于朝向定义桌子的“面向屏幕左/右侧”
  - [ ] 当左右人数不均衡时，将多余座位优先归入低侧
  - [ ] 单测覆盖：改变屏幕位置后，左右侧判定随朝向变化

- [ ] Task 6: 锚点移动触发布局整体刚体变换
  - [ ] 将“锚点移动导致朝向变化”统一表达为刚体变换（旋转/平移）
  - [ ] 确保桌椅/座位相对关系保持不变，然后再应用碰撞/避让/吸附
  - [ ] 单测覆盖：锚点移动前后，未触发碰撞时相对位置保持一致

- [ ] Task 7: 验证与记录
  - [ ] npm run typecheck
  - [ ] npm run lint
  - [ ] npm test
  - [ ] npm run build
  - [ ] 手工验证：拖拽门窗屏幕只能沿墙移动且长边贴墙；座椅不重叠不越界并避开门洞；人数不均衡落低侧；锚点移动整体调整朝向
  - [ ] 将修改-测试循环过程与结果追加写入 TestsInProcess.md

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 1
- Task 6 depends on Task 4, Task 5
- Task 7 depends on Task 2, Task 3, Task 4, Task 5, Task 6

