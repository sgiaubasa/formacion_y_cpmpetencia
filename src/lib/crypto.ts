import crypto from 'crypto';

const SECRET = (process.env.DATABASE_URL || "default_fallback_secret_for_signing").padEnd(32, '0').substring(0, 32);

export function encryptRecordId(id: number, role: "empleado" | "instructor" = "empleado"): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET), iv);
  const payload = `${id}|${role}`;
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + '-' + encrypted;
}

export function decryptRecordToken(token: string): { recordId: number; role: "empleado" | "instructor" } | null {
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

    if (decrypted.includes('|')) {
      const [idStr, roleStr] = decrypted.split('|');
      const parsed = parseInt(idStr, 10);
      if (isNaN(parsed)) return null;
      return {
        recordId: parsed,
        role: roleStr === 'instructor' ? 'instructor' : 'empleado'
      };
    }

    const parsed = parseInt(decrypted, 10);
    if (isNaN(parsed)) return null;
    return { recordId: parsed, role: 'empleado' };
  } catch (e) {
    return null;
  }
}

export function decryptRecordId(token: string): number | null {
  const res = decryptRecordToken(token);
  return res ? res.recordId : null;
}
