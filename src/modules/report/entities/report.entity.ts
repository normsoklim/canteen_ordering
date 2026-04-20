import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ReportType } from '../enums/report-type.enum';
import { ReportStatus } from '../enums/report-status.enum';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn({ name: 'report_id' })
  id: number;

  @Column({ name: 'generated_by' })
  generatedBy: number;

  @Column({name: 'report_type', type: 'enum', enum: ReportType })
  reportType: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  period_start: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  period_end: Date;

  @Column({ default: 0 })
  total_revenue: number;

  @Column({ default: 0 })
  total_orders: number;

  @Column({ default: 0 })
  paid_transactions: number;

  @Column({ type: 'enum', enum: ReportType })
  export_format: string;

  @Column({ nullable: true })
  file_url: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  generated_at: Date;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PROCESSING
  })
  status: ReportStatus;

  @Column({ type: 'timestamp', nullable: true })
  estimated_completion_time: Date;
}
