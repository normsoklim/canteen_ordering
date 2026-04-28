import { IsEnum, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ReportType } from '../enums/report-type.enum';
import { ExportFormat } from '../enums/export-format.enum';

export class CreateReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsNumber()
  generatedBy: number;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat = ExportFormat.PDF;
}
