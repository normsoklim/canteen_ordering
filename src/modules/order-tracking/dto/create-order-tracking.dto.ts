import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { Type } from 'class-transformer';

export class CreateOrderTrackingDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  orderId: number;

  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @IsEnum(OrderStatus)
  @IsOptional()
  previousStatus?: OrderStatus;

  @IsDateString()
  @IsOptional()
  estimatedReadyTime?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

