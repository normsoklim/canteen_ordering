import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MenuItem } from '../../menu/entities/menu-item.entity';
import { IsString, IsNotEmpty } from 'class-validator';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({name: 'category_id'})
  id: number;

  @Column({ name: 'category_name', unique: true })
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description?: string;

  @Column({ default:true})
  status: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.category)
  menuItems: MenuItem[];
}