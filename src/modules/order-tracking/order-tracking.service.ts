import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderTracking } from './entities/order-tracking.entity';
import { CreateOrderTrackingDto } from './dto/create-order-tracking.dto';
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto';
import { OrderTimelineResponseDto } from './dto/order-tracking-response.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { Order } from '../orders/entities/order.entity';

/**
 * Valid status transition map defining which statuses can transition to which.
 * This enforces business rules for order status progression.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrderTrackingService {
  constructor(
    @InjectRepository(OrderTracking)
    private trackingRepository: Repository<OrderTracking>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  /**
   * Create an initial tracking entry for an order.
   * Typically called when an order is first created.
   */
  async create(dto: CreateOrderTrackingDto, userId: number): Promise<OrderTracking> {
    const order = await this.orderRepository.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    const tracking = this.trackingRepository.create({
      orderId: dto.orderId,
      status: dto.status,
      previousStatus: dto.previousStatus ?? null,
      estimatedReadyTime: dto.estimatedReadyTime ? new Date(dto.estimatedReadyTime) : null,
      note: dto.note ?? null,
      updatedBy: userId,
    });

    return this.trackingRepository.save(tracking);
  }

  /**
   * Update the tracking status of an order.
   * Validates the status transition and syncs the order's status.
   */
  async updateStatus(
    orderId: number,
    dto: UpdateOrderTrackingDto,
    userId: number,
  ): Promise<OrderTracking> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Validate status transition
    this.validateTransition(order.status, dto.status);

    // Create a new tracking entry for the status change
    const tracking = this.trackingRepository.create({
      orderId,
      status: dto.status,
      previousStatus: order.status,
      estimatedReadyTime: dto.estimatedReadyTime ? new Date(dto.estimatedReadyTime) : null,
      note: dto.note ?? null,
      updatedBy: userId,
    });

    const savedTracking = await this.trackingRepository.save(tracking);

    // Sync the order's status with the tracking status
    await this.orderRepository.update(orderId, { status: dto.status });

    return savedTracking;
  }

  /**
   * Get the full tracking timeline for an order.
   * Returns the current status, estimated ready time, and all tracking events.
   */
  async getOrderTimeline(orderId: number): Promise<OrderTimelineResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItemsList'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const trackingEntries = await this.trackingRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    // Get the latest tracking entry for estimated ready time
    const latestEntry = trackingEntries.length > 0
      ? trackingEntries[trackingEntries.length - 1]
      : null;

    return {
      orderId: order.id,
      currentStatus: order.status,
      estimatedReadyTime: latestEntry?.estimatedReadyTime ?? null,
      timeline: trackingEntries.map((entry) => ({
        id: entry.id,
        orderId: entry.orderId,
        status: entry.status,
        previousStatus: entry.previousStatus,
        estimatedReadyTime: entry.estimatedReadyTime,
        note: entry.note,
        updatedBy: entry.updatedBy,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    };
  }

  /**
   * Get the latest tracking entry for an order.
   */
  async getLatestTracking(orderId: number): Promise<OrderTracking> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const latest = await this.trackingRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (!latest) {
      throw new NotFoundException(`No tracking entry found for order ID ${orderId}`);
    }

    return latest;
  }

  /**
   * Get all tracking entries for a specific order.
   */
  async findByOrder(orderId: number): Promise<OrderTracking[]> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.trackingRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get all orders currently in a given status (useful for kitchen displays, etc.).
   */
  async findOrdersByStatus(status: OrderStatus): Promise<OrderTracking[]> {
    return this.trackingRepository
      .createQueryBuilder('tracking')
      .innerJoinAndSelect('tracking.order', 'order')
      .where('tracking.status = :status', { status })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(t2.tracking_id)')
          .from(OrderTracking, 't2')
          .where('t2.order_id = tracking.orderId')
          .getQuery();
        return `tracking.id = (${subQuery})`;
      })
      .orderBy('tracking.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Validate that a status transition is allowed.
   */
  private validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    if (currentStatus === newStatus) {
      throw new BadRequestException(
        `Order is already in ${currentStatus} status`,
      );
    }

    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions from ${currentStatus}: [${allowedTransitions.join(', ')}]`,
      );
    }
  }
}
