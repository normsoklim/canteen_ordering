import { OrderStatus } from '../../../common/enums/order-status.enum';

export class OrderTrackingResponseDto {
  id: number;
  orderId: number;
  status: OrderStatus;
  previousStatus: OrderStatus | null;
  estimatedReadyTime: Date | null;
  note: string | null;
  updatedBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export class OrderTimelineResponseDto {
  orderId: number;
  currentStatus: OrderStatus;
  estimatedReadyTime: Date | null;
  timeline: OrderTrackingResponseDto[];
}
