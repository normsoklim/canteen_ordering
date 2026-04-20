import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { KhqrController, KhqrDebugController } from './khqr.controller';
import { KhqrService } from './khqr.service';
import { BakongService } from './bakong.service';
import { Payment } from './entities/payment.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrdersModule],
  controllers: [PaymentsController, KhqrController, KhqrDebugController],
  providers: [PaymentsService, KhqrService, BakongService],
  exports: [PaymentsService, KhqrService, BakongService],
})
export class PaymentsModule {}