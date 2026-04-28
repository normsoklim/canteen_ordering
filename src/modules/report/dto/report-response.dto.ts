import { ReportType } from '../enums/report-type.enum';
import { ExportFormat } from '../enums/export-format.enum';
import { ReportStatus } from '../enums/report-status.enum';

export class ReportItemResponseDto {
  id: number;
  menuItemName: string;
  categoryName?: string;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
  rank: number;
}

export class ReportResponseDto {
  id: number;
  reportType: ReportType;
  generatedBy: number;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  totalOrders: number;
  paidTransactions: number;
  exportFormat: ExportFormat;
  fileUrl: string;
  generatedAt: Date;
  status: ReportStatus;
  estimatedCompletionTime?: Date;
  reportItems?: ReportItemResponseDto[];
}

export class ReportPreviewResponseDto {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalItemsSold: number;
    averageOrderValue: number;
    paidTransactions: number;
    period: string;
  };
  topItems: ReportItemResponseDto[];
  totalPages: number;
  currentPage: number;
}

export class PaginatedReportsResponseDto {
  reports: ReportResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
