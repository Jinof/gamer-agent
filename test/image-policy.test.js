'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ImagePolicyError,
  MAX_IMAGE_BYTES,
  detectImageMediaType,
  validateImage
} = require('../src/core/image-policy');

test('detects PNG, JPEG and WebP by file signature', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const webp = Buffer.from('RIFF0000WEBP', 'ascii');

  assert.equal(detectImageMediaType(png), 'image/png');
  assert.equal(detectImageMediaType(jpeg), 'image/jpeg');
  assert.equal(detectImageMediaType(webp), 'image/webp');
});

test('rejects unsupported or oversized content', () => {
  assert.throws(() => validateImage(Buffer.from('<svg></svg>')), ImagePolicyError);
  assert.throws(() => validateImage(Buffer.alloc(MAX_IMAGE_BYTES + 1, 1)), /20 MB/);
});
