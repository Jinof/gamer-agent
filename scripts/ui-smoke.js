'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(os.tmpdir(), 'gamer-agent-ui-smoke.png');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1120,
    height: 780,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'ui-smoke-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await window.loadFile(path.join(projectRoot, 'src', 'renderer', 'index.html'));
  await new Promise((resolve) => setTimeout(resolve, 300));
  const image = await window.webContents.capturePage();
  await fs.writeFile(outputPath, image.toPNG());
  process.stdout.write(`${outputPath}\n`);
  app.quit();
});
