import { DataSource } from 'typeorm';
import { Category } from '../modules/categories/entities/category.entity';
import { MenuItem } from '../modules/menu/entities/menu-item.entity';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { Order } from '../modules/orders/entities/order.entity';
import { OrderItem } from '../modules/orders/entities/order-item.entity';
import { OrderStatusHistory } from '../modules/orders/entities/order-status-history.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { PaymentMethod } from '../modules/payments/entities/payment-method.entity';
import { PaymentTransaction } from '../modules/payments/entities/payment-transaction.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '1234', // Updated to match .env file
  database: process.env.DB_NAME || 'canteen_db',
  synchronize: false,
  logging: false,
  entities: [
    Category,
    MenuItem,
    User,
    Role,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    PaymentMethod,
    PaymentTransaction
  ],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  subscribers: [],
});