import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({name:'payment_id'})
  id: number;

  @Column({name:'order_id'})
  orderId: number;

  @Column()
  payment_method_id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    name:'payment_status',
    type: 'enum',
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId?: string;

  @Column({ name: 'khqr_string', type: 'text', nullable: true })
  khqrString?: string;

  @Column({ name: 'qr_image', type: 'text', nullable: true })
  qrImage?: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}