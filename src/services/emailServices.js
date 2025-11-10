import Brevo from '@getbrevo/brevo';
import { fileURLToPath } from 'url';
import path from 'path';
import ejs from 'ejs';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Brevo API client
const brevoClient = new Brevo.TransactionalEmailsApi();
brevoClient.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, config.BREVO_API_KEY);

/**
 * Render email template with EJS
 */
async function renderTemplate(templateName, payload = {}) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.ejs`);
  try {
    return await ejs.renderFile(templatePath, payload, { escape: ejs.escapeXML });
  } catch (err) {
    console.error(`Error rendering template "${templateName}":`, err);
    throw err;
  }
}

/**
 * General function to send emails via Brevo API
 */
async function sendEmail(to, subject, html, text) {
  if (!config.BREVO_API_KEY) {
    console.warn('Brevo API key not configured. Skipping email to:', to);
    return false;
  }

  const sender = {
    name: 'Planit',
    email: config.BREVO_EMAIL, 
  };

  const emailData = {
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  try {
    await brevoClient.sendTransacEmail(emailData);
    console.log(`✅ Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.response?.body || error);
    return false;
  }
}

/**
 * Send OTP verification email
 */
export async function sendOtpEmail(userEmail, otpCode, userName) {
  const html = await renderTemplate('otp-verification', {
    username: userName,
    otpCode,
    expiryTime: '10 minutes',
  });

  const textContent = `Hello ${userName},

Your Planit verification code is: ${otpCode}

This code will expire in 10 minutes. Please do not share this code with anyone.

If you didn't request this code, please ignore this email.

Best regards,
The Planit Team`;

  return await sendEmail(userEmail, 'Planit - Email Verification Code', html, textContent);
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(userEmail, userName) {
  const html = await renderTemplate('welcome', {
    username: userName,
    email: userEmail,
  });

  const textContent = `Welcome to Planit, ${userName}!

Thank you for verifying your email. We're excited to have you on board!

Planit helps you manage events, tasks, and everything in between. Get started by exploring our features.

Best regards,
The Planit Team`;

  return await sendEmail(userEmail, 'Welcome to Planit!', html, textContent);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(userEmail, resetCode) {
  const html = await renderTemplate('password-reset', {
    resetCode,
    expiryTime: '10 minutes',
  });

  const textContent = `Hello,

We received a password reset request for your Planit account.

Your password reset code is: ${resetCode}

This code will expire in 10 minutes. If you didn't request this, please ignore this email.

Best regards,
The Planit Team`;

  return await sendEmail(userEmail, 'Planit - Password Reset Request', html, textContent);
}
