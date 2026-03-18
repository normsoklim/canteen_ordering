import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { MenuItem } from '../../menu/entities/menu-item.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn({name: 'order_item_id'})
  id: number;

  @Column({name:'order_id'})
  orderId: number;

  @Column({name:'menu_id'})
  menuItemId: number;

  @Column()
  quantity: number;

  @Column('decimal', { name: 'unit_price',precision: 10, scale: 2 })
  unitPrice: number;

  @Column('decimal', {name:'subtotal', precision: 10, scale: 2 })
  subTotal: number;

  @ManyToOne(() => Order, (order) => order.orderItemsList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => MenuItem)
  @JoinColumn({ name: 'menu_id' })
  menuItem: MenuItem;
}