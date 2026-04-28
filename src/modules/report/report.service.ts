import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportItem } from './entities/report-item.entity';
import { ReportType } from './enums/report-type.enum';
import { ExportFormat } from './enums/export-format.enum';
import { ReportStatus } from './enums/report-status.enum';
import { GenerateReportDto, SORTABLE_COLUMNS, SortableColumn } from './dto/generate-report.dto';
import {
  ReportResponseDto,
  ReportItemResponseDto,
  ReportPreviewResponseDto,
  PaginatedReportsResponseDto,
} from './dto/report-response.dto';
import { SalesDataItem, ReportSummary } from './interfaces/sales-data.interface';
import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import * as createCsvWriter from 'csv-writer';
import { join } from 'path';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';

/** Maps DTO sortBy values to raw SQL aliases used in the query */
const SORT_COLUMN_MAP: Record<SortableColumn, string> = {
  totalRevenue: 'total_revenue',
  totalQuantitySold: 'total_quantity_sold',
  orderCount: 'order_count',
  menuItemName: 'menu_item_name',
};

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportItem)
    private readonly reportItemRepository: Repository<ReportItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async generateReport(generateReportDto: GenerateReportDto, userId: number): Promise<ReportResponseDto> {
    this.validateDateRange(generateReportDto.startDate, generateReportDto.endDate);

    const report = this.reportRepository.create({
      generatedBy: userId,
      reportType: generateReportDto.reportType,
      period_start: new Date(generateReportDto.startDate),
      period_end: new Date(generateReportDto.endDate),
      export_format: generateReportDto.exportFormat,
      status: ReportStatus.PROCESSING,
      estimated_completion_time: new Date(Date.now() + 30000),
    });

    const savedReport = await this.reportRepository.save(report);

    // Process report data asynchronously — errors are caught and mark the report as FAILED
    this.processReportData(savedReport.id, generateReportDto).catch((err) => {
      this.logger.error(`Report ${savedReport.id} processing failed: ${err.message}`, err.stack);
    });

    return this.mapToReportResponseDto(savedReport);
  }

  // ---------------------------------------------------------------------------
  // Report processing
  // ---------------------------------------------------------------------------

  private async processReportData(reportId: number, dto: GenerateReportDto): Promise<void> {
    try {
      const salesData = await this.aggregateSalesData(dto);

      const reportItems = salesData.map((item, index) =>
        this.reportItemRepository.create({
          report_id: reportId,
          menu_id: item.menuItemId,
          item_name: item.menuItemName,
          category_name: item.categoryName ?? undefined,
          totalQuantitySold: item.totalQuantitySold,
          totalRevenue: item.totalRevenue,
          orderCount: item.orderCount,
          rank: index + 1,
        }),
      );

      await this.reportItemRepository.save(reportItems);

      const totalRevenue = salesData.reduce((sum, item) => sum + Number(item.totalRevenue), 0);
      const totalOrders = salesData.reduce((sum, item) => sum + Number(item.orderCount), 0);
      const paidTransactions = await this.getPaidTransactionsCount(dto);

      await this.reportRepository.update(reportId, {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        paid_transactions: paidTransactions,
        status: ReportStatus.COMPLETED,
        estimated_completion_time: null as unknown as Date,
      });

      await this.generateExportFile(reportId, dto.exportFormat, salesData);
    } catch (error) {
      await this.reportRepository.update(reportId, {
        status: ReportStatus.FAILED,
        estimated_completion_time: null as unknown as Date,
      });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Data aggregation
  // ---------------------------------------------------------------------------

  private async aggregateSalesData(dto: GenerateReportDto): Promise<SalesDataItem[]> {
    const sortBy = SORT_COLUMN_MAP[dto.sortBy ?? 'totalRevenue'] ?? 'totalRevenue';
    const sortOrder = dto.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('menuItem.id', 'menu_item_id')
      .addSelect('menuItem.name', 'menu_item_name')
      .addSelect('category.category_name', 'category_name')
      .addSelect('SUM(orderItem.quantity)', 'total_quantity_sold')
      .addSelect('SUM(orderItem.subTotal)', 'total_revenue')
      .addSelect('COUNT(DISTINCT orderItem.order_id)', 'order_count')
      .innerJoin('orderItem.order', 'orderEntity')
      .innerJoin('orderItem.menuItem', 'menuItem')
      .leftJoin('menuItem.category', 'category')
      .where('orderEntity.order_date BETWEEN :startDate AND :endDate', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });

    if (dto.categoryIds?.length) {
      queryBuilder.andWhere('menuItem.category_id IN (:...categoryIds)', {
        categoryIds: dto.categoryIds,
      });
    }

    if (dto.menuItemIds?.length) {
      queryBuilder.andWhere('menuItem.id IN (:...menuItemIds)', {
        menuItemIds: dto.menuItemIds,
      });
    }

    if (dto.status) {
      queryBuilder.andWhere('orderEntity.status = :status', {
        status: dto.status,
      });
    }

    queryBuilder
      .groupBy('menuItem.id, menuItem.name, category.category_name')
      .orderBy(`"${sortBy}"`, sortOrder)
      .limit(dto.limit)
      .offset(dto.offset);

    const rawResults = await queryBuilder.getRawMany();

    return rawResults.map((row) => ({
      menuItemId: Number(row.menu_item_id),
      menuItemName: row.menu_item_name,
      categoryName: row.category_name ?? undefined,
      totalQuantitySold: Number(row.total_quantity_sold),
      totalRevenue: Number(row.total_revenue),
      orderCount: Number(row.order_count),
    }));
  }

  private async getPaidTransactionsCount(dto: GenerateReportDto): Promise<number> {
    return this.paymentRepository.count({
      where: {
        createdAt: Between(new Date(dto.startDate), new Date(dto.endDate)),
        status: PaymentStatus.COMPLETED,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Export file generation
  // ---------------------------------------------------------------------------

  private async generateExportFile(reportId: number, exportFormat: ExportFormat, data: SalesDataItem[]): Promise<void> {
    const reportsDir = join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const filename = `report_${reportId}_${Date.now()}`;
    let filePath: string;

    switch (exportFormat) {
      case ExportFormat.PDF:
        filePath = join(reportsDir, `${filename}.pdf`);
        await this.generatePDF(filePath, data);
        break;
      case ExportFormat.CSV:
        filePath = join(reportsDir, `${filename}.csv`);
        await this.generateCSV(filePath, data);
        break;
      case ExportFormat.EXCEL:
        filePath = join(reportsDir, `${filename}.xlsx`);
        await this.generateExcel(filePath, data);
        break;
      default:
        throw new BadRequestException(`Unsupported export format: ${exportFormat}`);
    }

    await this.reportRepository.update(reportId, { file_url: filePath });
  }

  private async generatePDF(filePath: string, data: SalesDataItem[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Canteen Sales Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(1);

      // Summary section
      const totalRevenue = data.reduce((sum, item) => sum + Number(item.totalRevenue), 0);
      const totalItems = data.reduce((sum, item) => sum + Number(item.totalQuantitySold), 0);

      doc.fontSize(16).text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .text(`Total Revenue: $${totalRevenue.toFixed(2)}`)
        .text(`Total Items Sold: ${totalItems}`)
        .text(`Number of Items: ${data.length}`);
      doc.moveDown(1);

      // Table header
      const tableTop = doc.y;
      const colX = { item: 50, category: 220, qty: 320, revenue: 390, orders: 480 };
      const colWidths = { item: 170, category: 100, qty: 70, revenue: 90, orders: 70 };

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Item', colX.item, tableTop, { width: colWidths.item });
      doc.text('Category', colX.category, tableTop, { width: colWidths.category });
      doc.text('Qty', colX.qty, tableTop, { width: colWidths.qty, align: 'right' });
      doc.text('Revenue', colX.revenue, tableTop, { width: colWidths.revenue, align: 'right' });
      doc.text('Orders', colX.orders, tableTop, { width: colWidths.orders, align: 'right' });

      // Separator line
      let yPosition = tableTop + 20;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;

      // Table rows
      doc.font('Helvetica');
      data.forEach((item) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.text(item.menuItemName, colX.item, yPosition, { width: colWidths.item });
        doc.text(item.categoryName ?? '—', colX.category, yPosition, { width: colWidths.category });
        doc.text(String(item.totalQuantitySold), colX.qty, yPosition, { width: colWidths.qty, align: 'right' });
        doc.text(`$${Number(item.totalRevenue).toFixed(2)}`, colX.revenue, yPosition, { width: colWidths.revenue, align: 'right' });
        doc.text(String(item.orderCount), colX.orders, yPosition, { width: colWidths.orders, align: 'right' });

        yPosition += 20;
      });

      // Footer with page numbers on every page
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(9).text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 40, {
          align: 'center',
          width: doc.page.width - 100,
        });
      }

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private async generateCSV(filePath: string, data: SalesDataItem[]): Promise<void> {
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'menuItemName', title: 'Item Name' },
        { id: 'categoryName', title: 'Category' },
        { id: 'totalQuantitySold', title: 'Quantity Sold' },
        { id: 'totalRevenue', title: 'Total Revenue' },
        { id: 'orderCount', title: 'Order Count' },
      ],
    });

    await csvWriter.writeRecords(
      data.map((item) => ({
        menuItemName: item.menuItemName,
        categoryName: item.categoryName ?? '',
        totalQuantitySold: item.totalQuantitySold,
        totalRevenue: Number(item.totalRevenue).toFixed(2),
        orderCount: item.orderCount,
      })),
    );
  }

  private async generateExcel(filePath: string, data: SalesDataItem[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Style definitions
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center' },
      border: {
        bottom: { style: 'thin' },
      },
    };

    // Add headers
    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Item Name', key: 'menuItemName', width: 30 },
      { header: 'Category', key: 'categoryName', width: 20 },
      { header: 'Quantity Sold', key: 'totalQuantitySold', width: 15 },
      { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
      { header: 'Order Count', key: 'orderCount', width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Add data rows
    data.forEach((item, index) => {
      worksheet.addRow({
        rank: index + 1,
        menuItemName: item.menuItemName,
        categoryName: item.categoryName ?? '—',
        totalQuantitySold: Number(item.totalQuantitySold),
        totalRevenue: Number(item.totalRevenue),
        orderCount: Number(item.orderCount),
      });
    });

    // Add summary row
    const totalRow = worksheet.addRow({
      rank: '',
      menuItemName: 'TOTAL',
      categoryName: '',
      totalQuantitySold: data.reduce((sum, item) => sum + Number(item.totalQuantitySold), 0),
      totalRevenue: data.reduce((sum, item) => sum + Number(item.totalRevenue), 0),
      orderCount: data.reduce((sum, item) => sum + Number(item.orderCount), 0),
    });
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'double' } };
    });

    // Format revenue column as currency
    worksheet.getColumn('totalRevenue').numFmt = '$#,##0.00';

    await workbook.xlsx.writeFile(filePath);
  }

  // ---------------------------------------------------------------------------
  // Preview & retrieval
  // ---------------------------------------------------------------------------

  async getReportPreview(dto: GenerateReportDto): Promise<ReportPreviewResponseDto> {
    const salesData = await this.aggregateSalesData({
      ...dto,
      limit: 10,
      offset: 0,
    });

    const totalRevenue = salesData.reduce((sum, item) => sum + Number(item.totalRevenue), 0);
    const totalOrders = salesData.reduce((sum, item) => sum + Number(item.orderCount), 0);
    const totalItemsSold = salesData.reduce((sum, item) => sum + Number(item.totalQuantitySold), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const paidTransactions = await this.getPaidTransactionsCount(dto);

    return {
      summary: {
        totalRevenue,
        totalOrders,
        totalItemsSold,
        averageOrderValue,
        paidTransactions,
        period: `${new Date(dto.startDate).toLocaleDateString()} - ${new Date(dto.endDate).toLocaleDateString()}`,
      },
      topItems: salesData.slice(0, 5).map((item, index) => ({
        id: item.menuItemId,
        menuItemName: item.menuItemName,
        categoryName: item.categoryName,
        totalQuantitySold: item.totalQuantitySold,
        totalRevenue: item.totalRevenue,
        orderCount: item.orderCount,
        rank: index + 1,
      })),
      totalPages: Math.ceil(salesData.length / (dto.limit || 50)),
      currentPage: 1,
    };
  }

  async getReportById(id: number): Promise<ReportResponseDto> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['reportItems'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return this.mapToReportResponseDto(report);
  }

  async getUserReports(userId: number, page: number = 1, limit: number = 10): Promise<PaginatedReportsResponseDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [reports, total] = await this.reportRepository.findAndCount({
      where: { generatedBy: userId },
      order: { generated_at: 'DESC' },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      reports: reports.map((report) => this.mapToReportResponseDto(report)),
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ---------------------------------------------------------------------------
  // Download & delete
  // ---------------------------------------------------------------------------

  async downloadReport(id: number): Promise<{ filePath: string; filename: string }> {
    const report = await this.reportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.status !== ReportStatus.COMPLETED) {
      throw new BadRequestException(`Report is not ready for download (status: ${report.status})`);
    }

    if (!report.file_url) {
      throw new BadRequestException('Report file not available');
    }

    const filename = `report_${id}_${new Date(report.generated_at).toISOString().split('T')[0]}.${report.export_format.toLowerCase()}`;

    return { filePath: report.file_url, filename };
  }

  async deleteReport(id: number, userId: number): Promise<void> {
    const report = await this.reportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.generatedBy !== userId) {
      throw new BadRequestException('You can only delete your own reports');
    }

    // Clean up the file from disk
    if (report.file_url) {
      try {
        await fs.unlink(report.file_url);
      } catch (err) {
        // File may already be deleted — log but don't block
        this.logger.warn(`Could not delete report file at ${report.file_url}: ${err.message}`);
      }
    }

    await this.reportRepository.remove(report);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format for startDate or endDate');
    }

    if (start > end) {
      throw new BadRequestException('startDate must be before endDate');
    }

    // Prevent querying more than 1 year of data at once
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYearMs) {
      throw new BadRequestException('Date range cannot exceed 1 year');
    }
  }

  private mapToReportResponseDto(report: Report): ReportResponseDto {
    return {
      id: report.id,
      reportType: report.reportType as ReportType,
      generatedBy: report.generatedBy,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      totalRevenue: Number(report.total_revenue),
      totalOrders: report.total_orders,
      paidTransactions: report.paid_transactions,
      exportFormat: report.export_format as ExportFormat,
      fileUrl: report.file_url,
      generatedAt: report.generated_at,
      status: report.status,
      estimatedCompletionTime: report.estimated_completion_time,
      reportItems: report.reportItems?.map((item) => ({
        id: item.id,
        menuItemName: item.item_name,
        categoryName: item.category_name ?? undefined,
        totalQuantitySold: Number(item.totalQuantitySold),
        totalRevenue: Number(item.totalRevenue),
        orderCount: item.orderCount,
        rank: item.rank,
      })),
    };
  }
}
