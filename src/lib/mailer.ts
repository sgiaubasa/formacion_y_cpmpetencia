import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail({ to, subject, html, cc, from }: { to: string | string[], subject: string, html: string, cc?: string | string[], from?: string }) {
  if (!process.env.SMTP_USER) {
    console.log("------------------------------------------");
    console.log("Mock Email (SMTP no configurado):");
    console.log(`From: ${from || 'Default'}`);
    console.log(`To: ${to}`);
    console.log(`Cc: ${cc || '-'}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    console.log("------------------------------------------");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: from ? from : `"SGCySV - Capacitaciones" <${process.env.SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      subject,
      html,
    });
    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
