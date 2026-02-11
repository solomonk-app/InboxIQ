import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }
  // Key must be 32 bytes (64 hex characters) for AES-256
  return Buffer.from(key, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64 string containing: IV + ciphertext + auth tag.
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Pack: IV (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypts a token previously encrypted with encryptToken().
 * Returns the original plaintext string.
 */
export function decryptToken(encryptedBase64: string): string {
  const key = getKey();
  const packed = Buffer.from(encryptedBase64, "base64");
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Checks if a string looks like an encrypted token (base64 with expected minimum length).
 * Used to handle migration: existing plaintext tokens won't match this pattern.
 */
export function isEncryptedToken(value: string): boolean {
  // Encrypted tokens are base64 and must have at least IV + authTag (28 bytes = ~40 base64 chars)
  if (value.length < 40) return false;
  try {
    const buf = Buffer.from(value, "base64");
    // Re-encode to check it's valid base64
    return buf.toString("base64") === value;
  } catch {
    return false;
  }
}

/**
 * Safely decrypts a token, falling back to plaintext for unencrypted legacy tokens.
 * This allows graceful migration from plaintext to encrypted storage.
 */
export function safeDecryptToken(value: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    // No encryption key configured — return as-is
    return value;
  }
  if (!isEncryptedToken(value)) {
    // Likely a plaintext legacy token — return as-is
    return value;
  }
  try {
    return decryptToken(value);
  } catch {
    // Decryption failed — treat as plaintext (migration case)
    return value;
  }
}

/**
 * Encrypts a token if TOKEN_ENCRYPTION_KEY is configured, otherwise returns plaintext.
 */
export function safeEncryptToken(plaintext: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    return plaintext;
  }
  return encryptToken(plaintext);
}
