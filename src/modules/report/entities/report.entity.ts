import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ReportType } from '../enums/report-type.enum';
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn({ name: 'report_id' })
  id: number;

  @Column({ name: 'generated_by' })
  generatedBy: number;

  @Column()
  reportType: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  period_start: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  period_end: Date;

  @Column()
  total_revenue: number;

  @Column()
  total_orders: number;

  @Column()
  paid_transactions:number;

  @Column({ type: 'enum', enum: ReportType })
  export_format:string;

  @Column()
  file_url:string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  generated_at:Date;
}
