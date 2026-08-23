'use strict';

const elements = {
  analyzeButton: document.querySelector('#analyze-button'),
  apiKey: document.querySelector('#api-key'),
  captureAvailability: document.querySelector('#capture-availability'),
  captureAvailabilityText: document.querySelector('#capture-availability-text'),
  captureButton: document.querySelector('#capture-button'),
  captureSource: document.querySelector('#capture-source'),
  chooseImageButton: document.querySelector('#choose-image-button'),
  clearApiKey: document.querySelector('#clear-api-key'),
  clearKeyRow: document.querySelector('#clear-key-row'),
  configurationStatus: document.querySelector('#configuration-status'),
  consentCopy: document.querySelector('#consent-copy'),
  discardPreview: document.querySelector('#discard-preview'),
  dismissError: document.querySelector('#dismiss-error'),
  endpoint: document.querySelector('#endpoint'),
  errorCard: document.querySelector('#error-card'),
  errorMessage: document.querySelector('#error-message'),
  keyHelp: document.querySelector('#key-help'),
  model: document.querySelector('#model'),
  newAnalysis: document.querySelector('#new-analysis'),
  previewCard: document.querySelector('#preview-card'),
  previewImage: document.querySelector('#preview-image'),
  previewMeta: document.querySelector('#preview-meta'),
  processingCard: document.querySelector('#processing-card'),
  processingTarget: document.querySelector('#processing-target'),
  refreshSources: document.querySelector('#refresh-sources'),
  resultCard: document.querySelector('#result-card'),
  resultContent: document.querySelector('#result-content'),
  resultMeta: document.querySelector('#result-meta'),
  saveSettings: document.querySelector('#save-settings'),
  sendConsent: document.querySelector('#send-consent'),
  settingsForm: document.querySelector('#settings-form'),
  settingsMessage: document.querySelector('#settings-message'),
  unconfiguredCard: document.querySelector('#unconfigured-card')
};

const state = {
  configuration: {
    endpoint: '',
    model: '',
    hasApiKey: false,
    configured: false,
    serviceName: ''
  },
  previewToken: null,
  busy: false
};

function errorMessage(error) {
  return String(error?.message ?? error ?? '操作失败，请重试。').replace(/^Error invoking remote method '[^']+': Error: /, '');
}

function setHidden(element, hidden) {
  element.classList.toggle('hidden', hidden);
}

function updateConfiguration(configuration) {
  state.configuration = configuration;
  elements.endpoint.value = configuration.endpoint || '';
  elements.model.value = configuration.model || '';
  elements.apiKey.value = '';
  elements.clearApiKey.checked = false;

  elements.configurationStatus.textContent = configuration.configured ? '已就绪' : '未配置';
  elements.configurationStatus.classList.toggle('ready', configuration.configured);
  setHidden(elements.unconfiguredCard, configuration.configured);
  setHidden(elements.clearKeyRow, !configuration.hasApiKey);
  elements.keyHelp.textContent = configuration.hasApiKey
    ? '已由系统安全存储保护。留空表示继续使用；更换服务地址时请重新输入 Key。'
    : 'Key 不会写入普通设置文件，也不会显示在界面中。';

  elements.refreshSources.disabled = !configuration.configured || state.busy;
  elements.chooseImageButton.disabled = !configuration.configured || state.busy;
  elements.captureButton.disabled =
    !configuration.configured || state.busy || !elements.captureSource.value;

  const target = configuration.serviceName || '你配置的模型服务';
  elements.consentCopy.textContent = `我确认将这张图片发送给 ${target} 进行分析。`;
  elements.processingTarget.textContent = `已发送至 ${target}，请稍候。`;
}

function setBusy(busy) {
  state.busy = busy;
  elements.saveSettings.disabled = busy;
  elements.refreshSources.disabled = busy || !state.configuration.configured;
  elements.chooseImageButton.disabled = busy || !state.configuration.configured;
  elements.captureButton.disabled =
    busy || !state.configuration.configured || !elements.captureSource.value;
  elements.discardPreview.disabled = busy;
  elements.analyzeButton.disabled = busy || !elements.sendConsent.checked || !state.previewToken;
}

function showError(message, { discardPreview = false } = {}) {
  if (discardPreview) {
    state.previewToken = null;
    elements.sendConsent.checked = false;
    setHidden(elements.previewCard, true);
  }
  elements.errorMessage.textContent = message;
  setHidden(elements.processingCard, true);
  setHidden(elements.errorCard, false);
}

