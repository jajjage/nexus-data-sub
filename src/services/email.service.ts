/* eslint-disable no-console */
import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class EmailService {
  private transporter;

  constructor() {
    // Validate email configuration
    if (!config.email.user || !config.email.pass) {
      throw new Error('Email configuration missing authentication credentials');
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${config.app.baseUrl}/api/auth/verify?token=${token}`;

    const mailOptions = {
      // Use the authenticated email address as from
      from: `"Election Monitoring" <${config.email.user}>`,
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Welcome to Election Monitoring System</h2>
          <p>Please click the link below to verify your email address:</p>
          <p>
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Verify Email
            </a>
          </p>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', info.messageId);

      // For Ethereal emails, show preview URL
      if (config.email.host.includes('ethereal')) {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.app.baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Election Monitoring" <${config.email.user}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Password Reset Request</h2>
          <p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
          <p>Please click the link below to reset your password:</p>
          <p>
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </p>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${resetUrl}</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully!');
      console.log('Message ID:', info.messageId);

      if (config.email.host.includes('ethereal')) {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async send2FADisableEmail(email: string): Promise<void> {
    const resetUrl = `${config.app.baseUrl}/2fa-disable`;
    const mailOptions = {
      from: `"Election Monitoring" <${config.email.user}>`,
      to: email,
      subject: 'You Successfully Disabled 2FA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>You Successflly Disable 2FA</h2>
          <p>You are receiving this email because you (or someone else) have Login and disable your 2FA for your account.</p>
          <p>Please click the link below to appeal if it wasn't you:</p>
          <p>
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </p>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${resetUrl}</p>
          <p>If you requested this, please ignore this email and contiue with your work.</p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully!');
      console.log('Message ID:', info.messageId);

      if (config.email.host.includes('ethereal')) {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
