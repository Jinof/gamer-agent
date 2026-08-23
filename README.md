# Gamer Agent

Gamer Agent 第一阶段是一个 **Windows 优先、完全由用户触发的截图分析助手**。它只完成下面这条只读路径：

> 用户点击截取桌面/所选窗口，或手动选择图片 → 本地预览 → 用户明确确认发送 → 调用用户配置的视觉模型 → 显示中文策略建议

它不会持续截屏，不会控制鼠标、键盘或手柄，不会绕过反作弊，也不会根据建议自动执行任何游戏操作。

## 当前状态

- 新增的主实现位于 `src/`，使用 Electron，主目标为 Windows 10/11 x64。
- 原有 macOS Swift/AppKit 原型仍完整保留在 `GamerAgent/`、`GamerAgent.xcodeproj/`、`project.yml` 和 `build_and_sign.sh`，本阶段没有修改或删除这些文件。
- 当前开发机是 macOS。本地已能执行 JavaScript 静态检查与不依赖 GUI 的核心测试；**Windows 安装、真实桌面/窗口截图、系统 DPAPI 和游戏兼容性必须继续在 Windows 真机验收**。

## Windows 上运行

准备 Node.js 20 或更高版本，然后在 PowerShell 中运行：

```powershell
npm ci
npm run check
npm start
```

首次使用：

1. 在右侧填写视觉模型的完整 OpenAI-compatible Chat Completions API 地址，例如 `https://your-service.example/v1/chat/completions`。
2. 填写模型名称和 API Key，保存。
3. 阅读顶部发送边界，点击“刷新桌面与窗口”，选择目标后点击“截取并在本地预览”；也可以点击“选择本地图片”。
4. 核对预览，勾选目标服务确认，再点击“确认发送并分析”。

Windows 一般不会像 macOS 那样弹出独立的屏幕录制授权框；界面会在用户主动刷新后显示“尚未检查 / 可用 / 被系统或组织策略阻止”的截图能力状态。

远程服务地址只允许 HTTPS；为了支持本地部署模型，`localhost`、`127.0.0.1` 和 `::1` 可使用 HTTP。应用没有内置服务或默认模型，请求只会发往用户保存的地址。

## Windows 安装包

推荐直接在 Windows x64 构建：

```powershell
npm ci
npm run dist:win
```

安装包输出到 `dist/`。仓库也包含 Windows CI 骨架，未来接入 GitHub 后可验证干净环境下的检查与 NSIS 打包。

## 安全与隐私边界

- API Key 只在 Electron 主进程使用，并通过系统 `safeStorage` 加密后落盘；Windows 上底层使用 DPAPI。普通 `settings.json` 只保存服务地址和模型名称。
- 更换服务地址但未输入新 Key 时，应用会删除旧 Key，避免把原服务凭据发送给新服务。
- 窗口列表在用户点击刷新时读取；截图在用户点击截取时发生；模型调用还需要第二次明确确认。
- 每张本地预览使用 10 分钟有效、只能消费一次的随机令牌。取消、关闭窗口或发起新预览会清除旧内容。
- 图片只保存在内存中，不自动写入磁盘，不写日志；手动选图仅接受经过文件签名校验的 PNG/JPEG/WebP，最大 20 MB。
- 渲染层启用 `contextIsolation`、Chromium sandbox、禁用 Node 集成和权限请求，并使用 CSP 与窄 IPC 接口。
- 某些全屏独占、受保护或由反作弊保护的窗口可能返回黑屏。应用会报错，不提供规避手段。请仅在游戏规则允许时使用无边框窗口或手动截图。

详细设计见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)，Windows 验收清单见 [`docs/WINDOWS-ACCEPTANCE.md`](docs/WINDOWS-ACCEPTANCE.md)。

## 验证命令

```bash
npm run check
```

该命令执行所有 JavaScript 语法检查和基于 Node 内置测试运行器的核心测试。真实 Windows 验收不能由 macOS 静态检查替代。

如需生成不访问真实截图或模型服务的界面空状态快照，可运行 `npm run smoke:ui`；命令会把 PNG 路径输出到终端。

## 为什么从 Swift 原型迁移

现有原型已经提供菜单栏、快捷键、macOS 截屏和模型调用的功能参考，但其 AppKit/CoreGraphics 实现不能在 Windows 运行，而且 API Key 以明文 `UserDefaults` 保存。Electron 的 `desktopCapturer`、Windows DPAPI-backed `safeStorage` 和 Chromium 沙箱可以先形成可运行的 Windows 主路径，同时保留后续 macOS 兼容空间。

后续若继续支持 macOS，可以选择让 Electron 实现成为共同 UI/协议层，或让原生 Swift 客户端复用本文档约定的“截图源—一次性预览—显式确认—模型调用”边界。原 Swift 原型在安全存储迁移完成前不应作为生产版本发布。
