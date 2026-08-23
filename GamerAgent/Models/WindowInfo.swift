import Foundation

struct WindowInfo: Identifiable, Hashable {
    let id: UInt32
    let ownerName: String
    let windowName: String
    let bounds: CGRect
    let layer: Int

    var displayName: String {
        if windowName.isEmpty {
            return ownerName
        }
        return "\(ownerName) - \(windowName)"
    }
}
