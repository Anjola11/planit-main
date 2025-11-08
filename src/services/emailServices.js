import { Resend } from 'resend';
import { fileURLToPath } from 'url';
import path from 'path';
import ejs from 'ejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Check if Resend is configured
const isConfigured = !!process.env.RESEND_API_KEY;

if (!isConfigured) {
  console.warn('Resend API key not configured. Email functionality will be disabled.');
  console.warn('   Set RESEND_API_KEY environment variable to enable emails.');
} else {
  console.log('Email service initialized with Resend');
}

/**
 * Render email template with EJS
 */
async function renderTemplate(templateName, payload = {}) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.ejs`);
  try {
    const html = await ejs.renderFile(templatePath, payload);
    return html;
  } catch (err) {
    console.warn(` Template "${templateName}.ejs" not found or error rendering:`, err.message);
    return null; // Return null to use text fallback
  }
}

/**
 * General function to send emails with Resend
 */
async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured) {
    console.warn(`Email service not configured. Skipping email to: ${to}`);
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: html || text.replace(/\n/g, '<br>'), // Use HTML if available, fallback to text with line breaks
      text, // Plain text version
    });

    console.log(` Email sent to ${to}: ${subject} (ID: ${data.id})`);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send OTP verification email
 */
export async function sendOtpEmail(userEmail, otpCode, userName) {
  // Try to render template
  const html = await renderTemplate('otp-verification', {
    username: userName,
    otpCode,
    expiryTime: '10 minutes',
  });

  const text = `Hello ${userName},

Your Planit verification code is: ${otpCode}

This code will expire in 10 minutes. Please do not share this code with anyone.

If you didn't request this code, please ignore this email.

Best regards,
The Planit Team`;

  return await sendEmail({
    to: userEmail,
    subject: 'Planit - Email Verification Code',
    html,
    text,
  });
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(userEmail, userName) {
  // Try to render template
  const html = await renderTemplate('welcome', {
    username: userName,
    email: userEmail,
  });

  const text = `Welcome to Planit, ${userName}!

Thank you for verifying your email. We're excited to have you on board!

Planit helps you manage events, tasks, and everything in between. Get started by exploring our features.

Best regards,
The Planit Team`;

  return await sendEmail({
    to: userEmail,
    subject: 'Welcome to Planit! ',
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(userEmail, resetCode) {
  // Try to render template
  const html = await renderTemplate('password-reset', {
    resetCode,
    expiryTime: '10 minutes',
  });

  const text = `Hello,

We received a password reset request for your Planit account.

Your password reset code is: ${resetCode}

This code will expire in 10 minutes. If you didn't request this, please ignore this email.

Best regards,
The Planit Team`;

  return await sendEmail({
    to: userEmail,
    subject: 'Planit - Password Reset Request',
    html,
    text,
  });
}

/**
 * Send login notification email
 */
export async function sendLoginNotificationEmail(userEmail, userName, loginDetails) {
  // Try to render template
  const html = await renderTemplate('login-notification', {
    username: userName,
    loginTime: loginDetails.loginTime || new Date().toISOString(),
    ipAddress: loginDetails.ipAddress || 'Unknown',
    device: loginDetails.device || 'Unknown device',
    location: loginDetails.location || 'Unknown location',
  });

  const text = `Hello ${userName},

We detected a new login to your Planit account.

Login Details:
- Time: ${loginDetails.loginTime || new Date().toISOString()}
- IP Address: ${loginDetails.ipAddress || 'Unknown'}
- Device: ${loginDetails.device || 'Unknown device'}
- Location: ${loginDetails.location || 'Unknown location'}

If this was you, you can safely ignore this email. If you don't recognize this login, please secure your account immediately.

Best regards,
The Planit Team`;

  return await sendEmail({
    to: userEmail,
    subject: 'Planit - New Login Detected',
    html,
    text,
  });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(userEmail, userName) {
  // Try to render template
  const html = await renderTemplate('password-changed', {
    username: userName,
    changeTime: new Date().toISOString(),
  });

  const text = `Hello ${userName},

Your Planit account password was successfully changed.

If you made this change, you can safely ignore this email. If you didn't change your password, please contact our support team immediately.

Best regards,
The Planit Team`;

  return await sendEmail({
    to: userEmail,
    subject: 'Planit - Password Changed Successfully',
    html,
    text,
  });
}

/**
 * Send email changed confirmation email
 */
export async function sendEmailChangedEmail(oldEmail, newEmail, userName) {
  // Try to render template
  const html = await renderTemplate('email-changed-confirmation', {
    username: userName,
    oldEmail,
    newEmail,
    changeTime: new Date().toISOString(),
  });

  const text = `Hello ${userName},

Your Planit account email was successfully changed.

Old email: ${oldEmail}
New email: ${newEmail}

If you made this change, you can safely ignore this email. If you didn't change your email, please contact our support team immediately.

Best regards,
The Planit Team`;

  // Send to both old and new email
  await sendEmail({
    to: oldEmail,
    subject: 'Planit - Email Address Changed',
    html,
    text,
  });

  return await sendEmail({
    to: newEmail,
    subject: 'Planit - Email Address Changed',
    html,
    text,
  });
}

/**
 * Send custom email (for admin or special purposes)
 */
export async function sendCustomEmail(to, subject, html, text) {
  return await sendEmail({ to, subject, html, text });
}