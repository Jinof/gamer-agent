'use strict';

const { randomUUID } = require('node:crypto');

class PendingCaptureError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PendingCaptureError';
  }
}

class PendingCaptureStore {
  constructor({ now = () => Date.now(), ttlMs = 10 * 60 * 1000 } = {}) {
    this.now = now;
    this.ttlMs = ttlMs;
    this.pending = null;
  }

  put({ buffer, mediaType, sourceName }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new PendingCaptureError('无法保存空截图。');
    }

    const token = randomUUID();
    this.pending = {
      token,
      buffer,
      mediaType,
      sourceName,
      expiresAt: this.now() + this.ttlMs
    };
    return token;
  }

  take(token) {
    const item = this.pending;
    this.pending = null;

    if (!item || item.token !== token) {
      throw new PendingCaptureError('本地预览已失效，请重新截图或选图。');
    }
    if (this.now() > item.expiresAt) {
      throw new PendingCaptureError('本地预览已过期，请重新截图或选图。');
    }

    return item;
  }

  discard(token) {
    if (!this.pending || (token && this.pending.token !== token)) {
      return false;
    }
    this.pending = null;
    return true;
  }
}

function assertExplicitAnalysisConsent(request) {
  if (!request || request.confirmedDisclosure !== true) {
    throw new PendingCaptureError('发送前必须明确确认屏幕内容将交给所配置的模型服务。');
  }
  if (typeof request.previewToken !== 'string' || !request.previewToken) {
    throw new PendingCaptureError('缺少有效的本地预览。');
  }
}

module.exports = {
  PendingCaptureError,
  PendingCaptureStore,
  assertExplicitAnalysisConsent
};
