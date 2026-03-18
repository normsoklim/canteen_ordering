import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from '../../../common/enums/order-status.enum';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({name:'history_id'})
  id: number;

  @Column({name: 'order_id'})
  orderId: number;

  @Column()
  old_status:OrderStatus;

  @Column()
  new_status:OrderStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Order, (order) => order.statusHistory)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}