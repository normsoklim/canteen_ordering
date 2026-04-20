import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { KhqrService } from './khqr.service';
import { PaymentsService } from './payments.service';
import { BakongService } from './bakong.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { PaymentStatus } from './enums/payment-status.enum';
import { HashUtil } from 'src/utils/hash.util';
import { CheckBakongAccountDto } from './dto/check-bakong-account.dto';

@Controller('payments/khqr')
@UseGuards(JwtAuthGuard)
export class KhqrController {
  constructor(
    private readonly khqrService: KhqrService,
    private readonly paymentsService: PaymentsService,
    private readonly bakongService: BakongService,
  ) {}

  /**
   * Generate KHQR for an order
   */
  @Post('generate')
  async generateKHQR(
    @Body() body: { orderId: number; amount: number; description?: string; currency?: 'KHR' | 'USD' }
  ) {
    const { orderId, amount, description, currency = 'USD' } = body;

    if (!orderId || !amount) {
      throw new BadRequestException('Order ID and amount are required');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      // Check if payment already exists for this order
      const existingPayment = await this.paymentsService.findByOrderId(orderId);
      
      if (existingPayment) {
        // If payment exists, check if it's expired
        if (existingPayment.expiresAt && this.khqrService.isKHQRExpired(existingPayment.expiresAt)) {
          // Generate new KHQR for expired payment
          const khqrData = await this.khqrService.generateKHQR(amount, orderId, description, currency);
          
          // Update existing payment with new KHQR data
          const updatedPayment = await this.paymentsService.update(existingPayment.id, {
            transactionId: khqrData.transactionId,
            khqrString: khqrData.khqrString,
            qrImage: khqrData.qrImage,
            expiresAt: khqrData.expiresAt,
            status: PaymentStatus.PENDING,
          });

        return {
          success: true,
          data: {
            paymentId: updatedPayment.id,
            transactionId: khqrData.transactionId,
            khqrHash: khqrData.khqrHash,
            qrImage: khqrData.qrImage,
            expiresAt: khqrData.expiresAt,
            amount: khqrData.amount,
          },
        };
        } else {
          // Return existing payment if not expired
        return {
          success: true,
          data: {
            paymentId: existingPayment.id,
            transactionId: existingPayment.transactionId,
            khqrHash: existingPayment.khqrString ? HashUtil.generateMD5Hash(existingPayment.khqrString) : null,
            qrImage: existingPayment.qrImage,
            expiresAt: existingPayment.expiresAt,
            amount: existingPayment.amount,
          },
        };
        }
      } else {
        // Generate KHQR for new payment
        const khqrData = await this.khqrService.generateKHQR(amount, orderId, description, currency);

        // Create payment record
        const payment = await this.paymentsService.create({
          orderId,
          amount,
          status: PaymentStatus.PENDING,
          transactionId: khqrData.transactionId,
          khqrString: khqrData.khqrString,
          qrImage: khqrData.qrImage,
          expiresAt: khqrData.expiresAt,
          paymentMethod: { id: 1 }, // Default to KHQR payment method
        });

        return {
          success: true,
          data: {
            paymentId: payment.id,
            transactionId: khqrData.transactionId,
            khqrHash: khqrData.khqrHash,
            qrImage: khqrData.qrImage,
            expiresAt: khqrData.expiresAt,
            amount: khqrData.amount,
          },
        };
      }
    } catch (error) {
      console.error('KHQR Generation Error:', error);
      throw new BadRequestException(`Failed to generate KHQR: ${error.message}`);
    }
  }

  /**
   * Verify payment status
   */
  @Get('verify/:transactionId')
  async verifyPayment(@Param('transactionId') transactionId: string) {
    try {
      // Verify with Bakong API
      const verification = await this.khqrService.verifyPayment(transactionId);

      return {
        success: true,
        data: verification,
      };
    } catch (error) {
      throw new BadRequestException('Failed to verify payment');
    }
  }

  /**
   * Get KHQR details by payment ID
   */
  @Get('payment/:paymentId')
  async getKHQRDetails(@Param('paymentId') paymentId: string) {
    try {
      const payment = await this.paymentsService.findOne(+paymentId);
      
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      const isExpired = payment.expiresAt 
        ? this.khqrService.isKHQRExpired(payment.expiresAt)
        : false;

      return {
        success: true,
        data: {
          paymentId: payment.id,
          transactionId: payment.transactionId,
          qrImage: payment.qrImage,
          status: payment.status,
          amount: payment.amount,
          expiresAt: payment.expiresAt,
          isExpired,
          paidAt: payment.paidAt,
        },
      };
    } catch (error) {
      throw new NotFoundException('Payment not found');
    }
  }

