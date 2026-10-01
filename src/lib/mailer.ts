import nodemailer from 'nodemailer';
import { prisma } from './prisma';

function parseEmailArray(input?: string | string[]): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(',') : input;
  const parts = raw
    .split(/[,;\s]+/)
    .map(e => e.trim())
    .filter(e => e.includes('@'));
  return Array.from(new Set(parts));
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
}): Promise<{ sent: boolean; method?: string; error?: string; recipients?: string[] }> {
  const toList = parseEmailArray(to);
  const ccList = parseEmailArray(cc);

  if (toList.length === 0) {
    return { sent: false, error: 'Sin destinatarios válidos' };
  }

  // Cargar configuración desde AppSetting o variables de entorno de Vercel
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
    // Ignorar error de lectura de AppSetting
  }

  const DEFAULT_EMAIL_WEBHOOK_URL =
    'https://script.google.com/macros/s/AKfycbyw-ueKzjMoOovNzELKE6H1BT2iHkgJzUEJpFwLF07iydC4g48VodR7oflMeYozG7UTQg/exec';

  const webhookUrl =
    dbSettings['email_webhook_url'] ||
    process.env.POWER_AUTOMATE_EMAIL_WEBHOOK_URL ||
    DEFAULT_EMAIL_WEBHOOK_URL;

  // 1. Si hay un Webhook configurado (Google Apps Script o Power Automate), enviar por HTTPS
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toList.join(','),
          cc: ccList.join(','),
          from: 'RRHH - AUBASA (No Responder)',
          subject,
          html,
        }),
      });
      if (res.ok) {
        try {
          await prisma.appSetting.upsert({
            where: { id: 'last_email_log' },
            update: {
              value: JSON.stringify({
                time: new Date().toISOString(),
                status: 'SENT_WEBHOOK',
                to: toList,
              }),
            },
            create: {
              id: 'last_email_log',
              value: JSON.stringify({
                time: new Date().toISOString(),
                status: 'SENT_WEBHOOK',
                to: toList,
              }),
            },
          });
        } catch {}
        return { sent: true, method: 'webhook', recipients: toList };
      }
    } catch (err: any) {
      console.error('Error enviando correo por Webhook:', err);
    }
  }

  // 2. Envío mediante SMTP (Gmail / Office 365)
  const smtpHost = dbSettings['smtp_host'] || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(dbSettings['smtp_port'] || process.env.SMTP_PORT || '587', 10);
  const smtpUser = dbSettings['smtp_user'] || process.env.SMTP_USER || '';
  const smtpPass = (dbSettings['smtp_pass'] || process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!smtpUser || !smtpPass) {
    try {
      await prisma.appSetting.upsert({
        where: { id: 'last_email_log' },
        update: {
          value: JSON.stringify({
            time: new Date().toISOString(),
            status: 'NO_SMTP_CREDENTIALS',
            to: toList,
          }),
        },
        create: {
          id: 'last_email_log',
          value: JSON.stringify({
            time: new Date().toISOString(),
            status: 'NO_SMTP_CREDENTIALS',
            to: toList,
          }),
        },
      });
    } catch {}
    return { sent: false, error: 'SMTP_NOT_CONFIGURED', recipients: toList };
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

    const cleanReplyTo = replyTo ? parseEmailArray(replyTo)[0] : undefined;
    const fromHeader = `"RRHH - AUBASA (No Responder)" <${smtpUser}>`;

    const info = await transporter.sendMail({
      from: fromHeader,
      replyTo: cleanReplyTo,
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : undefined,
      subject,
      html,
    });

    try {
      await prisma.appSetting.upsert({
        where: { id: 'last_email_log' },
        update: {
          value: JSON.stringify({
            time: new Date().toISOString(),
            status: 'SENT',
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            from: fromHeader,
            to: toList,
            cc: ccList,
          }),
        },
        create: {
          id: 'last_email_log',
          value: JSON.stringify({
            time: new Date().toISOString(),
            status: 'SENT',
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            from: fromHeader,
            to: toList,
            cc: ccList,
          }),
        },
      });
    } catch {}

    console.log('Email sent: %s', info.messageId);
    return { sent: true, method: 'smtp', recipients: toList };
  } catch (error: any) {
    console.error('Error sending email via SMTP:', error);
    try {
      await prisma.appSetting.upsert({
        where: { id: 'last_email_log' },
        update: {
          value: JSON.stringify({
            time: new Date().toISOString(),
            status: 'ERROR',
            error: error?.message || String(error),
            to: toList,
          }),
        },
        create: {
          id: 'last_email_log',
          value: JSON.stringify({
            time: new Date().toISOString(),
            status: 'ERROR',
            error: error?.message || String(error),
            to: toList,
          }),
        },
      });
    } catch {}
    return { sent: false, error: error?.message || 'SMTP_ERROR', recipients: toList };
  }
}
