import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { BakongConfig } from 'src/config/bakong.config';

// Import KHQR SDK correctly
const KHQR = require('bakong-khqr');
const { BakongKHQR, IndividualInfo, khqrData } = KHQR;

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
      }

      const transactionId = uuidv4();

      // Determine currency - use USD by default
      const currency = order.currency === 'KHR' ? khqrData.currency.khr : khqrData.currency.usd;

      // Calculate expiration timestamp in MILLISECONDS (13 digits, required by SDK)
      const expirationTimestamp = Date.now() + 15 * 60 * 1000; // 15 minutes from now in ms

      // Build optional data for KHQR - currency and amount go in the optional object
      const optionalData: any = {
        amount: order.amount,
        currency: currency,
        billNumber: order.orderId?.toString() || transactionId,
        storeLabel: config.merchantName,
        terminalLabel: 'Canteen POS',
        expirationTimestamp: expirationTimestamp,
      };

      // Create IndividualInfo instance - this is the correct SDK API
      const individualInfo = new IndividualInfo(
        config.accountId,
        config.merchantName,
        config.merchantCity,
        optionalData,
      );

      this.logger.log('Generating KHQR using official SDK with IndividualInfo...');

      // Generate KHQR - BakongKHQR constructor only needs token and isSandbox
      const khqrInstance = new BakongKHQR({
        token: config.token,
        isSandbox: config.isSandbox,
      });

      const khqr = khqrInstance.generateIndividual(individualInfo);

      // Check if KHQR generation was successful
      if (!khqr || khqr.status.code !== 0 || !khqr.data || !khqr.data.md5) {
        this.logger.error('KHQR SDK returned error response');
        this.logger.error('KHQR response:', JSON.stringify(khqr));

        if (khqr && khqr.status && khqr.status.errorCode) {
          this.logger.error(`KHQR Error Code: ${khqr.status.errorCode}, Message: ${khqr.status.message}`);

          // Provide specific guidance for common errors
          if (khqr.status.errorCode === 45) {
            this.logger.error('Expiration timestamp is required for dynamic KHQR');
          } else if (khqr.status.errorCode === 49) {
            this.logger.error('Expiration timestamp length is invalid - must be 13 digits (milliseconds)');
          } else if (khqr.status.errorCode === 4) {
            this.logger.error('Amount is invalid - KHR must be integer, USD max 2 decimal places');
          }
        }

        throw new Error(`KHQR generation failed: ${khqr?.status?.message || 'Unknown error'}`);
      }

      this.logger.log(`KHQR generated successfully with MD5: ${khqr.data.md5}`);

      // Generate QR code image from the KHQR string
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
        currency: currency === khqrData.currency.khr ? 'KHR' : 'USD',
        md5: khqr.data.md5, // Critical for transaction verification
        isFallback: false,
      };
    } catch (error) {
      this.logger.error('Failed to generate KHQR using SDK', error);
      throw new BadRequestException(`Failed to generate KHQR: ${error.message}`);
    }
  }

  /**
   * Check transaction status using Bakong API directly
   * The bakong-khqr SDK does not provide a checkTransaction method,
   * so we call the Bakong REST API endpoint directly.
   */
  async checkTransaction(md5: string) {
    try {
      this.logger.log(`Checking transaction status for MD5: ${md5}`);

      const config = this.getBakongConfig();
      const url = `${config.apiUrl}/v1/check_transaction_by_merchant`;

      // Call Bakong API directly to check transaction status
      const response = await axios.post(
        url,
        { md5 },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.token}`,
          },
          timeout: 45000,
        },
      );

      const respData = response.data;
      this.logger.log(`Transaction API response: ${JSON.stringify(respData)}`);

      // Bakong API returns { responseCode, errorCode, message, data }
      // data contains { status, amount, currency, transactionId, ... }
      const transactionData = respData.data || respData;

      if (respData.errorCode || respData.responseCode !== 0) {
        this.logger.warn(`Transaction check returned error: ${respData.errorCode || respData.responseCode} - ${respData.message || 'No message'}`);

        return {
          success: false,
          status: 'PENDING',
          amount: 0,
          timestamp: null,
          reference: null,
          rawData: respData,
        };
      }

      const status = transactionData.status || respData.status || 'PENDING';
      this.logger.log(`Transaction status: ${status}`);

      return {
        success: status === 'SUCCESS' || status === 'PAID',
        status,
        amount: transactionData.amount || respData.amount,
        timestamp: transactionData.timestamp || respData.timestamp,
        reference: transactionData.reference || respData.reference,
        rawData: transactionData,
      };
    } catch (error) {
      this.logger.error('Failed to check transaction status', error.message || error);

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
      const result = BakongKHQR.verify(khqrString);
      return {
        isValid: result.isValid,
        errors: result.isValid ? [] : ['KHQR string failed CRC verification'],
        data: null,
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

      // Determine currency
      const currency = order.currency === 'KHR' ? khqrData.currency.khr : khqrData.currency.usd;

      // Calculate expiration timestamp in MILLISECONDS (13 digits)
      const expirationTimestamp = Date.now() + 15 * 60 * 1000;

      const optionalData: any = {
        amount: order.amount,
        currency: currency,
        billNumber: order.orderId?.toString() || transactionId,
        storeLabel: config.merchantName,
        terminalLabel: 'Canteen Demo',
        expirationTimestamp: expirationTimestamp,
      };

      // Create IndividualInfo instance - correct SDK API
      const individualInfo = new IndividualInfo(
        config.accountId,
        config.merchantName,
        config.merchantCity,
        optionalData,
      );

      const khqrInstance = new BakongKHQR({
        token: config.token,
        isSandbox: config.isSandbox,
      });

      const khqr = khqrInstance.generateIndividual(individualInfo);

      if (!khqr || khqr.status.code !== 0 || !khqr.data) {
        throw new Error(`Demo KHQR generation failed: ${khqr?.status?.message || 'Unknown error'}`);
      }

      const qrImage = await QRCode.toDataURL(khqr.data.qr, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
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
        currency: currency === khqrData.currency.khr ? 'KHR' : 'USD',
        md5: khqr.data.md5,
      };
    } catch (error) {
      this.logger.error('Failed to generate demo KHQR', error);
      throw new BadRequestException(`Failed to generate demo KHQR: ${error.message}`);
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

      const config = this.getBakongConfig();

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

      // Use the SDK's static method to check account existence
      try {
        const result = await BakongKHQR.checkBakongAccount(
          config.apiUrl,
          accountId,
        );

        if (result.status.code === 0) {
          return {
            responseCode: 0,
            responseMessage: 'Account exists',
            errorCode: null,
            data: null,
          };
        } else {
          return {
            responseCode: 1,
            responseMessage: result.status.message || 'Account not found',
            errorCode: result.status.errorCode,
            data: null,
          };
        }
      } catch (apiError) {
        this.logger.warn('Bakong API call failed, falling back to format validation', apiError);

        // Fallback: check if it's a placeholder account
        const isPlaceholder = accountId === 'YOUR_ACTUAL_BAKONG_ACCOUNT_ID_HERE' || accountId === 'norm_soklim@bkrt';

        if (isPlaceholder) {
          return {
            responseCode: 1,
            responseMessage: 'Account ID not found',
            errorCode: 11,
            data: null,
          };
        }

        // For valid format accounts, assume they might exist
        return {
          responseCode: 0,
          responseMessage: 'Account ID format is valid (could not verify with API)',
          errorCode: null,
          data: null,
        };
      }
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
