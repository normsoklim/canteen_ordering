import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../../../common/enums/order-status.enum';

@Entity('order_tracking')
export class OrderTracking {
  @PrimaryGeneratedColumn({ name: 'tracking_id' })
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    name: 'status',
  })
  status: OrderStatus;

  @Column({ name: 'previous_status', type: 'enum', enum: OrderStatus, nullable: true })
  previousStatus: OrderStatus | null;

  @Column({ name: 'estimated_ready_time', type: 'timestamp', nullable: true })
  estimatedReadyTime: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'updated_by' })
  updatedBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Order, (order) => order.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  user: User;
}
