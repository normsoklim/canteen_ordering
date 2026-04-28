import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { OrderTrackingService } from './order-tracking.service';
import { CreateOrderTrackingDto } from './dto/create-order-tracking.dto';
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Controller('order-tracking')
@UseGuards(JwtAuthGuard)
export class OrderTrackingController {
  constructor(private readonly trackingService: OrderTrackingService) {}

  /**
   * POST /order-tracking
   * Create an initial tracking entry for an order.
   * Admin/Staff only.
   */
  @Roles('admin', 'staff')
  @Post()
  create(@Body() dto: CreateOrderTrackingDto, @User() user: any) {
    return this.trackingService.create(dto, user.userId);
  }

  /**
   * GET /order-tracking/:orderId/timeline
   * Get the full tracking timeline for an order.
   * Available to admin, staff, and the customer who owns the order.
   */
  @Roles('admin', 'staff', 'customer')
  @Get(':orderId/timeline')
  getTimeline(@Param('orderId') orderId: string) {
    return this.trackingService.getOrderTimeline(+orderId);
  }

  /**
   * GET /order-tracking/:orderId/latest
   * Get the latest tracking status for an order.
   */
  @Roles('admin', 'staff', 'customer')
  @Get(':orderId/latest')
  getLatest(@Param('orderId') orderId: string) {
    return this.trackingService.getLatestTracking(+orderId);
  }

  /**
   * GET /order-tracking/:orderId/history
   * Get all tracking entries for an order.
   */
  @Roles('admin', 'staff', 'customer')
  @Get(':orderId/history')
  getOrderHistory(@Param('orderId') orderId: string) {
    return this.trackingService.findByOrder(+orderId);
  }

  /**
   * PATCH /order-tracking/:orderId/status
   * Update the tracking status of an order.
   * Admin/Staff only. Validates status transitions.
   */
  @Roles('admin', 'staff')
  @Patch(':orderId/status')
  updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderTrackingDto,
    @User() user: any,
  ) {
    return this.trackingService.updateStatus(+orderId, dto, user.userId);
  }

  /**
   * GET /order-tracking/by-status?status=PREPARING
   * Get all orders currently in a given status.
   * Useful for kitchen display systems.
   */
  @Roles('admin', 'staff')
  @Get()
  findByStatus(@Query('status') status: OrderStatus) {
    return this.trackingService.findOrdersByStatus(status);
  }
}
