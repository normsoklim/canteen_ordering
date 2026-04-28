import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { BakongService } from './bakong.service';

// Import KHQR SDK for currency constants
const KHQR = require('bakong-khqr');
const { khqrData } = KHQR;

@Injectable()
export class KhqrService {
  private readonly logger = new Logger(KhqrService.name);
  private readonly USD_TO_KHR_RATE = 4029.54; // Exchange rate: 1 USD = 4,029.54 KHR

  constructor(
    private configService: ConfigService,
    private bakongService: BakongService
  ) {}

  /**
   * Convert USD amount to KHR using current exchange rate
   * KHR amounts must be integers (no decimals) per KHQR spec
   */
  convertUSDToKHR(usdAmount: number): number {
    return Math.round(usdAmount * this.USD_TO_KHR_RATE);
  }

  /**
   * Generate KHQR for payment using official SDK
   */
  async generateKHQR(amount: number, orderId: number, description?: string, currency: 'KHR' | 'USD' = 'USD') {
    // Convert amount if currency is KHR
    let finalAmount = amount;
    if (currency === 'KHR') {
      finalAmount = this.convertUSDToKHR(amount);
      this.logger.log(`Converted ${amount} USD to ${finalAmount} KHR using rate ${this.USD_TO_KHR_RATE}`);
    }

    // Validate amount format per KHQR spec:
    // - KHR: must be an integer (no decimal places)
    // - USD: max 2 decimal places
    if (currency === 'KHR' && finalAmount % 1 !== 0) {
      throw new BadRequestException('KHR amount must be an integer (no decimal places)');
    }
    if (currency === 'USD') {
      const decimalPart = String(finalAmount).split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        throw new BadRequestException('USD amount cannot have more than 2 decimal places');
      }
    }

    try {
      this.logger.log(`Generating KHQR for order ${orderId}, amount: ${finalAmount} ${currency}`);

      const order = {
        orderId,
        amount: finalAmount,
        description: description || 'Canteen Payment',
        currency,
      };

      // Use Bakong service to generate KHQR using official SDK
      const khqrData = await this.bakongService.generateKHQR(order);

      this.logger.log(`KHQR generated successfully for transaction ${khqrData.transactionId}`);
      this.logger.log(`KHQR MD5 Hash: ${khqrData.khqrHash}`);

      return {
        transactionId: khqrData.transactionId,
        khqrString: khqrData.khqrString,
        khqrHash: khqrData.khqrHash,
        qrImage: khqrData.qrImage,
        expiresAt: khqrData.expiresAt,
        orderId: khqrData.orderId,
        amount: khqrData.amount,
        convertedAmount: finalAmount,
        currency,
        md5: khqrData.md5, // Critical for transaction verification
      };
    } catch (error) {
      this.logger.error('Failed to generate KHQR', error);
      this.logger.error(`Error details: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      throw new BadRequestException(`Failed to generate KHQR: ${error.message}`);
    }
  }

  /**
   * Verify payment status using official SDK
   */
  async verifyPayment(md5: string) {
    try {
      this.logger.log(`Verifying payment with MD5: ${md5}`);

      // Use Bakong service to check transaction status
      const verification = await this.bakongService.checkTransaction(md5);

      this.logger.log(`Payment verification result: ${verification.status}`);

      return {
        success: verification.success,
        status: verification.status,
        amount: verification.amount,
        timestamp: verification.timestamp,
        reference: verification.reference,
        rawData: verification.rawData,
      };
    } catch (error) {
      this.logger.error('Failed to verify payment', error);

      // If API is not available, return pending status
      return {
        success: false,
        status: 'PENDING',
        amount: 0,
        timestamp: null,
        reference: null,
        rawData: null,
      };
    }
  }

  /**
   * Check if KHQR is expired
   */
  isKHQRExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Validate KHQR string using SDK
   */
  validateKHQRString(khqrString: string): boolean {
    try {
      const validation = this.bakongService.validateKHQR(khqrString);
      return validation.isValid;
    } catch (error) {
      this.logger.error('Failed to validate KHQR string', error);
      return false;
    }
  }

  /**
   * Generate demo KHQR for testing
   */
  async generateDemoKHQR(amount: number, orderId: number, currency: 'KHR' | 'USD' = 'USD') {
    // Convert amount if currency is KHR
    let finalAmount = amount;
    if (currency === 'KHR') {
      finalAmount = this.convertUSDToKHR(amount);
    }

    // Validate amount format
    if (currency === 'KHR' && finalAmount % 1 !== 0) {
      throw new BadRequestException('KHR amount must be an integer');
    }

    try {
      this.logger.log(`Generating demo KHQR for order ${orderId}, amount: ${finalAmount} ${currency}`);

      const order = {
        orderId,
        amount: finalAmount,
        description: 'Demo Payment',
        currency,
      };

      const khqrData = await this.bakongService.generateDemoKHQR(order);

      this.logger.log(`Demo KHQR generated successfully for transaction ${khqrData.transactionId}`);

      return {
        transactionId: khqrData.transactionId,
        khqrString: khqrData.khqrString,
        khqrHash: khqrData.khqrHash,
        qrImage: khqrData.qrImage,
        expiresAt: khqrData.expiresAt,
        orderId: khqrData.orderId,
        amount: khqrData.amount,
        convertedAmount: finalAmount,
        currency,
        md5: khqrData.md5,
      };
    } catch (error) {
      this.logger.error('Failed to generate demo KHQR', error);
      throw new BadRequestException(`Failed to generate demo KHQR: ${error.message}`);
    }
  }

  /**
   * Debug method to check account ID configuration
   */
  debugAccountId() {
    return this.bakongService.debugAccountId();
  }
}
