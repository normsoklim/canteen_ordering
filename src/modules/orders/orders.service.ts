import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UsersService } from '../users/users.service';
import { MenuService } from '../menu/menu.service';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private usersService: UsersService,
    private menuService: MenuService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Validate that the user exists
    try {
      await this.usersService.findOne(createOrderDto.userId);
    } catch (error) {
      throw new Error(`User with ID ${createOrderDto.userId} not found: ${error.message}`);
    }
    
    const order = new Order();
    order.userId = createOrderDto.userId;
    order.status = createOrderDto.status || OrderStatus.PENDING;
    
    // Calculate total amount and create order items
    let totalAmount = 0;
    const orderItems: OrderItem[] = [];
    
    for (const item of createOrderDto.orderItems) {
      try {
        // Validate that the menu item exists
        const menuItem = await this.menuService.findOne(item.menuItemId);
        
        // Create order item
        const orderItem = new OrderItem();
        orderItem.menuItemId = item.menuItemId;
        orderItem.quantity = item.quantity;
        orderItem.unitPrice = menuItem.price;
        orderItem.subTotal = menuItem.price * item.quantity;
        
        orderItems.push(orderItem);
        totalAmount += orderItem.subTotal;
      } catch (error) {
        throw new Error(`Menu item with ID ${item.menuItemId} not found: ${error.message}`);
      }
    }
    
    order.totalAmount = totalAmount;
    
    // Save the order first to get the order ID
    const savedOrder = await this.ordersRepository.save(order);
    
    // Set the order ID for each order item and save them
    for (const item of orderItems) {
      item.orderId = savedOrder.id;
    }
    
    await this.orderItemsRepository.save(orderItems);
    
    // Reload the order with the order items
    const orderWithItems = await this.ordersRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['user', 'orderItemsList']
    });
    
    if (!orderWithItems) {
      throw new Error(`Order with ID ${savedOrder.id} was not found after creation`);
    }
    
    return orderWithItems;
  }

  findAll(): Promise<Order[]> {
    return this.ordersRepository.find({ relations: ['user', 'orderItemsList'] });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({ 
      where: { id }, 
      relations: ['user', 'orderItemsList'] 
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(id: number, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order> {
    await this.ordersRepository.update(id, { status: updateOrderStatusDto.status });
    const updatedOrder = await this.ordersRepository.findOne({ 
      where: { id }, 
      relations: ['user', 'orderItemsList'] 
    });
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return updatedOrder;
  }

  async remove(id: number): Promise<void> {
    const result = await this.ordersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
  }
}