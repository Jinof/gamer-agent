'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { normalizeSettings } = require('../../core/config');

class SettingsStore {
  constructor(userDataPath) {
    this.filePath = path.join(userDataPath, 'settings.json');
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return normalizeSettings(parsed);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.name === 'ConfigurationError' || error instanceof SyntaxError) {
        return { endpoint: '', model: '' };
      }
      throw error;
    }
  }

  async save(input) {
    const settings = normalizeSettings(input);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600
    });
    await fs.rename(temporaryPath, this.filePath);
    return settings;
  }
}

module.exports = { SettingsStore };
