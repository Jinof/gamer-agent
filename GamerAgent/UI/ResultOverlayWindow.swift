import AppKit
import SwiftUI

class ResultOverlayWindow: NSObject {
    private var panel: NSPanel?
    private var contentView: NSView?
    private var hideTimer: Timer?

    override init() {
        super.init()
        setupPanel()
    }

    private func setupPanel() {
        // Create panel
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 300),
            styleMask: [.nonactivatingPanel, .fullSizeContentView, .titled, .closable],
            backing: .buffered,
            defer: false
        )

        panel.level = .floating
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.titlebarAppearsTransparent = true
        panel.titleVisibility = .hidden
        panel.isMovableByWindowBackground = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

        self.panel = panel
    }

    private func positionWindow() {
        guard let panel = panel, let screen = NSScreen.main else { return }

        let screenFrame = screen.visibleFrame
        let panelFrame = panel.frame

        // Position at top-right corner
        let x = screenFrame.maxX - panelFrame.width - 20
        let y = screenFrame.maxY - panelFrame.height - 20

        panel.setFrameOrigin(NSPoint(x: x, y: y))
    }

    func showProcessing() {
        hideTimer?.invalidate()

        let contentView = NSHostingView(rootView: ProcessingView())
        panel?.contentView = contentView
        self.contentView = contentView

        positionWindow()
        panel?.alphaValue = 0

        panel?.orderFront(nil)

        // Animate in
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            panel?.animator().alphaValue = 1
        }
    }

    func showResult(_ result: CaptureResult) {
        hideTimer?.invalidate()

        let contentView = NSHostingView(rootView: ResultView(result: result))
        panel?.contentView = contentView
        self.contentView = contentView

        positionWindow()
        panel?.alphaValue = 0

        panel?.orderFront(nil)

        // Animate in
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            panel?.animator().alphaValue = 1
        }

        // Auto-hide after 30 seconds
        hideTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: false) { [weak self] _ in
            self?.hide()
        }
    }

    func showError(_ message: String) {
        hideTimer?.invalidate()

        let contentView = NSHostingView(rootView: ErrorView(message: message))
        panel?.contentView = contentView
        self.contentView = contentView

        positionWindow()
        panel?.alphaValue = 0

        panel?.orderFront(nil)

        // Animate in
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            panel?.animator().alphaValue = 1
        }

        // Auto-hide after 10 seconds
        hideTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false) { [weak self] _ in
            self?.hide()
        }
    }

    func hide() {
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            panel?.animator().alphaValue = 0
        } completionHandler: { [weak self] in
            self?.panel?.orderOut(nil)
        }
    }
}

// MARK: - SwiftUI Views

struct ProcessingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("正在分析游戏画面...")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.secondary)
        }
        .frame(width: 200, height: 100)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.regularMaterial)
        )
    }
}

struct ResultView: View {
    let result: CaptureResult

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "brain.head.profile")
                    .foregroundColor(.blue)
                Text("游戏分析")
                    .font(.headline)
                Spacer()
            }

            ScrollView {
                Text(result.analysis)
                    .font(.system(size: 13))
                    .foregroundColor(.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack {
                Spacer()
                Text(formatTime(result.timestamp))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(width: 380, height: 280)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.regularMaterial)
        )
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct ErrorView: View {
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 32))
                .foregroundColor(.orange)

            Text("错误")
                .font(.headline)

            Text(message)
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(width: 280, height: 160)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.regularMaterial)
        )
    }
}
