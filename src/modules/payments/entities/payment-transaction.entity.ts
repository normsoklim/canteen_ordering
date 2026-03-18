import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Payment } from './payment.entity';
import { TransactionType } from '../enums/transaction-type.enum';


@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn({name:'transaction_id'})
  id: number;

  @Column({name:'payment_id'})
  paymentId: number;

  @Column()
  processed_by:number;

  @Column()
  gateway: string;

  @Column()
  transaction_reference: string;
  
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
   transaction_status: TransactionType;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'processed_by' })
  processedBy: Payment;
}