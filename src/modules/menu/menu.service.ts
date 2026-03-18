import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemsRepository: Repository<MenuItem>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const menuItem = new MenuItem();
    // Map the categoryId from DTO to category_id in entity
    Object.assign(menuItem, {
      ...createMenuItemDto,
      category_id: createMenuItemDto.categoryId
    });
    // Remove the categoryId property to avoid conflicts
    delete (menuItem as any).categoryId;
    
    const savedMenuItem = await this.menuItemsRepository.save(menuItem);
    
    // Fetch the saved menu item with category relation to return complete data
    const menuItemWithCategory = await this.menuItemsRepository.findOne({
      where: { id: savedMenuItem.id },
      relations: ['category']
    });
    
    if (!menuItemWithCategory) {
      // This should not happen, but if it does, return the saved item without category
      return savedMenuItem;
    }
    
    return menuItemWithCategory;
  }

  findAll(): Promise<MenuItem[]> {
    return this.menuItemsRepository.find({ relations: ['category'] });
  }

  async findOne(id: number): Promise<MenuItem> {
    const menuItem = await this.menuItemsRepository.findOne({ 
      where: { id }, 
      relations: ['category'] 
    });
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }
    return menuItem;
  }

  async update(id: number, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItem> {
    // Handle categoryId mapping for updates as well
    const updateData = {
      ...updateMenuItemDto,
      category_id: updateMenuItemDto.categoryId
    };
    delete (updateData as any).categoryId;
    
    await this.menuItemsRepository.update(id, updateData);
    const updatedMenuItem = await this.menuItemsRepository.findOne({
      where: { id },
      relations: ['category']
    });
    if (!updatedMenuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }
    return updatedMenuItem;
  }

  async remove(id: number): Promise<void> {
    const result = await this.menuItemsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }
  }
}