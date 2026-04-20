import { ReportType } from '../enums/report-type.enum';

export class ReportResponseDto {
  id: number;
  reportType: string;
  generatedBy: number;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  totalOrders: number;
  paidTransactions: number;
  exportFormat: ReportType;
  fileUrl: string;
  generatedAt: Date;
  status: 'processing' | 'completed' | 'failed';
  estimatedCompletionTime?: Date;
}

export class ReportItemResponseDto {
  id: number;
  menuItemName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
  rank: number;
  categoryName?: string;
}

export class ReportPreviewResponseDto {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalItemsSold: number;
    averageOrderValue: number;
    period: string;
  };
  topItems: ReportItemResponseDto[];
  totalPages: number;
  currentPage: number;
}