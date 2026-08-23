'use strict';

const { MAX_IMAGE_BYTES, validateImage } = require('../../core/image-policy');

const CAPTURE_SIZE = Object.freeze({ width: 3840, height: 2160 });

class CaptureServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CaptureServiceError';
  }
}

class CaptureService {
  constructor(desktopCapturer) {
    this.desktopCapturer = desktopCapturer;
  }

  async listSources() {
    const sources = await this.desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 0, height: 0 },
      fetchWindowIcons: true
    });

    return sources.map((source) => ({
      id: source.id,
      kind: source.id.startsWith('screen:') ? 'screen' : 'window',
      name: source.name || '未命名窗口',
      iconDataUrl: source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.toDataURL() : null
    }));
  }

  async capture(sourceId) {
    if (typeof sourceId !== 'string' || !/^(screen|window):/.test(sourceId)) {
      throw new CaptureServiceError('请选择有效的桌面或窗口。');
    }

    const type = sourceId.startsWith('screen:') ? 'screen' : 'window';
    const sources = await this.desktopCapturer.getSources({
      types: [type],
      thumbnailSize: CAPTURE_SIZE,
      fetchWindowIcons: false
    });
    const selected = sources.find((source) => source.id === sourceId);

    if (!selected) {
      throw new CaptureServiceError('目标已关闭或不可用，请刷新列表后重试。');
    }
    if (selected.thumbnail.isEmpty()) {
      throw new CaptureServiceError('目标返回空画面。全屏独占或受保护内容可能无法截取。');
    }

    let buffer = selected.thumbnail.toPNG();
    if (buffer.length > MAX_IMAGE_BYTES) {
      buffer = selected.thumbnail.toJPEG(90);
    }
    const metadata = validateImage(buffer);
    return {
      buffer,
      mediaType: metadata.mediaType,
      sourceName: selected.name || (type === 'screen' ? '桌面' : '窗口')
    };
  }
}

module.exports = {
  CAPTURE_SIZE,
  CaptureService,
  CaptureServiceError
};
