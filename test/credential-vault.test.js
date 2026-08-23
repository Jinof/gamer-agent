'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { CredentialVault, CredentialVaultError } = require('../src/main/services/credential-vault');

test('stores only OS-encrypted API key bytes on disk', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gamer-agent-vault-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptStringAsync: async (value) => Buffer.from(`encrypted:${Buffer.from(value).toString('base64')}`),
    decryptStringAsync: async (value) => Buffer.from(value.toString().slice('encrypted:'.length), 'base64').toString()
  };
  const vault = new CredentialVault({ safeStorage, userDataPath: directory });

  await vault.saveApiKey('top-secret-key');
  const diskBytes = await fs.readFile(path.join(directory, 'credentials.bin'), 'utf8');

  assert.equal(diskBytes.includes('top-secret-key'), false);
  assert.equal(await vault.loadApiKey(), 'top-secret-key');
  assert.equal(await vault.hasApiKey(), true);
});

test('refuses to save when OS encryption is unavailable', async () => {
  const vault = new CredentialVault({
    safeStorage: { isEncryptionAvailable: () => false },
    userDataPath: os.tmpdir()
  });

  await assert.rejects(() => vault.saveApiKey('key'), CredentialVaultError);
});
