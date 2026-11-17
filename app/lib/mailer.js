import nodemailer from 'nodemailer';

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Hantar emel melalui Gmail. Tidak pernah melempar ralat: pulangkan { sent, reason }.
export async function sendMail({ to, subject, text, html }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const user = process.env.GMAIL_USER.trim();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
    });
    await transporter.sendMail({ from: `"JLB - Jadi Lebih Baik" <${user}>`, to, subject, text, html });
    return { sent: true };
  } catch (e) {
    console.error('Gagal hantar emel:', e.code, e.responseCode, e.message);
    const reason = e.code === 'EAUTH' ? 'auth_failed' : e.code === 'EENVELOPE' ? 'bad_recipient' : 'send_failed';
    return { sent: false, reason };
  }
}
