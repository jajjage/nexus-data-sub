/* eslint-disable no-console */
import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class EmailService {
  private transporter: nodemailer.Transporter | undefined;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (process.env.NODE_ENV === 'production') {
      // In production, require email credentials
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error(
          'Email configuration missing authentication credentials for production'
        );
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
    } else {
      // In non-production environments, use Ethereal if no credentials are provided
      if (config.email.user && config.email.pass) {
        this.transporter = nodemailer.createTransport({
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          auth: {
            user: config.email.user,
            pass: config.email.pass,
          },
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        console.log('✅ Generated test email account:', testAccount.user);
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }
    }
  }

  private async ensureTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporter) {
      await this.initialize();
      if (!this.transporter) {
        throw new Error('Email transporter failed to initialize');
      }
    }
    return this.transporter;
  }

  async sendWelcomeEmail(email: string, full_name: string): Promise<void> {
    const transporter = await this.ensureTransporter();
    // Email verification is disabled in this application; send a friendly welcome/onboarding email instead.
    const mailOptions = {
      from: `"Nexus Data" <${config.email.user || 'noreply@election.com'}>`,
      to: email,
      subject: `Welcome to Nexus Data ${full_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Welcome to Nexus Data</h2>
          <p>Hi there — and welcome! Your account has been created and is ready to use.</p>
          <h3>Getting started</h3>
          <ul>
            <li>Explore available data bundles and pricing.</li>
            <li>Top up your wallet to purchase bundles.</li>
            <li>Visit your profile to update personal information.</li>
          </ul>
          <p>If you'd like to upgrade your account to a staff or admin role, please contact a system administrator.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr />
          <p style="font-size: 12px; color: #666">Need help? Reply to this email or visit our support page.</p>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', info.messageId);

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const transporter = await this.ensureTransporter();
    const resetUrl = `${config.app.baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Nexus Data" <${config.email.user || 'noreply@election.com'}>`,
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
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully!');
      console.log('Message ID:', info.messageId);

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
      }
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async send2FADisableEmail(email: string): Promise<void> {
    const transporter = await this.ensureTransporter();
    const resetUrl = `${config.app.baseUrl}/2fa-disable`;
    const mailOptions = {
      from: `"Nexus Data" <${config.email.user || 'noreply@election.com'}>`,
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
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully!');
      console.log('Message ID:', info.messageId);

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
      }
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
