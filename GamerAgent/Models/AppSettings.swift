import Foundation
import AppKit

class AppSettings: ObservableObject {
    static let shared = AppSettings()

    private let apiKeyKey = "gamer_agent_api_key"
    private let outputModeKey = "gamer_agent_output_mode"
    private let hotkeyKeyCodeKey = "gamer_agent_hotkey_keycode"
    private let hotkeyModifiersKey = "gamer_agent_hotkey_modifiers"
    private let selectedWindowIDKey = "gamer_agent_selected_window_id"

    @Published var apiKey: String {
        didSet {
            UserDefaults.standard.set(apiKey, forKey: apiKeyKey)
        }
    }

    @Published var outputMode: OutputMode {
        didSet {
            UserDefaults.standard.set(outputMode.rawValue, forKey: outputModeKey)
        }
    }

    @Published var hotkeyKeyCode: UInt16 {
        didSet {
            UserDefaults.standard.set(hotkeyKeyCode, forKey: hotkeyKeyCodeKey)
        }
    }

    @Published var hotkeyModifiers: UInt {
        didSet {
            UserDefaults.standard.set(hotkeyModifiers, forKey: hotkeyModifiersKey)
        }
    }

    @Published var selectedWindowID: UInt32 {
        didSet {
            UserDefaults.standard.set(selectedWindowID, forKey: selectedWindowIDKey)
        }
    }

    enum OutputMode: String {
        case text = "text"
        case voice = "voice"
    }

    private init() {
        self.apiKey = UserDefaults.standard.string(forKey: apiKeyKey) ?? ""
        self.outputMode = OutputMode(rawValue: UserDefaults.standard.string(forKey: outputModeKey) ?? "text") ?? .text
        self.hotkeyKeyCode = UInt16(UserDefaults.standard.integer(forKey: hotkeyKeyCodeKey))
        self.hotkeyModifiers = UInt(UserDefaults.standard.integer(forKey: hotkeyModifiersKey))
        self.selectedWindowID = UInt32(UserDefaults.standard.integer(forKey: selectedWindowIDKey))

        // Set defaults if not configured
        if hotkeyKeyCode == 0 {
            self.hotkeyKeyCode = 5  // G key
        }
        if hotkeyModifiers == 0 {
            self.hotkeyModifiers = NSEvent.ModifierFlags.command.rawValue | NSEvent.ModifierFlags.shift.rawValue
        }
    }

    var isConfigured: Bool {
        return !apiKey.isEmpty
    }
}
