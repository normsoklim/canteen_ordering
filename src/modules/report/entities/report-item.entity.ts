import { MenuItem } from 'src/modules/menu/entities/menu-item.entity';
import { Report } from './report.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('report_line_items')
export class ReportItem {
  @PrimaryGeneratedColumn({ name: 'line_item_id' })
  id: number;

  @Column()
  report_id: number;

  @Column()
  menu_id: number;

  @Column()
  item_name: string;

  @Column({ type: 'varchar', nullable: true })
  category_name: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalQuantitySold: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ default: 0 })
  orderCount: number;

  @Column()
  rank: number;

  @ManyToOne(() => Report, (report) => report.reportItems)
  @JoinColumn({ name: 'report_id' })
  report: Report;

  @ManyToOne(() => MenuItem)
  @JoinColumn({ name: 'menu_id' })
  menuItem: MenuItem;
}
