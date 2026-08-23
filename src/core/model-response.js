'use strict';

class ModelResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModelResponseError';
  }
}

function extractAssistantText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .filter((part) => part && (part.type === 'text' || typeof part.text === 'string'))
      .map((part) => String(part.text ?? ''))
      .join('\n')
      .trim();
    if (text) {
      return text;
    }
  }

  throw new ModelResponseError('模型响应中没有可显示的文本。');
}

module.exports = {
  ModelResponseError,
  extractAssistantText
};
