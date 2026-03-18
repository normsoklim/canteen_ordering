import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
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
  

  @Column({ name: 'paid_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paidAt: Date;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}