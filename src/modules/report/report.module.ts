import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportItem } from './entities/report-item.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      ReportItem,
      Order,
      OrderItem,
      MenuItem,
      Payment
    ])
  ],
  providers: [ReportService],
  controllers: [ReportController]
})
export class ReportModule {}
