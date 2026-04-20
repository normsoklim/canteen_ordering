import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  /**
   * Send OTP code to user's email
   * This is a placeholder implementation - you should integrate with your email provider
   * (e.g., Nodemailer, SendGrid, etc.)
   */
  async sendOtpEmail(email: string, otpCode: string): Promise<boolean> {
    // TODO: Implement actual email sending logic
    // For now, we'll just log the OTP for development purposes
    console.log(`OTP for ${email}: ${otpCode}`);
    
    // Example with Nodemailer (uncomment and configure as needed):
    const nodemailer = require("nodemailer");
    require("dotenv").config();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP code is: <strong>${otpCode}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
   

    return true;
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, fullname: string): Promise<boolean> {
    // TODO: Implement actual welcome email
    console.log(`Welcome email sent to ${email} for ${fullname}`);
    return true;
  }

  /**
   * Send password reset OTP code to user's email
   */
  async sendPasswordResetOtpEmail(email: string, otpCode: string): Promise<boolean> {
    // TODO: Implement actual email sending logic
    // For now, we'll just log the OTP for development purposes
    console.log(`Password Reset OTP for ${email}: ${otpCode}`);
    
    // Example with Nodemailer (uncomment and configure as needed):
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your password reset OTP code is: <strong>${otpCode}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
   

    return true;
  }
}