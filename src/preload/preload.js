'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gamerAgent', Object.freeze({
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  listCaptureSources: () => ipcRenderer.invoke('capture:list-sources'),
  captureSource: (sourceId) => ipcRenderer.invoke('capture:take', sourceId),
  chooseImage: () => ipcRenderer.invoke('capture:choose-image'),
  discardPreview: (previewToken) => ipcRenderer.invoke('capture:discard', previewToken),
  analyzePreview: (previewToken, confirmedDisclosure) => ipcRenderer.invoke('analysis:run', {
    previewToken,
    confirmedDisclosure
  })
}));
