import { IsString, IsEmail, IsOptional, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../roles/entities/role.entity';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullname?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  roleId?: number;

  @IsString()
  @IsOptional()
  provider?: string;
}