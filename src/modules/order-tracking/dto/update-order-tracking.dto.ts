import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsNumber, ArrayMinSize, ValidateNested } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { Type } from 'class-transformer';

export class UpdateOrderTrackingDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @IsDateString()
  @IsOptional()
  estimatedReadyTime?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class BatchUpdateOrderStatusDto {
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @Type(() => Number)
  orderIds: number[];

  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

