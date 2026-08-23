'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

class CredentialVaultError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CredentialVaultError';
  }
}

class CredentialVault {
  constructor({ safeStorage, userDataPath }) {
    this.safeStorage = safeStorage;
    this.filePath = path.join(userDataPath, 'credentials.bin');
  }

  assertAvailable() {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new CredentialVaultError('系统安全存储当前不可用，API Key 未保存。');
    }
  }

  async hasApiKey() {
    try {
      const stats = await fs.stat(this.filePath);
      return stats.isFile() && stats.size > 0;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async saveApiKey(apiKey) {
    const normalized = String(apiKey ?? '').trim();
    if (!normalized) {
      throw new CredentialVaultError('API Key 不能为空。');
    }
    if (normalized.length > 8192) {
      throw new CredentialVaultError('API Key 长度异常。');
    }

    this.assertAvailable();
    const encrypted = await this.safeStorage.encryptStringAsync(normalized);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await fs.writeFile(temporaryPath, encrypted, { mode: 0o600 });
    await fs.rename(temporaryPath, this.filePath);
  }

  async loadApiKey() {
    this.assertAvailable();
    let encrypted;
    try {
      encrypted = await fs.readFile(this.filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new CredentialVaultError('请先在设置中保存 API Key。');
      }
      throw error;
    }
    return this.safeStorage.decryptStringAsync(encrypted);
  }

  async clearApiKey() {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

module.exports = {
  CredentialVault,
  CredentialVaultError
};
