'use strict';

const { extractAssistantText } = require('../../core/model-response');

const SYSTEM_PROMPT = [
  '你是只读的游戏截图策略分析助手。',
  '请只依据用户显式提供的当前截图，用中文说明：画面判断、最重要的风险、接下来可由用户手动执行的三条建议。',
  '不要声称你能控制游戏，不要生成自动化、绕过反作弊或后台操作方案。',
  '信息不足时明确说明不确定性，不要臆造截图中看不到的事实。'
].join('');

class ModelServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModelServiceError';
  }
}

class ModelService {
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 60_000 } = {}) {
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async analyze({ settings, apiKey, buffer, mediaType }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(settings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: '请分析这张由我刚刚确认发送的游戏截图。' },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mediaType};base64,${buffer.toString('base64')}` }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 1200
        }),
        signal: controller.signal
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new ModelServiceError(`模型服务返回了无法解析的响应（HTTP ${response.status}）。`);
      }

      if (!response.ok) {
        const remoteMessage = String(payload?.error?.message ?? '').slice(0, 300);
        throw new ModelServiceError(
          remoteMessage
            ? `模型服务请求失败（HTTP ${response.status}）：${remoteMessage}`
            : `模型服务请求失败（HTTP ${response.status}）。`
        );
      }

      return extractAssistantText(payload);
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new ModelServiceError('模型服务响应超时，请检查网络或服务地址。');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = {
  ModelService,
  ModelServiceError,
  SYSTEM_PROMPT
};
