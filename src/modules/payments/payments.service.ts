import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private ordersService: OrdersService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = new Payment();
    
    // Map DTO to entity, handling paymentMethod conversion
    payment.orderId = createPaymentDto.orderId;
    payment.amount = createPaymentDto.amount;
    payment.status = createPaymentDto.status || PaymentStatus.PENDING;
    payment.transactionId = createPaymentDto.transactionId;
    payment.khqrString = createPaymentDto.khqrString;
    payment.qrImage = createPaymentDto.qrImage;
    payment.expiresAt = createPaymentDto.expiresAt;
    
    // Set payment_method_id from paymentMethod object
    if (createPaymentDto.paymentMethod) {
      payment.payment_method_id = createPaymentDto.paymentMethod.id;
    } else {
      // Default to KHQR payment method (ID 1)
      payment.payment_method_id = 1;
    }
    
    // Verify the order exists
    await this.ordersService.findOne(createPaymentDto.orderId);
    
    return this.paymentsRepository.save(payment);
  }

  findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({ relations: ['order'] });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['order']
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { transactionId },
      relations: ['order']
    });
    if (!payment) {
      throw new NotFoundException(`Payment with transaction ID ${transactionId} not found`);
    }
    return payment;
  }

  async updatePaymentStatus(id: number, status: PaymentStatus, paidAt?: Date): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = status;
    if (paidAt) {
      payment.paidAt = paidAt;
    }
    return this.paymentsRepository.save(payment);
  }

  async remove(id: number): Promise<void> {
    const result = await this.paymentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }

  async findByOrderId(orderId: number): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: { orderId },
      relations: ['order']
    });
  }

  async update(id: number, updateData: Partial<Payment>): Promise<Payment> {
    const payment = await this.findOne(id);
    
    // Update only the provided fields
    Object.assign(payment, updateData);
    
    return this.paymentsRepository.save(payment);
  }
}