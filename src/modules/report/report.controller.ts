import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import {
  ReportResponseDto,
  ReportPreviewResponseDto,
  PaginatedReportsResponseDto,
} from './dto/report-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { createReadStream, statSync } from 'fs';

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('generate')
  async generateReport(
    @Body() generateReportDto: GenerateReportDto,
    @User() user: { userId: number },
  ): Promise<ReportResponseDto> {
    return this.reportService.generateReport(generateReportDto, user.userId);
  }

  @Post('preview')
  async getReportPreview(@Body() generateReportDto: GenerateReportDto): Promise<ReportPreviewResponseDto> {
    return this.reportService.getReportPreview(generateReportDto);
  }

  @Get()
  async getUserReports(
    @User() user: { userId: number },
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<PaginatedReportsResponseDto> {
    return this.reportService.getUserReports(user.userId, page, limit);
  }

  @Get(':id')
  async getReportById(@Param('id', ParseIntPipe) id: number): Promise<ReportResponseDto> {
    return this.reportService.getReportById(id);
  }

  @Get(':id/download')
  async downloadReport(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    try {
      const { filePath, filename } = await this.reportService.downloadReport(id);

      const fileExtension = filename.split('.').pop()?.toLowerCase() ?? '';
      const contentType = CONTENT_TYPES[fileExtension] ?? 'application/octet-stream';

      let fileSize: number;
      try {
        fileSize = statSync(filePath).size;
      } catch {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Report file not found on disk',
        });
        return;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileSize);

      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', () => {
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to stream report file',
          });
        }
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
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
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ status: string; estimatedCompletionTime?: Date }> {
    const report = await this.reportService.getReportById(id);
    return {
      status: report.status,
      estimatedCompletionTime: report.estimatedCompletionTime,
    };
  }

  @Delete(':id')
  async deleteReport(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { userId: number },
  ): Promise<{ message: string }> {
    await this.reportService.deleteReport(id, user.userId);
    return { message: `Report ${id} deleted successfully` };
  }
}