  /**
   * Generate demo KHQR (for testing)
   */
  @Post('demo')
  async generateDemoKHQR(
    @Body() body: { orderId: number; amount: number; currency?: 'KHR' | 'USD' }
  ) {
    const { orderId, amount, currency = 'USD' } = body;

    if (!orderId || !amount) {
      throw new BadRequestException('Order ID and amount are required');
    }

    try {
      const khqrData = await this.khqrService.generateDemoKHQR(amount, orderId, currency);

      return {
        success: true,
        data: {
          transactionId: khqrData.transactionId,
          qrImage: khqrData.qrImage,
          expiresAt: khqrData.expiresAt,
          amount: khqrData.amount,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to generate demo KHQR');
    }
  }

  /**
   * Webhook endpoint for Bakong payment notifications
   */
  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    try {
      const { transactionId, status, amount, timestamp } = body;

      if (!transactionId) {
        throw new BadRequestException('Transaction ID is required');
      }

      // Find payment by transaction ID
      // This would require a custom repository method to find by transactionId
      // For now, we'll return the webhook data

      return {
        success: true,
        message: 'Webhook received',
        data: {
          transactionId,
          status,
          amount,
          timestamp,
        },
      };
    } catch (error) {
      this.khqrService['logger'].error('Webhook processing failed', error);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  /**
   * Check if a Bakong account exists
   */
  @Post('check_bakong_account')
  @UseGuards(JwtAuthGuard)
  async checkBakongAccount(@Body() checkBakongAccountDto: CheckBakongAccountDto) {
    return this.bakongService.checkBakongAccount(checkBakongAccountDto.accountId);
  }

}

/**
 * Debug controller for testing account ID configuration
 */
@Controller('payments/khqr')
export class KhqrDebugController {
  constructor(private readonly khqrService: KhqrService) {}

  /**
   * Debug endpoint to check account ID configuration
   */
  @Get('debug/account')
  async debugAccount() {
    try {
      const debugInfo = this.khqrService.debugAccountId();
      return {
        success: true,
        data: debugInfo,
        message: debugInfo.needsSetup ?
          '⚠️ Bakong account needs to be configured. QR codes will show \"unknown account\" until you set up your own Bakong account.' :
          '✅ Bakong account appears to be configured. If QR codes still show \"unknown account\", verify your account is active with Bakong.'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '❌ Error checking Bakong account configuration. Please check your .env file.'
      };
    }
  }

  /**
   * Test KHQR generation with current account
   */
  @Post('test/generate')
  async testKHQRGeneration() {
    try {
      const debugInfo = this.khqrService.debugAccountId();
      
      // Allow test generation even with placeholder accounts for debugging
      if (debugInfo.needsSetup) {
        this.khqrService['logger'].warn('⚠️ Using placeholder Bakong account for test generation. QR codes may show "unknown account" when scanned.');
      }

      // Generate a test KHQR with small amount
      const khqrData = await this.khqrService.generateKHQR(1, 999, 'Test Payment - Account Verification', 'USD');
      
      return {
        success: true,
        data: {
          debugInfo,
          khqrData: {
            transactionId: khqrData.transactionId,
            qrImage: khqrData.qrImage,
            expiresAt: khqrData.expiresAt,
            amount: khqrData.amount,
            accountId: debugInfo.accountId
          }
        },
        message: debugInfo.needsSetup ?
          '⚠️ Test KHQR generated with placeholder account. QR codes will show "unknown account" when scanned. For production, configure a real Bakong account.' :
          '✅ Test KHQR generated successfully. Scan this QR code with the Bakong app to verify your account is working correctly.'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '❌ Failed to generate test KHQR. Please check your Bakong account configuration.'
      };
    }
  }

  /**
   * Generate simple test QR for debugging
   */
  @Post('test/simple')
  async generateSimpleTestQR() {
    try {
      const khqrData = await this.khqrService.generateSimpleTestQR(1, 999);
      
      return {
        success: true,
        data: {
          transactionId: khqrData.transactionId,
          qrImage: khqrData.qrImage,
          expiresAt: khqrData.expiresAt,
          amount: khqrData.amount,
        },
        message: '✅ Simple test QR generated. This QR contains basic text and should be scannable by any QR reader.'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '❌ Failed to generate simple test QR.'
      };
    }
  }
}