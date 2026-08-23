'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ConfigurationError,
  normalizeSettings,
  publicConfiguration
} = require('../src/core/config');

test('normalizes a user-configured HTTPS model endpoint', () => {
  const result = normalizeSettings({
    endpoint: ' https://model.example/v1/chat/completions ',
    model: ' vision-model '
  });

  assert.deepEqual(result, {
    endpoint: 'https://model.example/v1/chat/completions',
    model: 'vision-model'
  });
});

test('allows HTTP only for a local model service', () => {
  assert.equal(
    normalizeSettings({ endpoint: 'http://127.0.0.1:8080/v1/chat/completions', model: 'local-vlm' }).endpoint,
    'http://127.0.0.1:8080/v1/chat/completions'
  );

  assert.throws(
    () => normalizeSettings({ endpoint: 'http://model.example/v1', model: 'vision-model' }),
    ConfigurationError
  );
});

test('rejects credentials embedded in endpoint URLs', () => {
  assert.throws(
    () => normalizeSettings({ endpoint: 'https://secret@model.example/v1', model: 'vision-model' }),
    /请勿把密钥写入/
  );
});

test('public configuration never exposes a credential', () => {
  assert.deepEqual(
    publicConfiguration(
      { endpoint: 'https://model.example/v1/chat/completions', model: 'vision-model', apiKey: 'must-not-leak' },
      true
    ),
    {
      endpoint: 'https://model.example/v1/chat/completions',
      model: 'vision-model',
      hasApiKey: true,
      configured: true,
      serviceName: 'model.example'
    }
  );
});