function clearError() {
  setHidden(elements.errorCard, true);
  elements.errorMessage.textContent = '';
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function showPreview(preview) {
  clearError();
  setHidden(elements.resultCard, true);
  setHidden(elements.processingCard, true);
  state.previewToken = preview.previewToken;
  elements.previewImage.src = preview.previewDataUrl;
  elements.previewMeta.textContent = `${preview.sourceName} · ${formatBytes(preview.bytes)} · 尚未发送`;
  elements.sendConsent.checked = false;
  elements.analyzeButton.disabled = true;
  setHidden(elements.previewCard, false);
  elements.previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function discardCurrentPreview() {
  if (state.previewToken) {
    await window.gamerAgent.discardPreview(state.previewToken);
  }
  state.previewToken = null;
  elements.previewImage.removeAttribute('src');
  elements.sendConsent.checked = false;
  setHidden(elements.previewCard, true);
}

async function refreshSources() {
  clearError();
  setBusy(true);
  elements.captureAvailability.className = 'capture-availability checking';
  elements.captureAvailabilityText.textContent = '正在检查本机来源…';
  elements.captureSource.innerHTML = '<option value="">正在读取本机桌面与窗口…</option>';
  elements.captureSource.disabled = true;

  try {
    const sources = await window.gamerAgent.listCaptureSources();
    elements.captureSource.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = sources.length ? '请选择桌面或窗口' : '没有找到可截图目标';
    elements.captureSource.appendChild(placeholder);

    const screenGroup = document.createElement('optgroup');
    screenGroup.label = '桌面';
    const windowGroup = document.createElement('optgroup');
    windowGroup.label = '窗口';

    for (const source of sources) {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.name;
      (source.kind === 'screen' ? screenGroup : windowGroup).appendChild(option);
    }

    if (screenGroup.children.length) elements.captureSource.appendChild(screenGroup);
    if (windowGroup.children.length) elements.captureSource.appendChild(windowGroup);
    elements.captureSource.disabled = sources.length === 0;
    elements.captureAvailability.className = sources.length
      ? 'capture-availability ready'
      : 'capture-availability error';
    elements.captureAvailabilityText.textContent = sources.length
      ? `可用（发现 ${sources.length} 个来源）`
      : '未发现可用来源';
  } catch (error) {
    elements.captureSource.innerHTML = '<option value="">读取失败</option>';
    elements.captureAvailability.className = 'capture-availability error';
    elements.captureAvailabilityText.textContent = '被系统、组织策略或运行环境阻止';
    showError(errorMessage(error));
  } finally {
    setBusy(false);
  }
}

elements.settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();
  elements.settingsMessage.classList.remove('error');
  elements.settingsMessage.textContent = '正在安全保存…';
  setBusy(true);

  try {
    const configuration = await window.gamerAgent.saveSettings({
      endpoint: elements.endpoint.value,
      model: elements.model.value,
      apiKey: elements.apiKey.value,
      clearApiKey: elements.clearApiKey.checked
    });
    updateConfiguration(configuration);
    elements.settingsMessage.textContent = configuration.configured
      ? '设置已保存，可以开始截图分析。'
      : '地址与模型已保存，请补充 API Key。';
  } catch (error) {
    elements.settingsMessage.classList.add('error');
    elements.settingsMessage.textContent = errorMessage(error);
  } finally {
    setBusy(false);
  }
});

elements.refreshSources.addEventListener('click', refreshSources);

elements.captureSource.addEventListener('change', () => {
  elements.captureButton.disabled =
    state.busy || !state.configuration.configured || !elements.captureSource.value;
});

elements.captureButton.addEventListener('click', async () => {
  clearError();
  setBusy(true);
  try {
    const preview = await window.gamerAgent.captureSource(elements.captureSource.value);
    showPreview(preview);
  } catch (error) {
    showError(errorMessage(error));
  } finally {
    setBusy(false);
  }
});

elements.chooseImageButton.addEventListener('click', async () => {
  clearError();
  setBusy(true);
  try {
    const preview = await window.gamerAgent.chooseImage();
    if (preview) showPreview(preview);
  } catch (error) {
    showError(errorMessage(error));
  } finally {
    setBusy(false);
  }
});

elements.sendConsent.addEventListener('change', () => {
  elements.analyzeButton.disabled = state.busy || !elements.sendConsent.checked || !state.previewToken;
});

elements.discardPreview.addEventListener('click', async () => {
  setBusy(true);
  try {
    await discardCurrentPreview();
  } catch (error) {
    showError(errorMessage(error));
  } finally {
    setBusy(false);
  }
});

elements.analyzeButton.addEventListener('click', async () => {
  if (!state.previewToken || !elements.sendConsent.checked) return;

  clearError();
  setHidden(elements.previewCard, true);
  setHidden(elements.resultCard, true);
  setHidden(elements.processingCard, false);
  setBusy(true);
  const token = state.previewToken;

  try {
    const result = await window.gamerAgent.analyzePreview(token, true);
    state.previewToken = null;
    elements.resultContent.textContent = result.analysis;
    const analyzedAt = new Date(result.analyzedAt).toLocaleString('zh-CN');
    elements.resultMeta.textContent = `${result.sourceName} · ${analyzedAt}`;
    setHidden(elements.processingCard, true);
    setHidden(elements.resultCard, false);
    elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showError(`${errorMessage(error)} 预览令牌已作废，请重新截取或选图。`, { discardPreview: true });
  } finally {
    setBusy(false);
  }
});

elements.newAnalysis.addEventListener('click', () => {
  setHidden(elements.resultCard, true);
  document.querySelector('.capture-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

elements.dismissError.addEventListener('click', clearError);

window.addEventListener('beforeunload', () => {
  if (state.previewToken) window.gamerAgent.discardPreview(state.previewToken);
});

(async function bootstrap() {
  try {
    const configuration = await window.gamerAgent.bootstrap();
    updateConfiguration(configuration);
  } catch (error) {
    showError(errorMessage(error));
  }
})();
