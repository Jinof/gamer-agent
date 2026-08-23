import AppKit
import CoreGraphics

class ScreenshotService {

    init() {}

    func captureScreen() -> CGImage? {
        // Get the main screen bounds
        guard let screen = NSScreen.main else {
            return nil
        }

        let screenRect = screen.frame

        // Capture the screen
        let screenshot = CGWindowListCreateImage(
            screenRect,
            .optionOnScreenOnly,
            kCGNullWindowID,
            [.bestResolution, .boundsIgnoreFraming]
        )

        return screenshot
    }

    func captureWindow(windowID: UInt32) -> CGImage? {
        let screenshot = CGWindowListCreateImage(
            CGRect.null,
            .optionIncludingWindow,
            windowID,
            [.bestResolution, .boundsIgnoreFraming]
        )
        return screenshot
    }

    func getWindowList() -> [WindowInfo] {
        guard let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else {
            return []
        }

        var windows: [WindowInfo] = []

        for window in windowList {
            guard let windowID = window[kCGWindowNumber as String] as? UInt32,
                  let ownerName = window[kCGWindowOwnerName as String] as? String,
                  let boundsDict = window[kCGWindowBounds as String] as? [String: CGFloat],
                  let layer = window[kCGWindowLayer as String] as? Int else {
                continue
            }

            // Skip windows with no visible size
            let x = boundsDict["X"] ?? 0
            let y = boundsDict["Y"] ?? 0
            let width = boundsDict["Width"] ?? 0
            let height = boundsDict["Height"] ?? 0

            if width < 50 || height < 50 {
                continue
            }

            // Skip system UI elements (layer > 0 means above normal window)
            if layer > 0 {
                continue
            }

            let windowName = window[kCGWindowName as String] as? String ?? ""

            let bounds = CGRect(x: x, y: y, width: width, height: height)

            windows.append(WindowInfo(
                id: windowID,
                ownerName: ownerName,
                windowName: windowName,
                bounds: bounds,
                layer: layer
            ))
        }

        return windows
    }

    func captureScreenWithMenu() -> CGImage? {
        // This captures the screen including menu bar
        guard let screen = NSScreen.main else {
            return nil
        }

        let screenRect = screen.frame

        return CGWindowListCreateImage(
            screenRect,
            .optionOnScreenOnly,
            kCGNullWindowID,
            [.bestResolution, .boundsIgnoreFraming]
        )
    }

    func checkPermission() -> Bool {
        return CGPreflightScreenCaptureAccess()
    }

    func requestPermission() {
        _ = CGRequestScreenCaptureAccess()
    }

    func imageToBase64(_ image: CGImage) -> String? {
        let bitmapRep = NSBitmapImageRep(cgImage: image)
        guard let pngData = bitmapRep.representation(using: .png, properties: [:]) else {
            return nil
        }
        return pngData.base64EncodedString()
    }
}
