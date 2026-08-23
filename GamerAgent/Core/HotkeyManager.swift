import AppKit
import Carbon.HIToolbox

class HotkeyManager {
    var onHotkeyPressed: (() -> Void)?

    private var globalMonitor: Any?
    private var localMonitor: Any?

    // Default hotkey: Cmd+Shift+G
    private let defaultKeyCode: UInt16 = 5  // G key
    private let defaultModifiers: NSEvent.ModifierFlags = [.command, .shift]

    init() {}

    func start() {
        // Register global key event monitor
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handleKeyEvent(event)
        }

        // Also register local monitor for when app is focused
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if self?.handleKeyEvent(event) == true {
                return nil  // Consume the event
            }
            return event
        }
    }

    func stop() {
        if let globalMonitor = globalMonitor {
            NSEvent.removeMonitor(globalMonitor)
            self.globalMonitor = nil
        }

        if let localMonitor = localMonitor {
            NSEvent.removeMonitor(localMonitor)
            self.localMonitor = nil
        }
    }

    @discardableResult
    private func handleKeyEvent(_ event: NSEvent) -> Bool {
        // Check if the event matches our hotkey
        if event.keyCode == defaultKeyCode {
            let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
            if flags == defaultModifiers {
                DispatchQueue.main.async { [weak self] in
                    self?.onHotkeyPressed?()
                }
                return true
            }
        }
        return false
    }

    func checkPermission() -> Bool {
        return AXIsProcessTrusted()
    }

    func requestPermission() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        AXIsProcessTrustedWithOptions(options as CFDictionary)
    }
}
