'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PendingCaptureError,
  PendingCaptureStore,
  assertExplicitAnalysisConsent
} = require('../src/core/pending-capture-store');

test('a local preview token is single-use', () => {
  const store = new PendingCaptureStore();
  const token = store.put({
    buffer: Buffer.from('image'),
    mediaType: 'image/png',
    sourceName: '桌面 1'
  });

  assert.equal(store.take(token).sourceName, '桌面 1');
  assert.throws(() => store.take(token), PendingCaptureError);
});

test('a preview expires and cannot be sent', () => {
  let now = 100;
  const store = new PendingCaptureStore({ now: () => now, ttlMs: 50 });
  const token = store.put({
    buffer: Buffer.from('image'),
    mediaType: 'image/png',
    sourceName: '窗口'
  });
  now = 151;

  assert.throws(() => store.take(token), /已过期/);
});

test('analysis requires an explicit disclosure confirmation and preview token', () => {
  assert.throws(
    () => assertExplicitAnalysisConsent({ previewToken: 'token', confirmedDisclosure: false }),
    /必须明确确认/
  );
  assert.throws(
    () => assertExplicitAnalysisConsent({ confirmedDisclosure: true }),
    /缺少有效/
  );
  assert.doesNotThrow(() =>
    assertExplicitAnalysisConsent({ previewToken: 'token', confirmedDisclosure: true })
  );
});
