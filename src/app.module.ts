import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportModule } from './modules/report/report.module';
import { OrderTrackingModule } from './modules/order-tracking/order-tracking.module';
import bakongConfig from './config/bakong.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [bakongConfig],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'canteen_db',
      autoLoadEntities: true, // This will automatically load all entities
      synchronize: false, // Changed to false to prevent schema sync issues
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    CategoriesModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    ReportModule,
    OrderTrackingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
