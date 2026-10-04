import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Encrypted on-device book vault.
 *
 * Books downloaded for offline reading are stored in the app's private document
 * directory, encrypted with AES-256-GCM in 1 MiB chunks. The key is generated on
 * this device and kept in the Keychain / Android Keystore-backed SecureStore with
 * THIS_DEVICE_ONLY accessibility, so a copied vault file is useless anywhere else
 * (and Android backups are disabled in app.json).
 *
 * File layout:
 *   [0..3]   magic "DFY1"
 *   [4..7]   chunk size (u32, big endian)
 *   [8..15]  plaintext size (u64, big endian as two u32)
 *   then N sealed chunks: iv(12) | ciphertext(<= chunk) | tag(16)
 * Each chunk is bound to (uuid, index, isLast) via AES-GCM additional data, so chunks
 * cannot be reordered, swapped between books or truncated without detection.
 *
 * The decrypted copy is only ever written to the cache directory for the lifetime of
 * the reader screen (react-native-pdf needs a file path) and is still protected by
 * the publisher's PDF password.
 */

const MAGIC = [0x44, 0x46, 0x59, 0x31];
const HEADER_LEN = 16;
const CHUNK = 1024 * 1024;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_NAME = 'vault.key.v1';
const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const vaultDir = () => new Directory(Paths.document, 'vault');
export const tempDir = () => new Directory(Paths.cache, 'dfy-tmp');

export function ensureDirs() {
  for (const dir of [vaultDir(), tempDir()]) {
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  }
}

let keyPromise: Promise<AESEncryptionKey> | null = null;

async function loadKey(create: boolean): Promise<AESEncryptionKey | null> {
  const hex = await SecureStore.getItemAsync(KEY_NAME, SECURE_OPTS);
  if (hex) return AESEncryptionKey.import(hex, 'hex');
  if (!create) return null;
  const key = await AESEncryptionKey.generate(AESKeySize.AES256);
  await SecureStore.setItemAsync(KEY_NAME, await key.encoded('hex'), SECURE_OPTS);
  return key;
}

function getKey(): Promise<AESEncryptionKey> {
  if (!keyPromise) {
    keyPromise = loadKey(true).then((k) => k!) as Promise<AESEncryptionKey>;
    keyPromise.catch(() => {
      keyPromise = null;
    });
  }
  return keyPromise;
}

/**
 * 'present' / 'missing' when the keychain answered, 'unknown' when it could not be read
 * (e.g. iOS launched the app in the background while the device is locked).
 */
export async function vaultKeyState(): Promise<'present' | 'missing' | 'unknown'> {
  try {
    return (await SecureStore.getItemAsync(KEY_NAME, SECURE_OPTS)) ? 'present' : 'missing';
  } catch {
    return 'unknown';
  }
}

/** Destroys the key, making every existing vault file permanently unreadable. */
export async function destroyVaultKey() {
  keyPromise = null;
  try {
    await SecureStore.deleteItemAsync(KEY_NAME, SECURE_OPTS);
  } catch {}
}

function ascii(text: string) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

const aad = (uuid: string, index: number, last: boolean) => ascii(`dfy1|${uuid}|${index}|${last ? 1 : 0}|${CHUNK}`);

