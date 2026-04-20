import { IsEnum, IsOptional, IsDateString, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';
import { ReportType } from '../enums/report-type.enum';
import { Transform } from 'class-transformer';

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => value ? value.split(',').map(Number) : [])
  categoryIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => value ? value.split(',').map(Number) : [])
  menuItemIds?: number[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;

  @IsOptional()
  @IsString()
  sortBy?: string = 'totalRevenue';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}