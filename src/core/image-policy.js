'use strict';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

class ImagePolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImagePolicyError';
  }
}

function detectImageMediaType(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function validateImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImagePolicyError('图片为空或无法读取。');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ImagePolicyError('图片超过 20 MB，请选择更小的图片。');
  }

  const mediaType = detectImageMediaType(buffer);
  if (!mediaType) {
    throw new ImagePolicyError('仅支持 PNG、JPEG 或 WebP 图片。');
  }

  return Object.freeze({ mediaType, bytes: buffer.length });
}

module.exports = {
  ImagePolicyError,
  MAX_IMAGE_BYTES,
  detectImageMediaType,
  validateImage
};
