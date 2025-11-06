import crypto from 'crypto';
import bs58 from 'bs58';

/**
 * Derives an encryption key from transaction ID and master secret
 * Uses SHA-256 for hashing
 */
export function deriveEncryptionKey(transactionId: string): Buffer {
  const masterSecret = process.env.ENCRYPTION_MASTER_SECRET;

  if (!masterSecret) {
    throw new Error('ENCRYPTION_MASTER_SECRET not set in environment');
  }

  // Combine transaction ID with master secret
  const combined = `${transactionId}:${masterSecret}`;

  // Hash to produce 32-byte key for AES-256
  return crypto.createHash('sha256').update(combined).digest();
}

/**
 * Encrypts a Solana private key (Uint8Array or base58 string)
 * Returns: base64-encoded string containing: iv (16 bytes) + authTag (16 bytes) + ciphertext
 */
export function encryptPrivateKey(
  privateKey: Uint8Array | string,
  transactionId: string
): string {
  // Convert to Buffer if Uint8Array or string
  const keyBytes = typeof privateKey === 'string'
    ? Buffer.from(bs58.decode(privateKey))
    : Buffer.from(privateKey);

  // Derive encryption key from transaction ID
  const encryptionKey = deriveEncryptionKey(transactionId);

  // Generate random IV (16 bytes for AES-256-GCM)
  const iv = crypto.randomBytes(16);

  // Encrypt using AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(keyBytes), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: iv + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return as base64
  return combined.toString('base64');
}

/**
 * Decrypts an encrypted private key
 * Returns: Uint8Array of the decrypted private key
 */
export function decryptPrivateKey(
  encryptedData: string,
  transactionId: string
): Uint8Array {
  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract IV (first 16 bytes), authTag (next 16 bytes), and ciphertext (rest)
  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const ciphertext = combined.subarray(32);

  // Derive encryption key
  const encryptionKey = deriveEncryptionKey(transactionId);

  // Decrypt using AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return new Uint8Array(decrypted);
}

/**
 * Test encryption/decryption round-trip
 */
export function testEncryption() {
  const testKey = crypto.randomBytes(64); // Solana private key is 64 bytes
  const testTxId = 'test-tx-123';

  console.log('Original key:', testKey.toString('hex'));

  const encrypted = encryptPrivateKey(testKey, testTxId);
  console.log('Encrypted:', encrypted);

  const decrypted = decryptPrivateKey(encrypted, testTxId);
  console.log('Decrypted:', Buffer.from(decrypted).toString('hex'));

  const match = Buffer.from(testKey).equals(Buffer.from(decrypted));
  console.log('Round-trip successful:', match);

  return match;
}
