import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PaymentMethodType } from '../enums/payment-method-type.enum';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn({name: 'payment_method_id'})
  id: number;

  @Column({name:'method_name'})
  methodName: string;

  @Column()
  description: string;

  @Column({default: true})
  status: boolean;
}