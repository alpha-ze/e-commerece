/**
 * Mailer utility using nodemailer.
 *
 * When SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * are set, emails are sent via SMTP. Otherwise the reset URL is only logged to
 * the console (development / test fallback — no actual email is delivered).
 */
import nodemailer from 'nodemailer';

function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Send a password-reset email to `toEmail` containing the reset link.
 *
 * @param toEmail   - Recipient's email address
 * @param resetToken - The opaque reset token
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
): Promise<void> {
  const frontendOrigin =
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  const resetUrl = `${frontendOrigin}/reset-password/${resetToken}`;

  if (!isSmtpConfigured()) {
    // Dev / test fallback: log instead of sending
    console.log(
      `[mailer] Password reset link for ${toEmail}: ${resetUrl}`,
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: toEmail,
    subject: 'Reset your password',
    text: `You requested a password reset. Follow the link below to choose a new password. The link expires in 1 hour.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>You requested a password reset. Follow the link below to choose a new password. The link expires in 1 hour.</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you did not request this, you can safely ignore this email.</p>`,
  });
}
