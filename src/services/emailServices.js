import nodemailer from 'nodemailer';

// Create transporter with better timeout settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },       
  secure: true,   
  debug: true,       
  connectionTimeout: 15000, 
  greetingTimeout: 15000,   
});

// Verify transporter on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Configuration Error:', error);
  } else {
    console.log('Email service is ready');
  }
});

/**
 * General function to send plain text emails
 */
export async function sendEmail(to, subject, textContent) {
  const message = {
    from: `Planit <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: textContent,
  };

  try {
    await transporter.sendMail(message);
    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error - just log it so signup can continue
    return false;
  }
}

/**
 * Send OTP verification email
 */
export async function sendOtpEmail(userEmail, otpCode, userName) {
  const textContent = `Hello ${userName},

Your Planit verification code is: ${otpCode}

This code will expire in 10 minutes. Please do not share this code with anyone.

If you didn't request this code, please ignore this email.

Best regards,
The Planit Team`;

  return await sendEmail(userEmail, 'Planit - Email Verification Code', textContent);
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(userEmail, userName) {
  const textContent = `Welcome to Planit, ${userName}!

Thank you for verifying your email. We're excited to have you on board!

Planit helps you manage events, tasks, and everything in between. Get started by exploring our features.

Best regards,
The Planit Team`;

  return await sendEmail(userEmail, 'Welcome to Planit!', textContent);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(userEmail, resetCode) {
  const textContent = `Hello,

We received a password reset request for your Planit account.

Your password reset code is: ${resetCode}

This code will expire in 15 minutes. If you didn't request this, please ignore this email.

Best regards,
The Planit Team`;

  return await sendEmail(userEmail, 'Planit - Password Reset Request', textContent);
}