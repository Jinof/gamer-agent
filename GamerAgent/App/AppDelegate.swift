import AppKit
import SwiftUI
import Combine

class AppDelegate: NSObject, NSApplicationDelegate {
    private var menuBarController: MenuBarController?
    private var hotkeyManager: HotkeyManager?
    private var screenshotService: ScreenshotService?
    private var llmAgentService: LLMAgentService?
    private var resultOverlayWindow: ResultOverlayWindow?
    private var settingsWindow: SettingsWindow?
    private var cancellables = Set<AnyCancellable>()

    func applicationDidFinishLaunching(_ notification: Notification) {
        logInfo("GamerAgent starting...")

        // Initialize services
        screenshotService = ScreenshotService()
        llmAgentService = LLMAgentService()
        resultOverlayWindow = ResultOverlayWindow()
        logInfo("Services initialized")

        // Initialize hotkey manager
        hotkeyManager = HotkeyManager()
        hotkeyManager?.onHotkeyPressed = { [weak self] in
            self?.handleHotkeyPressed()
        }
        hotkeyManager?.start()
        logInfo("Hotkey manager started")

        // Initialize menu bar
        menuBarController = MenuBarController(
            onAnalyze: { [weak self] in
                self?.handleHotkeyPressed()
            },
            onSelectImage: { [weak self] in
                self?.handleSelectImage()
            },
            onSettings: { [weak self] in
                self?.showSettings()
            },
            onQuit: {
                NSApplication.shared.terminate(nil)
            }
        )
        logInfo("Menu bar initialized")

        // Check permissions on first launch
        checkPermissions()
    }

    func applicationWillTerminate(_ notification: Notification) {
        hotkeyManager?.stop()
    }

    private func handleHotkeyPressed() {
        logInfo("Hotkey pressed, starting capture...")

        // Check if screenshot service has permission
        guard screenshotService?.checkPermission() == true else {
            logWarning("Screen capture permission not granted")
            requestScreenCapturePermission()
            return
        }

        // Check if hotkey manager has permission
        guard hotkeyManager?.checkPermission() == true else {
            logWarning("Accessibility permission not granted")
            requestAccessibilityPermission()
            return
        }

        // Capture screenshot (based on selected window)
        let selectedWindowID = AppSettings.shared.selectedWindowID
        let screenshot: CGImage?

        if selectedWindowID == 0 {
            logDebug("Capturing full screen")
            screenshot = screenshotService?.captureScreen()
        } else {
            logDebug("Capturing window ID: \(selectedWindowID)")
            screenshot = screenshotService?.captureWindow(windowID: selectedWindowID)
        }

        guard let capturedImage = screenshot else {
            logError("Screenshot capture failed")
            showError("截图失败")
            return
        }

        logInfo("Screenshot captured successfully")

        // Show processing indicator
        resultOverlayWindow?.showProcessing()

        // Send to LLM
        llmAgentService?.analyzeScreenshot(capturedImage) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    logInfo("LLM analysis successful")
                    self?.resultOverlayWindow?.showResult(response)
                case .failure(let error):
                    logError("LLM analysis failed: \(error.localizedDescription)")
                    self?.showError(error.localizedDescription)
                }
            }
        }
    }

    private func checkPermissions() {
        if screenshotService?.checkPermission() != true {
            requestScreenCapturePermission()
        }

        if hotkeyManager?.checkPermission() != true {
            requestAccessibilityPermission()
        }
    }

    private func requestScreenCapturePermission() {
        _ = CGPreflightScreenCaptureAccess()
    }

    private func requestAccessibilityPermission() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        AXIsProcessTrustedWithOptions(options as CFDictionary)
    }

    private func showSettings() {
        if settingsWindow == nil {
            settingsWindow = SettingsWindow()
        }
        settingsWindow?.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func showError(_ message: String) {
        resultOverlayWindow?.showError(message)
    }

    private func handleSelectImage() {
        logInfo("Opening image selection...")

        let openPanel = NSOpenPanel()
        openPanel.canChooseFiles = true
        openPanel.canChooseDirectories = false
        openPanel.allowsMultipleSelection = false
        openPanel.allowedContentTypes = [.image, .png, .jpeg, .gif, .bmp, .tiff]
        openPanel.message = "选择一张图片进行分析"
        openPanel.prompt = "分析"

        openPanel.begin { [weak self] response in
            guard response == .OK, let url = openPanel.url else {
                logInfo("Image selection cancelled")
                return
            }

            logInfo("Image selected: \(url.lastPathComponent)")

            // Load the image
            guard let image = NSImage(contentsOf: url),
                  let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
                logError("Failed to load image: \(url.lastPathComponent)")
                self?.showError("无法加载图片")
                return
            }

            logInfo("Image loaded successfully, sending to LLM...")

            // Show processing indicator
            self?.resultOverlayWindow?.showProcessing()

            // Send to LLM
            self?.llmAgentService?.analyzeScreenshot(cgImage) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let response):
                        logInfo("LLM analysis successful")
                        self?.resultOverlayWindow?.showResult(response)
                    case .failure(let error):
                        logError("LLM analysis failed: \(error.localizedDescription)")
                        self?.showError(error.localizedDescription)
                    }
                }
            }
        }
    }
}
