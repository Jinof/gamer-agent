'use strict';

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('gamerAgent', Object.freeze({
  bootstrap: async () => ({
    endpoint: '',
    model: '',
    hasApiKey: false,
    configured: false,
    serviceName: ''
  }),
  saveSettings: async () => {
    throw new Error('UI smoke preview does not persist settings.');
  },
  listCaptureSources: async () => [],
  captureSource: async () => null,
  chooseImage: async () => null,
  discardPreview: async () => true,
  analyzePreview: async () => null
}));
