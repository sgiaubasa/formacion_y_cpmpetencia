import nodemailer from 'nodemailer';
import { prisma } from './prisma';

function normalizeEmailList(input?: string | string[]): string {
  if (!input) return '';
  const raw = Array.isArray(input) ? input.join(',') : input;
  return raw
    .split(/[,;]+/)
    .map(e => e.trim())
    .filter(Boolean)
    .join(', ');
}

export async function sendMail({
  to,
  subject,
  html,
  cc,
  from,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  from?: string;
  replyTo?: string;
}): Promise<{ sent: boolean; method?: string; error?: string }> {
  const cleanTo = normalizeEmailList(to);
  const cleanCc = normalizeEmailList(cc);

  if (!cleanTo) {
    return { sent: false, error: 'Sin destinatarios' };
  }

  // Cargar configuración de correo desde AppSetting o variables de entorno
  let dbSettings: Record<string, string> = {};
  try {
    const rows = await prisma.appSetting.findMany({
      where: {
        id: {
          in: [
            'smtp_host',
            'smtp_port',
            'smtp_user',
            'smtp_pass',
            'email_webhook_url',
          ],
        },
      },
    });
    for (const r of rows) {
      if (r.value) dbSettings[r.id] = r.value.trim();
    }
  } catch (e) {
    // Continuar con variables de entorno si falla lectura de AppSetting
  }

  const webhookUrl =
    dbSettings['email_webhook_url'] ||
    process.env.POWER_AUTOMATE_EMAIL_WEBHOOK_URL ||
    '';

  // 1. Intentar envío mediante Webhook de Power Automate (Office 365 Outlook) si está configurado
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanTo,
          cc: cleanCc || '',
          from: from || replyTo || 'rrhh@aubasa.com.ar',
          subject,
          html,
        }),
      });
      if (res.ok) {
        return { sent: true, method: 'webhook' };
      }
    } catch (err) {
      console.error('Error enviando correo por Webhook:', err);
    }
  }

  // 2. Intentar envío mediante SMTP (Gmail / Office 365)
  const smtpHost = dbSettings['smtp_host'] || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(dbSettings['smtp_port'] || process.env.SMTP_PORT || '587', 10);
  const smtpUser = dbSettings['smtp_user'] || process.env.SMTP_USER || '';
  const smtpPass = dbSettings['smtp_pass'] || process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass) {
    console.log('------------------------------------------');
    console.log('Email pendiente de configuración SMTP/Webhook:');
    console.log(`From: ${from || 'Default'}`);
    console.log(`To: ${cleanTo}`);
    console.log(`Cc: ${cleanCc || '-'}`);
    console.log(`Subject: ${subject}`);
    console.log('------------------------------------------');
    return { sent: false, error: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465 || process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: from ? from : `"SGCySV - Capacitaciones" <${smtpUser}>`,
      replyTo: replyTo || undefined,
      to: cleanTo,
      cc: cleanCc || undefined,
      subject,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return { sent: true, method: 'smtp' };
  } catch (error: any) {
    console.error('Error sending email via SMTP:', error);
    return { sent: false, error: error?.message || 'SMTP_ERROR' };
  }
}
