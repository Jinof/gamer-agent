import Foundation
import os.log

class Logger {
    static let shared = Logger()

    private let logger: os.Logger
    private let fileManager = FileManager.default
    private var logFileURL: URL?

    enum Level: String {
        case debug = "DEBUG"
        case info = "INFO"
        case warning = "WARNING"
        case error = "ERROR"
    }

    private init() {
        logger = os.Logger(subsystem: "com.gameragent.app", category: "GamerAgent")

        // Create logs directory
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let logsDir = appSupport.appendingPathComponent("GamerAgent/Logs", isDirectory: true)

        do {
            try fileManager.createDirectory(at: logsDir, withIntermediateDirectories: true)
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let logFileName = "GamerAgent-\(dateFormatter.string(from: Date())).log"
            logFileURL = logsDir.appendingPathComponent(logFileName)
        } catch {
            print("Failed to create logs directory: \(error)")
        }
    }

    private func log(_ level: Level, _ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        let fileName = (file as NSString).lastPathComponent
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        let logMessage = "[\(timestamp)] [\(level.rawValue)] [\(fileName):\(line)] \(function) - \(message)"

        // Console output
        switch level {
        case .debug:
            logger.debug("\(message)")
        case .info:
            logger.info("\(message)")
        case .warning:
            logger.warning("\(message)")
        case .error:
            logger.error("\(message)")
        }

        // Also print to stdout for debugging
        print(logMessage)

        // File output
        writeToFile(logMessage)
    }

    private func writeToFile(_ message: String) {
        guard let fileURL = logFileURL else { return }

        do {
            let fileHandle = try FileHandle(forWritingTo: fileURL)
            fileHandle.seekToEndOfFile()
            if let data = (message + "\n").data(using: .utf8) {
                fileHandle.write(data)
            }
            fileHandle.closeFile()
        } catch {
            // File doesn't exist, create it
            do {
                try (message + "\n").write(to: fileURL, atomically: true, encoding: .utf8)
            } catch {
                print("Failed to write log to file: \(error)")
            }
        }
    }

    func debug(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.debug, message, file: file, function: function, line: line)
    }

    func info(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.info, message, file: file, function: function, line: line)
    }

    func warning(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.warning, message, file: file, function: function, line: line)
    }

    func error(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.error, message, file: file, function: function, line: line)
    }

    func getLogFilePath() -> String? {
        return logFileURL?.path
    }

    func getRecentLogs(lineCount: Int = 100) -> String {
        guard let fileURL = logFileURL else {
            return "日志文件不存在"
        }

        do {
            let content = try String(contentsOf: fileURL, encoding: .utf8)
            let lines = content.components(separatedBy: "\n")
            let recentLines = lines.suffix(lineCount)
            return recentLines.joined(separator: "\n")
        } catch {
            return "读取日志失败: \(error.localizedDescription)"
        }
    }
}

// Convenience functions
func logDebug(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
    Logger.shared.debug(message, file: file, function: function, line: line)
}

func logInfo(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
    Logger.shared.info(message, file: file, function: function, line: line)
}

func logWarning(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
    Logger.shared.warning(message, file: file, function: function, line: line)
}

func logError(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
    Logger.shared.error(message, file: file, function: function, line: line)
}
