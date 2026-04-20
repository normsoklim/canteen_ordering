import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  ParseIntPipe,
  BadRequestException
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportResponseDto, ReportPreviewResponseDto } from './dto/report-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { readFileSync } from 'fs';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('generate')
  async generateReport(
    @Body() generateReportDto: GenerateReportDto,
    @User() user: any
  ): Promise<ReportResponseDto> {
    return this.reportService.generateReport(generateReportDto, user.userId);
  }

  @Post('preview')
  async getReportPreview(
    @Body() generateReportDto: GenerateReportDto
  ): Promise<ReportPreviewResponseDto> {
    return this.reportService.getReportPreview(generateReportDto);
  }

  @Get()
  async getUserReports(
    @User() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10
  ): Promise<{ reports: ReportResponseDto[], total: number }> {
    return this.reportService.getUserReports(user.userId, page, limit);
  }

  @Get(':id')
  async getReportById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ReportResponseDto> {
    return this.reportService.getReportById(id);
  }

  @Get(':id/download')
  async downloadReport(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ): Promise<void> {
    try {
      const { filePath, filename } = await this.reportService.downloadReport(id);
      
      // Set appropriate headers based on file type
      const fileExtension = filename.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (fileExtension) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'csv':
          contentType = 'text/csv';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileContent = readFileSync(filePath);
      res.send(fileContent);
      
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
        });
      } else if (error.code === 'ENOENT') {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Report file not found',
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to download report',
        });
      }
    }
  }

  @Get(':id/status')
  async getReportStatus(
    @Param('id', ParseIntPipe) id: number
  ): Promise<{ status: string; estimatedCompletionTime?: Date }> {
    const report = await this.reportService.getReportById(id);
    return {
      status: report.status,
      estimatedCompletionTime: report.estimatedCompletionTime,
    };
  }
}
