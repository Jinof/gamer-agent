'use strict';

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_MODEL_LENGTH = 200;

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function normalizeSettings(input) {
  const endpoint = String(input?.endpoint ?? '').trim();
  const model = String(input?.model ?? '').trim();

  if (!endpoint) {
    throw new ConfigurationError('请填写模型服务的完整 API 地址。');
  }
  if (endpoint.length > MAX_ENDPOINT_LENGTH) {
    throw new ConfigurationError('模型服务地址过长。');
  }
  if (!model) {
    throw new ConfigurationError('请填写模型名称。');
  }
  if (model.length > MAX_MODEL_LENGTH) {
    throw new ConfigurationError('模型名称过长。');
  }

  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new ConfigurationError('模型服务地址不是有效 URL。');
  }

  if (parsed.username || parsed.password) {
    throw new ConfigurationError('请勿把密钥写入模型服务地址。');
  }

  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
    throw new ConfigurationError('远程模型服务必须使用 HTTPS；仅本机 localhost 可使用 HTTP。');
  }

  return Object.freeze({
    endpoint: parsed.toString(),
    model
  });
}

function publicConfiguration(settings, hasApiKey) {
  const endpoint = String(settings?.endpoint ?? '');
  const model = String(settings?.model ?? '');
  let serviceName = '';

  try {
    serviceName = new URL(endpoint).host;
  } catch {
    serviceName = '';
  }

  return {
    endpoint,
    model,
    hasApiKey: Boolean(hasApiKey),
    configured: Boolean(endpoint && model && hasApiKey),
    serviceName
  };
}

module.exports = {
  ConfigurationError,
  normalizeSettings,
  publicConfiguration
};
