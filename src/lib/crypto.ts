import crypto from 'crypto';

const SECRET = (process.env.DATABASE_URL || "default_fallback_secret_for_signing").padEnd(32, '0').substring(0, 32);

export function encryptRecordId(id: number): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET), iv);
  let encrypted = cipher.update(id.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Usamos guion (-) en lugar de dos puntos (:) para evitar problemas de codificación URL (%3A) en WhatsApp/navegadores
  return iv.toString('hex') + '-' + encrypted;
}

export function decryptRecordId(token: string): number | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = decodeURIComponent(token.trim());
    const parts = decoded.includes(':') ? decoded.split(':') : decoded.split('-');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    const parsed = parseInt(decrypted, 10);
    return isNaN(parsed) ? null : parsed;
  } catch (e) {
    return null;
  }
}
