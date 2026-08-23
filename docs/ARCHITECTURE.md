# 架构与阶段边界

## 目标

第一阶段只解决一个问题：在 Windows 上让用户主动提供一张画面，确认发送目标后获得中文分析。架构提前拆开截图、模型、结果、设置与安全策略，但不为未来的自动操作预留输入注入能力。

## 模块

| 层 | 目录 | 职责 |
| --- | --- | --- |
| 纯逻辑核心 | `src/core/` | 设置 URL 规则、图片签名/大小校验、一次性预览令牌、显式同意校验、模型响应解析 |
| Windows/桌面适配 | `src/main/services/capture-service.js` | 仅在 IPC 明确请求时枚举或截取 Electron 的 `screen` / `window` 来源 |
| 凭据与设置 | `src/main/services/credential-vault.js`、`settings-store.js` | API Key 由 OS-backed `safeStorage` 加密；非敏感设置单独保存 |
| 模型适配 | `src/main/services/model-service.js` | 只调用用户配置的 OpenAI-compatible Chat Completions 端点 |
| 应用编排 | `src/main/main.js` | 可信 IPC、一次性预览内存、文件选择、错误边界、窗口生命周期 |
| 最小权限桥 | `src/preload/preload.js` | 每个允许操作对应一个固定方法，不向页面暴露任意 IPC 或 Node API |
| 中文界面 | `src/renderer/` | 未配置、就绪、本地预览、处理中、成功和错误状态 |

## 数据流

1. 用户先在始终可见的提示中得知：画面可能发送到所配置的模型服务。
2. 用户点击刷新，应用只读取桌面/窗口来源元数据；不发送给模型。
3. 用户点击截图或手动选图，主进程采集一次并校验格式和大小。
4. 主进程把图片保留在内存，签发一个 10 分钟有效的随机预览令牌；界面显示本地预览和目标服务域名。
5. 用户勾选确认并点击发送。主进程同时验证 `confirmedDisclosure === true` 和一次性令牌。
6. 主进程从系统安全存储解密 API Key，把这一张图发往用户配置的地址。
7. 令牌在请求开始前即被消费，不能重放；返回文本通过 `textContent` 展示。

## 信任边界

- 渲染页面不持有 API Key，也不能读取文件系统、调用 Electron 模块或指定任意 IPC channel。
- 主进程只接受当前主窗口发出的请求。新窗口、外部导航和 Web 权限请求均被拒绝。
- 远程端点必须是 HTTPS，本地回环地址例外；URL 内不能嵌入用户名或密码。
- 图片和密钥不记录日志。普通配置中不出现 API Key。
- 更换服务地址时不会静默沿用旧 Key。

## 明确排除

代码库第一阶段不引入 `robotjs`、`nut.js`、`iohook`、Windows `SendInput` 或同类能力，也没有定时器驱动的截图循环。以下能力需要新的产品决策与单独安全评审，不能作为本阶段的小改动加入：

- 鼠标、键盘、手柄或游戏进程控制；
- 后台轮询、连续截图、静默上传；
- OCR/模型结果自动转化为游戏行动；
- 反作弊绕过、进程注入、内存读取或受保护画面规避。

## macOS 原型兼容策略

`GamerAgent/` 等原文件作为功能参考保留。Windows 主实现没有直接复用 Swift 类型，因为 AppKit、CoreGraphics、macOS 权限与 `UserDefaults` 都是平台专属。后续可抽象共同的模型请求协议和 UI 状态机；若继续发布原生 macOS 版，必须先把密钥迁移到 Keychain，并加入与 Windows 一致的发送前确认。
