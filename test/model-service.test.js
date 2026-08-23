'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractAssistantText, ModelResponseError } = require('../src/core/model-response');
const { ModelService } = require('../src/main/services/model-service');

test('extracts string and structured assistant responses', () => {
  assert.equal(
    extractAssistantText({ choices: [{ message: { content: '  保持掩体。  ' } }] }),
    '保持掩体。'
  );
  assert.equal(
    extractAssistantText({
      choices: [{ message: { content: [{ type: 'text', text: '观察资源。' }, { type: 'text', text: '手动撤退。' }] } }]
    }),
    '观察资源。\n手动撤退。'
  );
  assert.throws(() => extractAssistantText({ choices: [] }), ModelResponseError);
});

test('sends one confirmed image to the user-configured endpoint', async () => {
  let requestUrl;
  let requestOptions;
  const service = new ModelService({
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '建议手动保存资源。' } }] })
      };
    }
  });

  const result = await service.analyze({
    settings: { endpoint: 'https://configured.example/v1/chat/completions', model: 'configured-vlm' },
    apiKey: 'private-key',
    buffer: Buffer.from([0x89, 0x50]),
    mediaType: 'image/png'
  });
  const payload = JSON.parse(requestOptions.body);

  assert.equal(result, '建议手动保存资源。');
  assert.equal(requestUrl, 'https://configured.example/v1/chat/completions');
  assert.equal(requestOptions.headers.Authorization, 'Bearer private-key');
  assert.equal(payload.model, 'configured-vlm');
  assert.match(payload.messages[1].content[1].image_url.url, /^data:image\/png;base64,/);
});
