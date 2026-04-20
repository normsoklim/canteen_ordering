import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { BakongConfig } from 'src/config/bakong.config';

// Import KHQR SDK
const KHQR = require('bakong-khqr');
const { BakongKHQR } = KHQR;

@Injectable()
export class BakongService {
  private readonly logger = new Logger(BakongService.name);

  constructor(private configService: ConfigService) {}

  private getBakongConfig(): BakongConfig {
    return this.configService.get<BakongConfig>('bakong')!;
  }

  /**
   * Generate KHQR using official SDK
   */
  async generateKHQR(order: any) {
    try {
      const config = this.getBakongConfig();
      
      // Validate Bakong account configuration
      const validationResult = this.validateBakongAccount(config.accountId);
      if (!validationResult.isValid) {
        throw new BadRequestException(
          'Invalid Bakong account configuration. Please check your BAKONG_ACCOUNT_ID in environment variables.\n' +
          'Current account ID: ' + config.accountId + '\n' +
          'To fix this issue:\n' +
          '1. Register for a Bakong account at https://bakong.nbc.gov.kh\n' +
          '2. Get your account ID (email format like yourname@bkrt or phone number)\n' +
          '3. Contact Bakong support to get API access token\n' +
          '4. Update the values in your .env file with your actual Bakong credentials'
        );
      }

      // Log warning if using placeholder account
      if (validationResult.isPlaceholder) {
        this.logger.warn('Using placeholder Bakong account ID. QR codes will show "unknown account" when scanned. Please set up your own Bakong account.');
        this.logger.warn('Current placeholder account: ' + config.accountId + ' - This is not a real registered Bakong account.');
        this.logger.warn('⚠️ WARNING: KHQR generation may fail with placeholder accounts. For production, use a real registered Bakong account.');
      }

      const transactionId = uuidv4();
      
      // Prepare optional data for KHQR
      const optionalData = {
        billNumber: order.orderId?.toString() || transactionId,
        storeLabel: config.merchantName,
        terminalLabel: 'Canteen POS',
      };

      // Try to generate KHQR using official SDK first
      this.logger.log('Generating KHQR using official SDK...');
      try {
        // Initialize SDK with token first
        const khqrInstance = new BakongKHQR({
          token: config.token,
          isSandbox: config.isSandbox,
        });
        
        // Set expiration time (15 minutes from now)
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + 15);
        
        // Prepare KHQR parameters with proper expiration timestamp
        const khqrParams = {
          bakongAccountID: config.accountId,
          merchantName: config.merchantName,
          merchantCity: config.merchantCity,
          amount: order.amount,
          currency: KHQR.khqrData.currency.usd, // Use USD currency
          optionalData,
          expiresAt: Math.floor(expirationTime.getTime() / 1000), // Required for dynamic KHQR
        };

        this.logger.log('KHQR generation parameters:', JSON.stringify(khqrParams));
        
        const khqr = khqrInstance.generateIndividual(khqrParams);

        // Check if KHQR generation was successful
        if (!khqr || !khqr.data || !khqr.data.md5) {
          this.logger.error('KHQR SDK returned null or invalid response');
          this.logger.error('KHQR response:', khqr);
          
          // Check if this is the expiration timestamp error
          if (khqr && khqr.status && khqr.status.errorCode === 45) {
            this.logger.error('❌ EXPIRATION TIMESTAMP ERROR: The Bakong SDK is rejecting the placeholder account. This requires a real registered Bakong account.');
            this.logger.error('💡 SOLUTION: Register for a real Bakong account at https://bakong.nbc.gov.kh and update your .env file with the actual credentials.');
          }
          
          throw new Error('SDK returned invalid response');
        }

        this.logger.log(`KHQR generated successfully with MD5: ${khqr.data.md5}`);

        // Generate QR code image
        const qrImage = await QRCode.toDataURL(khqr.data.qr, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 400,
          color: {
            dark: '#000000FF',
            light: '#FFFFFFFF'
          },
          type: 'image/png',
          quality: 1.0,
        });

        // Set expiration time (15 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        return {
          transactionId,
          khqrString: khqr.data.qr,
          khqrHash: khqr.data.md5, // IMPORTANT: Save this for verification
          qrImage,
          expiresAt,
          orderId: order.orderId,
          amount: order.amount,
          currency: 'USD',
          md5: khqr.data.md5, // Critical for transaction verification
          isFallback: false, // Flag to indicate this is a real KHQR
        };
      } catch (sdkError) {
        this.logger.warn('Official SDK failed, using fallback QR generation');
        this.logger.warn(`SDK Error: ${sdkError.message}`);
        this.logger.warn(`SDK Error details: ${sdkError.stack || 'No stack trace'}`);
        
        // Try alternative approach first - maybe the SDK needs initialization
        try {
          this.logger.log('Attempting alternative SDK initialization...');
          
          // Try with different parameter format
          const khqrInstance = new BakongKHQR({
            token: config.token,
            isSandbox: config.isSandbox,
          });
          const expirationTime = new Date();
          expirationTime.setMinutes(expirationTime.getMinutes() + 15);
          
          const alternativeParams = {
            bakongAccountID: config.accountId,
            merchantName: config.merchantName,
            merchantCity: config.merchantCity,
            amount: order.amount,
            currency: 'USD', // Try string instead of enum
            optionalData,
            expiresAt: Math.floor(expirationTime.getTime() / 1000),
          };
          
          this.logger.log('Alternative parameters:', JSON.stringify(alternativeParams));
          
          const khqr = khqrInstance.generateIndividual(alternativeParams);
          
          if (khqr && khqr.data && khqr.data.md5) {
            this.logger.log('Alternative SDK approach succeeded');
            
            const qrImage = await QRCode.toDataURL(khqr.data.qr, {
              errorCorrectionLevel: 'H',
              margin: 2,
              width: 400,
              color: {
                dark: '#000000FF',
                light: '#FFFFFFFF'
              },
              type: 'image/png',
              quality: 1.0,
            });

            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);

            return {
              transactionId,
              khqrString: khqr.data.qr,
              khqrHash: khqr.data.md5,
              qrImage,
              expiresAt,
              orderId: order.orderId,
              amount: order.amount,
              currency: 'USD',
              md5: khqr.data.md5,
              isFallback: false,
            };
          }
        } catch (altError) {
          this.logger.warn('Alternative SDK approach also failed, using basic QR fallback');
          this.logger.warn(`Alternative error: ${altError.message}`);
        }
        
        // Use fallback basic QR generation
        return await this.generateBasicQR(order);
      }
    } catch (error) {
      this.logger.error('Failed to generate KHQR using SDK', error);
      throw new BadRequestException(`Failed to generate KHQR: ${error.message}`);
    }
  }

  /**
   * Check transaction status using official SDK
   */
  async checkTransaction(md5: string) {
    try {
      this.logger.log(`Checking transaction status for MD5: ${md5}`);
      
      const result = await KHQR.checkTransaction({
        md5,
      });

      this.logger.log(`Transaction status: ${result.data.status}`);
      
      return {
        success: result.data.status === 'SUCCESS',
        status: result.data.status,
        amount: result.data.amount,
        timestamp: result.data.timestamp,
        reference: result.data.reference,
        rawData: result.data,
      };
    } catch (error) {
      this.logger.error('Failed to check transaction status', error);
      
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
   * Validate KHQR string using SDK
   */
  validateKHQR(khqrString: string) {
    try {
      const result = KHQR.validateQR(khqrString);
      return {
        isValid: result.isValid,
        errors: result.errors || [],
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Failed to validate KHQR', error);
      return {
        isValid: false,
        errors: [error.message],
        data: null,
      };
    }
  }

  /**
   * Generate demo KHQR for testing
   */
  async generateDemoKHQR(order: any) {
    try {
      const config = this.getBakongConfig();
      
      const transactionId = uuidv4();
      
      const optionalData = {
        billNumber: order.orderId?.toString() || transactionId,
        storeLabel: config.merchantName,
        terminalLabel: 'Canteen Demo',
      };

      const khqrInstance = new BakongKHQR({
        token: config.token,
        isSandbox: config.isSandbox,
      });
      
      // Set expiration time (15 minutes from now)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);
      
      // Prepare KHQR parameters with proper expiration timestamp
      const khqrParams = {
        bakongAccountID: config.accountId,
        merchantName: config.merchantName,
        merchantCity: config.merchantCity,
        amount: order.amount,
        currency: KHQR.khqrData.currency.usd,
        optionalData,
        expiresAt: Math.floor(expirationTime.getTime() / 1000), // Required for dynamic KHQR
      };

      this.logger.log('Demo KHQR generation parameters:', JSON.stringify(khqrParams));
      
      const khqr = khqrInstance.generateIndividual(khqrParams);

      const qrImage = await QRCode.toDataURL(khqr.data.qr);
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      return {
        transactionId,
        khqrString: khqr.data.qr,
        khqrHash: khqr.data.md5,
        qrImage,
        expiresAt,
        orderId: order.orderId,
        amount: order.amount,
        currency: 'USD',
        md5: khqr.data.md5,
      };
    } catch (error) {
      this.logger.error('Failed to generate demo KHQR', error);
      throw new BadRequestException(`Failed to generate demo KHQR: ${error.message}`);
    }
  }

  /**
   * Generate basic QR code as fallback when official SDK fails
   */
  async generateBasicQR(order: any) {
    try {
      const config = this.getBakongConfig();
      const transactionId = uuidv4();
      
      // Create basic payment data that can be scanned by any QR reader
      const paymentData = `Bakong Payment\nAccount: ${config.accountId}\nAmount: $${order.amount}\nOrder: ${order.orderId}\nTxn: ${transactionId}`;
      
      // Generate QR code image
      const qrImage = await QRCode.toDataURL(paymentData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: {
          dark: '#000000FF',
          light: '#FFFFFFFF'
        },
        type: 'image/png',
        quality: 1.0,
      });

      // Set expiration time (15 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      this.logger.log(`Basic QR generated successfully as fallback for transaction ${transactionId}`);

      return {
        transactionId,
        khqrString: paymentData,
        khqrHash: transactionId, // Use transaction ID as hash for fallback
        qrImage,
        expiresAt,
        orderId: order.orderId,
        amount: order.amount,
        currency: 'USD',
        md5: transactionId, // Use transaction ID as MD5 for fallback
        isFallback: true, // Flag to indicate this is a fallback QR
      };
    } catch (error) {
      this.logger.error('Failed to generate basic QR as fallback', error);
      throw new BadRequestException(`Failed to generate basic QR: ${error.message}`);
    }
  }

  /**
   * Validate Bakong account ID
   */
  private validateBakongAccount(accountId: string): { isValid: boolean; isPlaceholder: boolean } {
    if (!accountId || accountId.trim() === '') {
      this.logger.error('Bakong account ID is empty');
      return { isValid: false, isPlaceholder: false };
    }
    
    // Check if account ID is a placeholder
    const isPlaceholder = accountId === 'YOUR_ACTUAL_BAKONG_ACCOUNT_ID_HERE' || accountId === 'norm_soklim@bkrt';
    
    // Check if account ID follows Bakong format (email-like format or phone number format)
    const bakongAccountRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?$|^\+?[0-9]{10,15}$/;
    const isValidFormat = bakongAccountRegex.test(accountId);
    
    // For placeholder accounts, we allow them to proceed but with warnings
    if (isPlaceholder) {
      this.logger.warn('Using placeholder Bakong account ID - this may not work for production. Please configure a valid account in your .env file.');
      return { isValid: true, isPlaceholder: true };
    }
    
    if (!isValidFormat) {
      this.logger.error(`Invalid Bakong account ID format: ${accountId}`);
      return { isValid: false, isPlaceholder: false };
    }
    
    return { isValid: true, isPlaceholder: false };
  }

  /**
   * Debug method to check account ID configuration
   */
  debugAccountId(): {
    accountId: string;
    merchantName: string;
    isConfigured: boolean;
    isValid: boolean;
    needsSetup: boolean;
    setupInstructions: string;
  } {
    const config = this.getBakongConfig();
    const validationResult = this.validateBakongAccount(config.accountId);
    const isDefaultAccount = config.accountId === 'YOUR_ACTUAL_BAKONG_ACCOUNT_ID_HERE' || config.accountId === 'norm_soklim@bkrt';
    
    return {
      accountId: config.accountId,
      merchantName: config.merchantName,
      isConfigured: !!config.accountId && !isDefaultAccount,
      isValid: validationResult.isValid,
      needsSetup: isDefaultAccount,
      setupInstructions: isDefaultAccount ?
        'Please update your .env file with your actual Bakong account credentials:\n' +
        '1. Register at https://bakong.nbc.gov.kh\n' +
        '2. Get your account ID and API token\n' +
        '3. Update BAKONG_ACCOUNT_ID and BAKONG_TOKEN in .env file' :
        'Account appears to be configured. If QR codes still show "unknown account", verify your account is active with Bakong.'
    };
  }

  /**
   * Check if a Bakong account exists
   */
  async checkBakongAccount(accountId: string): Promise<{
    responseCode: number;
    responseMessage: string;
    errorCode: number | null;
    data: null;
  }> {
    try {
      this.logger.log(`Checking Bakong account: ${accountId}`);
      
      // Validate account ID format
      const validationResult = this.validateBakongAccount(accountId);
      if (!validationResult.isValid) {
        return {
          responseCode: 1,
          responseMessage: 'Invalid account ID format',
          errorCode: 11,
          data: null,
        };
      }

      // For now, we'll simulate the check since we don't have a direct API
      // In a real implementation, this would call the Bakong API
      // Since we don't have the actual API endpoint, we'll use our existing validation
      
      // Check if it's a placeholder account
      const isPlaceholder = accountId === 'YOUR_ACTUAL_BAKONG_ACCOUNT_ID_HERE' || accountId === 'norm_soklim@bkrt';
      
      if (isPlaceholder) {
        return {
          responseCode: 1,
          responseMessage: 'Account ID not found',
          errorCode: 11,
          data: null,
        };
      }

      // For demo purposes, we'll assume any valid format account exists
      // In production, this should call the actual Bakong API
      return {
        responseCode: 0,
        responseMessage: 'Account ID exists',
        errorCode: null,
        data: null,
      };
    } catch (error) {
      this.logger.error('Failed to check Bakong account', error);
      return {
        responseCode: 1,
        responseMessage: 'Account ID not found',
        errorCode: 11,
        data: null,
      };
    }
  }
}