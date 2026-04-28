import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsString,
  IsArray,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ReportType } from '../enums/report-type.enum';
import { ExportFormat } from '../enums/export-format.enum';
import { Transform } from 'class-transformer';

export const SORTABLE_COLUMNS = [
  'totalRevenue',
  'totalQuantitySold',
  'orderCount',
  'menuItemName',
] as const;

export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(ExportFormat)
  exportFormat: ExportFormat = ExportFormat.PDF;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => (value ? value.split(',').map(Number) : []))
  categoryIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => (value ? value.split(',').map(Number) : []))
  menuItemIds?: number[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => SORTABLE_COLUMNS.includes(o.sortBy))
  sortBy?: SortableColumn = 'totalRevenue';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
