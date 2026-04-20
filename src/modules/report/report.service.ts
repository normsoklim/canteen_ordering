import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportItem } from './entities/report-item.entity';
import { ReportType } from './enums/report-type.enum';
import { ReportStatus } from './enums/report-status.enum';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportResponseDto, ReportItemResponseDto, ReportPreviewResponseDto } from './dto/report-response.dto';
import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import * as createCsvWriter from 'csv-writer';
import { join } from 'path';
import { promises as fs, createWriteStream } from 'fs';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';

@Injectable()
export class ReportService {
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
    // Create report record
    const report = this.reportRepository.create({
      generatedBy: userId,
      reportType: 'Sales Report',
      period_start: new Date(generateReportDto.startDate),
      period_end: new Date(generateReportDto.endDate),
      export_format: generateReportDto.reportType,
      status: ReportStatus.PROCESSING,
      estimated_completion_time: new Date(Date.now() + 30000), // 30 seconds estimate
    });

    const savedReport = await this.reportRepository.save(report);

    // Process report data in background
    this.processReportData(savedReport.id, generateReportDto);

    return this.mapToReportResponseDto(savedReport);
  }

  private async processReportData(reportId: number, generateReportDto: GenerateReportDto): Promise<void> {
    try {
      // Aggregate sales data
      const salesData = await this.aggregateSalesData(generateReportDto);
      
      // Create report items
      const reportItems = salesData.map((item, index) =>
        this.reportItemRepository.create({
          report_id: reportId,
          menu_id: item.menuItemId,
          item_name: item.menuItemName,
          totalQuantitySold: item.totalQuantitySold,
          totalRevenue: item.totalRevenue,
          orderCount: item.orderCount,
          rank: index + 1,
        })
      );

      await this.reportItemRepository.save(reportItems);

      // Calculate totals
      const totalRevenue = salesData.reduce((sum, item) => sum + item.totalRevenue, 0);
      const totalOrders = salesData.reduce((sum, item) => sum + item.orderCount, 0);
      const paidTransactions = await this.getPaidTransactionsCount(generateReportDto);

      // Update report with final data
      await this.reportRepository.update(reportId, {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        paid_transactions: paidTransactions,
        status: ReportStatus.COMPLETED,
        estimated_completion_time: undefined,
      });

      // Generate export file
      await this.generateExportFile(reportId, generateReportDto.reportType, salesData);

    } catch (error) {
      await this.reportRepository.update(reportId, {
        status: ReportStatus.FAILED,
        estimated_completion_time: undefined,
      });
      throw error;
    }
  }

  private async aggregateSalesData(generateReportDto: GenerateReportDto): Promise<any[]> {
    const queryBuilder = this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('menuItem.id', 'menuItemId')
      .addSelect('menuItem.name', 'menuItemName')
      .addSelect('SUM(orderItem.quantity)', 'totalQuantitySold')
      .addSelect('SUM(orderItem.subTotal)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT orderItem.order_id)', 'orderCount')
      .innerJoin('orderItem.order', 'orderEntity')
      .innerJoin('orderItem.menuItem', 'menuItem')
      .where('orderEntity.order_date BETWEEN :startDate AND :endDate', {
        startDate: generateReportDto.startDate,
        endDate: generateReportDto.endDate,
      });

    // Apply filters
    if (generateReportDto.categoryIds?.length) {
      queryBuilder.andWhere('menuItem.category_id IN (:...categoryIds)', {
        categoryIds: generateReportDto.categoryIds,
      });
    }

    if (generateReportDto.menuItemIds?.length) {
      queryBuilder.andWhere('menuItem.id IN (:...menuItemIds)', {
        menuItemIds: generateReportDto.menuItemIds,
      });
    }

    if (generateReportDto.status) {
      queryBuilder.andWhere('orderEntity.status = :status', {
        status: generateReportDto.status,
      });
    }

    // Apply sorting and pagination
    queryBuilder
      .groupBy('menuItem.id, menuItem.name')
      .orderBy(generateReportDto.sortBy || 'totalRevenue', generateReportDto.sortOrder || 'DESC')
      .limit(generateReportDto.limit)
      .offset(generateReportDto.offset);

    return await queryBuilder.getRawMany();
  }

  private async getPaidTransactionsCount(generateReportDto: GenerateReportDto): Promise<number> {
    return await this.paymentRepository.count({
      where: {
        createdAt: Between(
          new Date(generateReportDto.startDate),
          new Date(generateReportDto.endDate)
        ),
        status: PaymentStatus.COMPLETED,
      },
    });
  }

  private async generateExportFile(reportId: number, exportFormat: ReportType, data: any[]): Promise<void> {
    const reportsDir = join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const filename = `report_${reportId}_${Date.now()}`;
    let filePath: string;

    switch (exportFormat) {
      case ReportType.PDF:
        filePath = join(reportsDir, `${filename}.pdf`);
        await this.generatePDF(filePath, data);
        break;
      case ReportType.CSV:
        filePath = join(reportsDir, `${filename}.csv`);
        await this.generateCSV(filePath, data);
        break;
      case ReportType.EXCEL:
        filePath = join(reportsDir, `${filename}.xlsx`);
        await this.generateExcel(filePath, data);
        break;
    }

    // Update report with file URL
    await this.reportRepository.update(reportId, {
      file_url: filePath,
    });
  }

  private async generatePDF(filePath: string, data: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);
      
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Canteen Sales Report', 50, 50);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
      
      // Summary section
      doc.fontSize(16).text('Summary', 50, 120);
      const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);
      const totalItems = data.reduce((sum, item) => sum + item.totalQuantitySold, 0);
      
      doc.fontSize(12)
        .text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 50, 150)
        .text(`Total Items Sold: ${totalItems}`, 50, 170);

      // Table header
      let yPosition = 220;
      doc.fontSize(12)
        .text('Item', 50, yPosition)
        .text('Quantity', 250, yPosition)
        .text('Revenue', 350, yPosition)
        .text('Orders', 450, yPosition);

      yPosition += 30;

      // Table rows
      data.forEach((item, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(item.menuItemName, 50, yPosition)
          .text(item.totalQuantitySold.toString(), 250, yPosition)
          .text(`$${item.totalRevenue.toFixed(2)}`, 350, yPosition)
          .text(item.orderCount.toString(), 450, yPosition);
        
        yPosition += 20;
      });

      // Footer with page numbers
      doc.on('pageAdded', () => {
        const pageNumber = doc.page;
        doc.text(`Page ${pageNumber}`, 50, doc.page.height - 50);
      });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private async generateCSV(filePath: string, data: any[]): Promise<void> {
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'menuItemName', title: 'Item Name' },
        { id: 'totalQuantitySold', title: 'Quantity Sold' },
        { id: 'totalRevenue', title: 'Total Revenue' },
        { id: 'orderCount', title: 'Order Count' },
      ],
    });

    await csvWriter.writeRecords(data);
  }

  private async generateExcel(filePath: string, data: any[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add headers
    worksheet.columns = [
      { header: 'Item Name', key: 'menuItemName', width: 30 },
      { header: 'Quantity Sold', key: 'totalQuantitySold', width: 15 },
      { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
      { header: 'Order Count', key: 'orderCount', width: 15 },
    ];

    // Add data
    worksheet.addRows(data);

    // Add summary row
    const totalRow = worksheet.addRow({
      menuItemName: 'TOTAL',
      totalQuantitySold: data.reduce((sum, item) => sum + item.totalQuantitySold, 0),
      totalRevenue: data.reduce((sum, item) => sum + item.totalRevenue, 0),
      orderCount: data.reduce((sum, item) => sum + item.orderCount, 0),
    });

    totalRow.font = { bold: true };

    await workbook.xlsx.writeFile(filePath);
  }

  async getReportPreview(generateReportDto: GenerateReportDto): Promise<ReportPreviewResponseDto> {
    const salesData = await this.aggregateSalesData({
      ...generateReportDto,
      limit: 10,
      offset: 0,
    });

    const totalRevenue = salesData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalOrders = salesData.reduce((sum, item) => sum + item.orderCount, 0);
    const totalItemsSold = salesData.reduce((sum, item) => sum + item.totalQuantitySold, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      summary: {
        totalRevenue,
        totalOrders,
        totalItemsSold,
        averageOrderValue,
        period: `${new Date(generateReportDto.startDate).toLocaleDateString()} - ${new Date(generateReportDto.endDate).toLocaleDateString()}`,
      },
      topItems: salesData.slice(0, 5).map(item => ({
        id: item.menuItemId,
        menuItemName: item.menuItemName,
        totalQuantitySold: item.totalQuantitySold,
        totalRevenue: item.totalRevenue,
        orderCount: item.orderCount,
        rank: salesData.indexOf(item) + 1,
      })),
      totalPages: Math.ceil(salesData.length / (generateReportDto.limit || 50)),
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

  async getUserReports(userId: number, page: number = 1, limit: number = 10): Promise<{ reports: ReportResponseDto[], total: number }> {
    const [reports, total] = await this.reportRepository.findAndCount({
      where: { generatedBy: userId },
      order: { generated_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      reports: reports.map(report => this.mapToReportResponseDto(report)),
      total,
    };
  }

  async downloadReport(id: number): Promise<{ filePath: string; filename: string }> {
    const report = await this.reportRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (!report.file_url) {
      throw new BadRequestException('Report file not available');
    }

    const filename = `report_${id}_${new Date(report.generated_at).toISOString().split('T')[0]}.${report.export_format.toLowerCase()}`;
    
    return {
      filePath: report.file_url,
      filename,
    };
  }

  private mapToReportResponseDto(report: Report): ReportResponseDto {
    return {
      id: report.id,
      reportType: report.reportType,
      generatedBy: report.generatedBy,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      totalRevenue: report.total_revenue,
      totalOrders: report.total_orders,
      paidTransactions: report.paid_transactions,
      exportFormat: report.export_format as ReportType,
      fileUrl: report.file_url,
      generatedAt: report.generated_at,
      status: report.status,
      estimatedCompletionTime: report.estimated_completion_time,
    };
  }
}
