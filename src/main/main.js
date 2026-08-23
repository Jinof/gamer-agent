'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  safeStorage,
  session
} = require('electron');
const { normalizeSettings, publicConfiguration } = require('../core/config');
const { validateImage } = require('../core/image-policy');
const {
  PendingCaptureStore,
  assertExplicitAnalysisConsent
} = require('../core/pending-capture-store');
const { CaptureService } = require('./services/capture-service');
const { CredentialVault } = require('./services/credential-vault');
const { ModelService } = require('./services/model-service');
const { SettingsStore } = require('./services/settings-store');

const pendingCaptures = new PendingCaptureStore();
const captureService = new CaptureService(desktopCapturer);
const modelService = new ModelService();

let mainWindow = null;
let settingsStore = null;
let credentialVault = null;

function assertTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('拒绝来自未知页面的请求。');
  }
}

function userFacingError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(message || '操作失败，请重试。');
}

async function getPublicConfiguration() {
  const settings = await settingsStore.load();
  const hasApiKey = await credentialVault.hasApiKey();
  return publicConfiguration(settings, hasApiKey);
}

function previewPayload(item, token) {
  return {
    previewToken: token,
    previewDataUrl: `data:${item.mediaType};base64,${item.buffer.toString('base64')}`,
    sourceName: item.sourceName,
    bytes: item.buffer.length
  };
}

function registerIpcHandlers() {
  ipcMain.handle('app:bootstrap', async (event) => {
    assertTrustedSender(event);
    return getPublicConfiguration();
  });

  ipcMain.handle('settings:save', async (event, request) => {
    assertTrustedSender(event);
    try {
      const nextSettings = normalizeSettings(request);
      const currentSettings = await settingsStore.load();
      const apiKey = typeof request?.apiKey === 'string' ? request.apiKey.trim() : '';
      const endpointChanged = currentSettings.endpoint && currentSettings.endpoint !== nextSettings.endpoint;

      if (request?.clearApiKey === true || (endpointChanged && !apiKey)) {
        await credentialVault.clearApiKey();
      }
      if (apiKey) {
        await credentialVault.saveApiKey(apiKey);
      }

      await settingsStore.save(nextSettings);
      return getPublicConfiguration();
    } catch (error) {
      throw userFacingError(error);
    }
  });

  ipcMain.handle('capture:list-sources', async (event) => {
    assertTrustedSender(event);
    try {
      return await captureService.listSources();
    } catch (error) {
      throw userFacingError(error);
    }
  });

  ipcMain.handle('capture:take', async (event, sourceId) => {
    assertTrustedSender(event);
    try {
      const item = await captureService.capture(sourceId);
      const token = pendingCaptures.put(item);
      return previewPayload(item, token);
    } catch (error) {
      throw userFacingError(error);
    }
  });

  ipcMain.handle('capture:choose-image', async (event) => {
    assertTrustedSender(event);
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择要分析的截图',
        properties: ['openFile'],
        filters: [
          { name: '游戏截图', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
        ]
      });
      if (result.canceled || result.filePaths.length !== 1) {
        return null;
      }

      const filePath = result.filePaths[0];
      const buffer = await fs.readFile(filePath);
      const metadata = validateImage(buffer);
      const item = {
        buffer,
        mediaType: metadata.mediaType,
        sourceName: path.basename(filePath)
      };
      const token = pendingCaptures.put(item);
      return previewPayload(item, token);
    } catch (error) {
      throw userFacingError(error);
    }
  });

  ipcMain.handle('capture:discard', async (event, previewToken) => {
    assertTrustedSender(event);
    return pendingCaptures.discard(previewToken);
  });

  ipcMain.handle('analysis:run', async (event, request) => {
    assertTrustedSender(event);
    try {
      assertExplicitAnalysisConsent(request);
      const settings = normalizeSettings(await settingsStore.load());
      const apiKey = await credentialVault.loadApiKey();
      const capture = pendingCaptures.take(request.previewToken);
      const analysis = await modelService.analyze({
        settings,
        apiKey,
        buffer: capture.buffer,
        mediaType: capture.mediaType
      });
      return {
        analysis,
        sourceName: capture.sourceName,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      throw userFacingError(error);
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 900,
    minHeight: 660,
    show: false,
    title: 'Gamer Agent - 截图分析',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    pendingCaptures.discard();
    mainWindow = null;
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.jinof.gameragent');
    settingsStore = new SettingsStore(app.getPath('userData'));
    credentialVault = new CredentialVault({ safeStorage, userDataPath: app.getPath('userData') });

    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
    registerIpcHandlers();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}

app.on('window-all-closed', () => {
  pendingCaptures.discard();
  app.quit();
});
