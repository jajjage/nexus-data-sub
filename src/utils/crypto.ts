import crypto, { timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param length - The length of the token in bytes (default: 32)
 * @returns A hex-encoded secure token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string with custom alphabet
 * @param length - The length of the string
 * @param alphabet - Custom alphabet to use (default: alphanumeric)
 * @returns A secure random string
 */
export function generateSecureString(
  length: number = 16,
  alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }

  return result;
}

/**
 * Generate a secure UUID v4
 * @returns A UUID v4 string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a value using SHA-256
 * @param value - The value to hash
 * @returns The SHA-256 hash as hex string
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Hash a backup code using SHA-256 with a salt
 * @param code - The backup code to hash
 * @returns The SHA-256 hash as hex string
 */
export function hashBackupCode(code: string): string {
  const salt = process.env.BACKUP_CODE_SALT || 'default-backup-code-salt';
  return crypto
    .createHash('sha256')
    .update(code + salt)
    .digest('hex');
}

/**
 * Hash const-time comparison
 * @param code_a - The backup code hash in db
 * @param code_b - The backup code hash user passs
 * @returns The time safe equal
 */
export function safeCompare(code_a: string, code_b: string): boolean {
  const bufA = Buffer.from(code_a, 'utf8');
  const bufB = Buffer.from(code_b, 'utf8');
  if (bufA.length != bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
