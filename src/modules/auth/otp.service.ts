import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Otp } from './entities/otp.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create and store OTP for email verification
   */
  async createOtp(email: string): Promise<string> {
    // Delete any existing OTP for this email
    await this.otpRepository.delete({ email });

    const otpCode = this.generateOtpCode();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    
    const otp = new Otp();
    otp.email = email;
    otp.otpCode = hashedOtp;
    otp.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    otp.attempts = 0;

    await this.otpRepository.save(otp);
    
    return otpCode;
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(email: string, otpCode: string): Promise<boolean> {
    const otpRecord = await this.otpRepository.findOne({ 
      where: { email },
      order: { createdAt: 'DESC' }
    });

    if (!otpRecord) {
      return false;
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await this.otpRepository.delete({ email });
      return false;
    }

    // Check if too many attempts
    if (otpRecord.attempts >= 3) {
      await this.otpRepository.delete({ email });
      return false;
    }

    // Verify OTP code
    const isValid = await bcrypt.compare(otpCode, otpRecord.otpCode);
    
    if (isValid) {
      // Delete OTP after successful verification
      await this.otpRepository.delete({ email });
      return true;
    } else {
      // Increment attempts on failed verification
      otpRecord.attempts += 1;
      await this.otpRepository.save(otpRecord);
      return false;
    }
  }

  /**
   * Check if OTP exists and is valid for an email
   */
  async hasValidOtp(email: string): Promise<boolean> {
    const otpRecord = await this.otpRepository.findOne({ 
      where: { email },
      order: { createdAt: 'DESC' }
    });

    if (!otpRecord) {
      return false;
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await this.otpRepository.delete({ email });
      return false;
    }

    // Check if too many attempts
    if (otpRecord.attempts >= 3) {
      await this.otpRepository.delete({ email });
      return false;
    }

    return true;
  }
}