function writeU32(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function readU32(buf: Uint8Array, offset: number) {
  return ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0;
}

export const vaultFile = (uuid: string) => new File(vaultDir(), `${uuid}.dfy`);

const randomName = (prefix: string, ext: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}.${ext}`;

export const newTempFile = (prefix: string, ext = 'tmp') => {
  ensureDirs();
  return new File(tempDir(), randomName(prefix, ext));
};

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

/** Encrypts `source` into the vault as `uuid`. Returns encrypted size in bytes. */
export async function encryptIntoVault(
  source: File,
  uuid: string,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  ensureDirs();
  const key = await getKey();
  const total = source.size ?? 0;
  if (!total) throw new Error('Empty file');

  const partial = new File(vaultDir(), `${uuid}.part`);
  if (partial.exists) partial.delete();
  partial.create();

  const reader = source.open(FileMode.ReadOnly);
  const writer = partial.open(FileMode.Truncate);
  try {
    const header = new Uint8Array(HEADER_LEN);
    header.set(MAGIC, 0);
    writeU32(header, 4, CHUNK);
    writeU32(header, 8, Math.floor(total / 2 ** 32));
    writeU32(header, 12, total >>> 0);
    writer.writeBytes(header);

    const chunks = Math.ceil(total / CHUNK);
    for (let i = 0; i < chunks; i++) {
      if (signal?.aborted) throw new Error('Aborted');
      const len = Math.min(CHUNK, total - i * CHUNK);
      const plain = reader.readBytes(len);
      if (plain.length !== len) throw new Error('Short read');
      const sealed = await aesEncryptAsync(plain, key, { additionalData: aad(uuid, i, i === chunks - 1) });
      writer.writeBytes(await sealed.combined());
      onProgress?.((i + 1) / chunks);
      if (i % 4 === 3) await yieldToUi();
    }
  } catch (e) {
    try {
      writer.close();
    } catch {}
    try {
      partial.delete();
    } catch {}
    throw e;
  } finally {
    try {
      reader.close();
    } catch {}
  }
  writer.close();

  const target = vaultFile(uuid);
  if (target.exists) target.delete();
  await partial.move(target);
  return target.size ?? 0;
}

/**
 * Decrypts a vault entry into a short-lived temp file for the reader.
 * The caller MUST delete the returned file when done (see `deleteQuietly`).
 */
export async function decryptToTemp(uuid: string, onProgress?: (fraction: number) => void): Promise<File> {
  const source = vaultFile(uuid);
  if (!source.exists) throw new Error('Not downloaded');
  const key = await getKey();
  const out = newTempFile('rd', 'pdf');
  out.create();

  const reader = source.open(FileMode.ReadOnly);
  const writer = out.open(FileMode.Truncate);
  try {
    const header = reader.readBytes(HEADER_LEN);
    if (header.length !== HEADER_LEN || MAGIC.some((b, i) => header[i] !== b)) throw new Error('Corrupted file');
    const chunk = readU32(header, 4);
    if (chunk !== CHUNK) throw new Error('Unsupported format');
    const total = readU32(header, 8) * 2 ** 32 + readU32(header, 12);
    if (!total) throw new Error('Corrupted file');
    const chunks = Math.ceil(total / chunk);

    for (let i = 0; i < chunks; i++) {
      const len = Math.min(chunk, total - i * chunk);
      const combined = reader.readBytes(len + IV_LEN + TAG_LEN);
      const sealed = AESSealedData.fromCombined(combined, { ivLength: IV_LEN, tagLength: TAG_LEN });
      const plain = await aesDecryptAsync(sealed, key, { additionalData: aad(uuid, i, i === chunks - 1) });
      if (plain.length !== len) throw new Error('Corrupted chunk');
      writer.writeBytes(plain);
      onProgress?.((i + 1) / chunks);
      if (i % 4 === 3) await yieldToUi();
    }
    // Trailing bytes mean the (unauthenticated) header was tampered with.
    if (reader.readBytes(1).length !== 0) throw new Error('Corrupted file');
    writer.close();
  } catch (e) {
    try {
      writer.close();
    } catch {}
    deleteQuietly(out);
    throw e;
  } finally {
    try {
      reader.close();
    } catch {}
  }
  return out;
}

export function deleteQuietly(file?: File | null) {
  if (!file) return;
  try {
    if (file.exists) file.delete();
  } catch {}
}

export function removeFromVault(uuid: string) {
  deleteQuietly(vaultFile(uuid));
  deleteQuietly(new File(vaultDir(), `${uuid}.part`));
  deleteQuietly(new File(vaultDir(), `${uuid}.jpg`));
}

export function wipeVault() {
  try {
    const dir = vaultDir();
    if (dir.exists) dir.delete();
  } catch {}
  ensureDirs();
}

/**
 * Removes any plaintext leftovers: decrypted reader copies, half-finished downloads,
 * stream caches and print files. Run ONLY at app start — it would also delete files
 * belonging to downloads/readers that are currently in progress.
 */
export function sweepTemporaryFiles() {
  try {
    const tmp = tempDir();
    if (tmp.exists) tmp.delete();
  } catch {}
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && /\.(pdf|pdf\.tmp)$/i.test(entry.name)) deleteQuietly(entry);
    }
  } catch {}
  try {
    const dir = vaultDir();
    if (dir.exists) {
      for (const entry of dir.list()) {
        if (entry instanceof File && entry.name.endsWith('.part')) deleteQuietly(entry);
      }
    }
  } catch {}
  ensureDirs();
}

export function vaultUsageBytes(): number {
  try {
    const dir = vaultDir();
    if (!dir.exists) return 0;
    return dir.list().reduce((sum, entry) => sum + (entry instanceof File ? entry.size ?? 0 : 0), 0);
  } catch {
    return 0;
  }
}

export function looksLikePdf(file: File): boolean {
  try {
    const handle = file.open(FileMode.ReadOnly);
    const head = handle.readBytes(5);
    handle.close();
    return String.fromCharCode(...Array.from(head)) === '%PDF-';
  } catch {
    return false;
  }
}
