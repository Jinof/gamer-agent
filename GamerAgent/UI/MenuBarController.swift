import SwiftUI
import AppKit

class MenuBarController: NSObject {
    private var statusItem: NSStatusItem?
    private var onAnalyze: (() -> Void)?
    private var onSelectImage: (() -> Void)?
    private var onSettings: (() -> Void)?
    private var onQuit: (() -> Void)?

    init(onAnalyze: @escaping () -> Void, onSelectImage: @escaping () -> Void, onSettings: @escaping () -> Void, onQuit: @escaping () -> Void) {
        self.onAnalyze = onAnalyze
        self.onSelectImage = onSelectImage
        self.onSettings = onSettings
        self.onQuit = onQuit
        super.init()
        setupMenuBar()
    }

    private func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem?.button {
            button.image = NSImage(systemSymbolName: "gamecontroller.fill", accessibilityDescription: "Gamer Agent")
            button.action = #selector(menuBarClicked(_:))
            button.target = self
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }

        setupMenu()
    }

    private func setupMenu() {
        let menu = NSMenu()

        let analyzeItem = NSMenuItem(title: "分析当前画面", action: #selector(analyzeClicked), keyEquivalent: "g")
        analyzeItem.keyEquivalentModifierMask = [.command, .shift]
        analyzeItem.target = self
        menu.addItem(analyzeItem)

        let selectImageItem = NSMenuItem(title: "选择图片分析...", action: #selector(selectImageClicked), keyEquivalent: "o")
        selectImageItem.keyEquivalentModifierMask = [.command]
        selectImageItem.target = self
        menu.addItem(selectImageItem)

        menu.addItem(NSMenuItem.separator())

        let settingsItem = NSMenuItem(title: "设置...", action: #selector(settingsClicked), keyEquivalent: ",")
        settingsItem.target = self
        menu.addItem(settingsItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "退出", action: #selector(quitClicked), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem?.menu = menu
    }

    @objc private func menuBarClicked(_ sender: NSStatusBarButton) {
        guard let event = NSApp.currentEvent else { return }

        if event.type == .rightMouseUp {
            statusItem?.menu = statusItem?.menu
        } else {
            // Left click - show menu
            statusItem?.button?.performClick(nil)
        }
    }

    @objc private func analyzeClicked() {
        onAnalyze?()
    }

    @objc private func selectImageClicked() {
        onSelectImage?()
    }

    @objc private func settingsClicked() {
        onSettings?()
    }

    @objc private func quitClicked() {
        onQuit?()
    }
}
