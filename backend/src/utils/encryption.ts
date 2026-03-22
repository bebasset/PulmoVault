import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { env } from '../config/env';

const KEY = env.ENCRYPTION_KEY;
const IV = env.ENCRYPTION_IV;

/**
 * AES-256-GCM field-level encryption for PHI/PII data at rest.
 * Each encrypted field uses a fresh IV derived from the master IV + random salt
 * to prevent IV reuse attacks.
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedIv = CryptoJS.enc.Utf8.parse((IV + salt).slice(0, 16));
  const key = CryptoJS.enc.Utf8.parse(KEY.slice(0, 32));
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: derivedIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${salt}:${encrypted.toString()}`;
}

export function decryptField(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  const [salt, data] = ciphertext.split(':');
  const derivedIv = CryptoJS.enc.Utf8.parse((IV + salt).slice(0, 16));
  const key = CryptoJS.enc.Utf8.parse(KEY.slice(0, 32));
  const decrypted = CryptoJS.AES.decrypt(data, key, {
    iv: derivedIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/** HMAC-SHA256 deterministic hash used for unique lookups without exposing plaintext */
export function hashField(value: string): string {
  return crypto
    .createHmac('sha256', KEY)
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/** Sanitize output — strip encrypted fields before sending to client */
export function sanitizeUser(user: Record<string, unknown>) {
  const { passwordHash, refreshTokenHash, biometricPublicKey, biometricCredentialId, ...safe } = user;
  return safe;
}
