# 环境变量与可配置项（MVP）

本项目为 Web 版（Next.js）MVP，默认仅本地存储、不接入登录与付费。以下配置项用于在不改代码的情况下调整导出体验与未来扩展能力。

## 1. 约定
- 以 `NEXT_PUBLIC_` 开头的变量会在浏览器端可见，只能放“可公开配置”，不要放任何密钥、token、签名私钥等。
- 未设置时会使用代码内置默认值（见 `src/adapters/export/konvaExporter.ts`）。

## 2. 导出（免费版：排队 + 水印）

### NEXT_PUBLIC_FREE_EXPORT_QUEUE_MS
- 作用：免费导出 PNG 的排队等待时长（毫秒）。
- 推荐范围：`10000`–`20000`（10–20 秒）。
- 默认值：`15000`
- 影响点：
  - 值越大，导出按钮点击后等待越久；
  - 用于未来接入会员/付费后做“免费慢、付费快”的体验差异。

### NEXT_PUBLIC_FREE_EXPORT_WATERMARK_TEXT
- 作用：免费导出 PNG 的水印文案。
- 默认值：`Seat Arranger`
- 建议：
  - 可以使用品牌名、域名或“内部使用”等标识；
  - 尽量避免包含个人信息。

### NEXT_PUBLIC_EXPORT_PIXEL_RATIO
- 作用：Konva 导出图片时的像素倍率（相当于导出清晰度）。
- 默认值：`2`
- 示例：
  - `1`：更快、更小，但更糊；
  - `2`：默认平衡；
  - `3`：更清晰，但导出更慢、图片更大。

## 3. 预留（未来跨端/付费阶段可能用到）
下面这些变量当前版本未强依赖，但建议预留统一入口，后续接入时只需补齐实现。

### NEXT_PUBLIC_PLATFORM_TARGET
- 作用：标识当前构建目标平台。
- 可选值（建议）：
  - `web`：Web 版（当前 MVP）
  - `wechat`：微信小程序（后续）
  - `both`：双端并行（后续）
- 使用方式：用于条件渲染、功能开关、埋点区分等。

### NEXT_PUBLIC_STORAGE_MODE
- 作用：标识数据存储策略。
- 可选值（建议）：
  - `local`：仅本地存储（当前 MVP）
  - `cloud`：云端存储（后续）
  - `hybrid`：项目本地 + 权益云端（后续）

### NEXT_PUBLIC_PAYMENT_STAGE
- 作用：标识付费能力接入阶段。
- 可选值（建议）：
  - `none`：不接入（当前 MVP）
  - `subscription_only`：先订阅后按次（你选定的节奏）
  - `subscription_and_per_export`：订阅 + 按次同时

