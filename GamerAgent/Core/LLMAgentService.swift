import Foundation
import CoreGraphics
import AppKit

class LLMAgentService {
    private let baseURL = "https://api.minimaxi.com/v1"
    private var apiKey: String = ""

    init() {
        loadAPIKey()
    }

    private func loadAPIKey() {
        // Load API key from UserDefaults (in production, use Keychain)
        apiKey = AppSettings.shared.apiKey
    }

    func analyzeScreenshot(_ screenshot: CGImage, completion: @escaping (Result<CaptureResult, Error>) -> Void) {
        guard !apiKey.isEmpty else {
            completion(.failure(LLMError.noAPIKey))
            return
        }

        // Convert image to base64
        let bitmapRep = NSBitmapImageRep(cgImage: screenshot)
        guard let pngData = bitmapRep.representation(using: .png, properties: [:]),
              let base64Image = pngData.base64EncodedString() as String? else {
            completion(.failure(LLMError.imageConversionFailed))
            return
        }

        // Create request
        let url = URL(string: "\(baseURL)/text/chatcompletion_v2")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "Authorization")

        // Build messages
        let userMessage: [String: Any] = [
            "role": "user",
            "content": [
                [
                    "type": "text",
                    "text": "你是一个游戏助手。请分析这张游戏截图，给出当前游戏状态的分析和策略建议。用中文回复。"
                ],
                [
                    "type": "image_url",
                    "image_url": [
                        "url": "data:image/png;base64,\(base64Image)"
                    ]
                ]
            ]
        ]

        let payload: [String: Any] = [
            "model": "MiniMax-M2.5",
            "messages": [userMessage],
            "temperature": 0.7,
            "max_tokens": 1000
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            completion(.failure(error))
            return
        }

        // Make request
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(LLMError.noData))
                return
            }

            // Parse response
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let choices = json["choices"] as? [[String: Any]],
                   let firstChoice = choices.first,
                   let message = firstChoice["message"] as? [String: Any],
                   let content = message["content"] as? String {

                    let result = CaptureResult(
                        analysis: content,
                        timestamp: Date()
                    )
                    completion(.success(result))
                } else {
                    // Try alternative response format
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let choices = json["choices"] as? [[String: Any]],
                       let firstChoice = choices.first,
                       let message = firstChoice["message"] as? [String: Any],
                       let contentArray = message["content"] as? [[String: Any]],
                       let firstContent = contentArray.first,
                       let text = firstContent["text"] as? String {

                        let result = CaptureResult(
                            analysis: text,
                            timestamp: Date()
                        )
                        completion(.success(result))
                    } else {
                        completion(.failure(LLMError.parseError))
                    }
                }
            } catch {
                completion(.failure(error))
            }
        }

        task.resume()
    }
}

enum LLMError: LocalizedError {
    case noAPIKey
    case imageConversionFailed
    case noData
    case parseError

    var errorDescription: String? {
        switch self {
        case .noAPIKey:
            return "请先在设置中配置 API Key"
        case .imageConversionFailed:
            return "截图转换失败"
        case .noData:
            return "未收到服务器响应"
        case .parseError:
            return "解析响应失败"
        }
    }
}
