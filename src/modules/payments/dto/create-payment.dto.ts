import { IsNumber, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../enums/payment-status.enum';

class PaymentMethodDto {
  @IsNumber()
  id: number;
}

export class CreatePaymentDto {
  @IsNumber()
  orderId: number;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ValidateNested()
  @Type(() => PaymentMethodDto)
  @IsOptional()
  paymentMethod?: PaymentMethodDto;

  @IsOptional()
  paymentDetails?: any;
}