'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_IMAGE_BYTES } = require('../src/core/image-policy');
const { CaptureService } = require('../src/main/services/capture-service');

function pngBuffer() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function jpegBuffer() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
}

test('lists desktop and window metadata without requesting thumbnails', async () => {
  let options;
  const service = new CaptureService({
    getSources: async (input) => {
      options = input;
      return [
        { id: 'screen:1:0', name: 'Screen 1', appIcon: null },
        { id: 'window:2:0', name: 'Game', appIcon: null }
      ];
    }
  });

  const sources = await service.listSources();

  assert.deepEqual(options.thumbnailSize, { width: 0, height: 0 });
  assert.deepEqual(sources.map(({ kind, name }) => ({ kind, name })), [
    { kind: 'screen', name: 'Screen 1' },
    { kind: 'window', name: 'Game' }
  ]);
});

test('captures only after an explicit target call and compresses oversized PNG data', async () => {
  let requestedTypes;
  let jpegQuality;
  const thumbnail = {
    isEmpty: () => false,
    toPNG: () => Buffer.concat([pngBuffer(), Buffer.alloc(MAX_IMAGE_BYTES)]),
    toJPEG: (quality) => {
      jpegQuality = quality;
      return jpegBuffer();
    }
  };
  const service = new CaptureService({
    getSources: async ({ types }) => {
      requestedTypes = types;
      return [{ id: 'window:22:0', name: 'Selected Game', thumbnail }];
    }
  });

  const result = await service.capture('window:22:0');

  assert.deepEqual(requestedTypes, ['window']);
  assert.equal(jpegQuality, 90);
  assert.equal(result.mediaType, 'image/jpeg');
  assert.equal(result.sourceName, 'Selected Game');
});
