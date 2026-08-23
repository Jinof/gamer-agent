import AppKit
import SwiftUI
import Combine

class SettingsWindow: NSWindowController {
    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 450, height: 400),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Gamer Agent 设置"
        window.center()

        let settingsView = SettingsView()
        window.contentView = NSHostingView(rootView: settingsView)

        // Increase window height to fit new content
        window.setContentSize(NSSize(width: 450, height: 620))

        self.init(window: window)
    }
}

struct SettingsView: View {
    @ObservedObject private var settings = AppSettings.shared

    @State private var apiKeyInput: String = ""
    @State private var showingSaveAlert = false
    @State private var screenCaptureGranted: Bool = false
    @State private var accessibilityGranted: Bool = false
    @State private var cancellables = Set<AnyCancellable>()

    @State private var windowList: [WindowInfo] = []
    @State private var selectedWindowID: UInt32 = 0
    @State private var selectedWindowName: String = "全屏截图"

    private let screenshotService = ScreenshotService()

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("MiniMax API Key")
                        .font(.headline)

                    SecureField("输入您的 API Key", text: $apiKeyInput)
                        .textFieldStyle(.roundedBorder)

                    Text("请从 MiniMax 开放平台获取 API Key")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Button("保存") {
                        settings.apiKey = apiKeyInput
                        showingSaveAlert = true
                    }
                    .buttonStyle(.borderedProminent)
                }
            }

            Divider()
                .padding(.vertical, 8)

            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Text("快捷键设置")
                        .font(.headline)

                    HStack {
                        Text("当前快捷键:")
                        Spacer()
                        Text("Cmd + Shift + G")
                            .foregroundColor(.secondary)
                    }

                    Text("如需修改快捷键，请在系统设置 > 键盘 > 快捷键中配置")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Divider()
                .padding(.vertical, 8)

            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Text("目标进程")
                        .font(.headline)

                    HStack {
                        Text("当前目标:")
                        Spacer()
                        Text(selectedWindowName)
                            .foregroundColor(.secondary)
                    }

                    Button(action: refreshWindowList) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("刷新窗口列表")
                        }
                    }
                    .buttonStyle(.bordered)

                    if !windowList.isEmpty {
                        Picker("选择窗口", selection: $selectedWindowID) {
                            Text("全屏截图").tag(UInt32(0))
                            ForEach(windowList) { window in
                                Text(window.displayName).tag(window.id)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedWindowID) { newValue in
                            settings.selectedWindowID = newValue
                            if newValue == 0 {
                                selectedWindowName = "全屏截图"
                            } else if let window = windowList.first(where: { $0.id == newValue }) {
                                selectedWindowName = window.displayName
                            }
                        }
                    } else {
                        Text("点击「刷新窗口列表」获取可用窗口")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Text("提示：选择具体窗口后，只截取该窗口内容；选择「全屏截图」则截取整个屏幕")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Divider()
                .padding(.vertical, 8)

            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Text("权限状态")
                        .font(.headline)

                    HStack {
                        Image(systemName: screenCaptureGranted ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundColor(screenCaptureGranted ? .green : .red)
                        Text("屏幕录制权限")
                        Spacer()
                        if screenCaptureGranted {
                            Text("已授权")
                                .font(.caption)
                                .foregroundColor(.green)
                        } else {
                            Button("请求") {
                                requestScreenCapture()
                            }
                            Button(action: {
                                refreshPermissionStatus()
                            }) {
                                Image(systemName: "arrow.clockwise")
                            }
                            .help("刷新权限状态")
                        }
                    }

                    if !screenCaptureGranted {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("授权方法：")
                                .font(.caption)
                                .fontWeight(.medium)
                            Text("1. 点击上方「请求」按钮")
                            Text("2. 在弹出的对话框中点击「系统设置」")
                            Text("3. 找到「屏幕录制」并开启 GamerAgent")
                            Text("提示：如果列表中没有看到应用，请先将应用复制到「应用程序」文件夹后再试")
                                .foregroundColor(.orange)
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(8)
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(6)

                        HStack {
                            Button("打开系统设置") {
                                openScreenCaptureSettings()
                            }
                            .buttonStyle(.bordered)

                            Button("复制应用路径") {
                                copyAppPath()
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(.top, 4)
                    }

                    Divider()
                        .padding(.vertical, 8)

                    HStack {
                        Image(systemName: accessibilityGranted ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundColor(accessibilityGranted ? .green : .red)
                        Text("辅助功能权限")
                        Spacer()
                        if accessibilityGranted {
                            Text("已授权")
                                .font(.caption)
                                .foregroundColor(.green)
                        } else {
                            Button("请求") {
                                requestAccessibility()
                            }
                            Button(action: {
                                refreshPermissionStatus()
                            }) {
                                Image(systemName: "arrow.clockwise")
                            }
                            .help("刷新权限状态")
                        }
                    }

                    if !accessibilityGranted {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("授权方法：")
                                .font(.caption)
                                .fontWeight(.medium)
                            Text("1. 点击上方「请求」按钮")
                            Text("2. 在弹出的对话框中点击「系统设置」")
                            Text("3. 找到「辅助功能」并开启 GamerAgent")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(8)
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(6)

                        Button("打开系统设置") {
                            openAccessibilitySettings()
                        }
                        .buttonStyle(.bordered)
                        .padding(.top, 4)
                    }
                }
            }

            Divider()
                .padding(.vertical, 8)

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("关于")
                        .font(.headline)

                    Text("Gamer Agent v1.0")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text("游戏策略助手，帮助您在游戏中做出更好的决策")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    if !accessibilityGranted || !screenCaptureGranted {
                        Divider()
                            .padding(.vertical, 8)

                        Text("⚠️ 常见问题")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.orange)

                        Text("如果权限显示不正确，请尝试：")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text("1. 将 GamerAgent.app 复制到「应用程序」文件夹")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text("2. 从「应用程序」文件夹运行应用一次")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text("3. 重新授予权限")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Divider()
                .padding(.vertical, 8)

            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Text("日志")
                        .font(.headline)

                    HStack {
                        Text("日志文件路径:")
                            .font(.caption)
                        Spacer()
                        Button("打开日志文件夹") {
                            openLogFolder()
                        }
                        .buttonStyle(.bordered)
                    }

                    if let logPath = Logger.shared.getLogFilePath() {
                        Text(logPath)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    Button(action: {
                        openLogInConsole()
                    }) {
                        HStack {
                            Image(systemName: "doc.text")
                            Text("查看日志")
                        }
                    }
                    .buttonStyle(.bordered)

                    Text("点击「查看日志」可以在控制台查看最近的日志")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
        .frame(width: 450, height: 620)
        .onAppear {
            apiKeyInput = settings.apiKey
            refreshPermissionStatus()
            startPermissionMonitor()
            refreshWindowList()
            selectedWindowID = settings.selectedWindowID
            if selectedWindowID == 0 {
                selectedWindowName = "全屏截图"
            } else if let window = windowList.first(where: { $0.id == selectedWindowID }) {
                selectedWindowName = window.displayName
            }
        }
        .alert("保存成功", isPresented: $showingSaveAlert) {
            Button("确定", role: .cancel) { }
        }
    }

    private func refreshPermissionStatus() {
        screenCaptureGranted = CGPreflightScreenCaptureAccess()
        accessibilityGranted = AXIsProcessTrusted()
    }

    private func refreshWindowList() {
        windowList = screenshotService.getWindowList()
    }

    private func startPermissionMonitor() {
        // Refresh permission status every 2 seconds when view appears
        Timer.publish(every: 2.0, on: .main, in: .common)
            .autoconnect()
            .sink { _ in
                refreshPermissionStatus()
            }
            .store(in: &cancellables)
    }

    private func checkScreenCapture() -> Bool {
        return CGPreflightScreenCaptureAccess()
    }

    private func checkAccessibility() -> Bool {
        return AXIsProcessTrusted()
    }

    private func requestScreenCapture() {
        _ = CGRequestScreenCaptureAccess()
    }

    private func requestAccessibility() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        AXIsProcessTrustedWithOptions(options as CFDictionary)
    }

    private func openScreenCaptureSettings() {
        // Try to open Screen Recording privacy settings
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
            NSWorkspace.shared.open(url)
        }
    }

    private func openAccessibilitySettings() {
        // Try to open Accessibility privacy settings
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") {
            NSWorkspace.shared.open(url)
        }
    }

    private func copyAppPath() {
        // Get the path to the running app
        if let bundlePath = Bundle.main.bundlePath as String? {
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(bundlePath, forType: .string)

            // Show a simple alert using NSAlert
            let alert = NSAlert()
            alert.messageText = "应用路径已复制"
            alert.informativeText = "路径: \(bundlePath)\n\n请在「系统设置 > 隐私与安全性 > 屏幕录制」中点击「+」按钮添加此应用。"
            alert.alertStyle = .informational
            alert.addButton(withTitle: "确定")
            alert.runModal()
        }
    }

    private func openLogFolder() {
        if let logPath = Logger.shared.getLogFilePath() {
            let folderURL = URL(fileURLWithPath: logPath).deletingLastPathComponent()
            NSWorkspace.shared.open(folderURL)
        }
    }

    private func openLogInConsole() {
        let logs = Logger.shared.getRecentLogs(lineCount: 200)

        let alert = NSAlert()
        alert.messageText = "最近日志 (最后 200 行)"
        alert.informativeText = logs
        alert.alertStyle = .informational
        alert.addButton(withTitle: "复制到剪贴板")
        alert.addButton(withTitle: "关闭")

        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(logs, forType: .string)
        }
    }
}
