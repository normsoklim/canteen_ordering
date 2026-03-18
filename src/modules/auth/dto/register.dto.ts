import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  full_name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be a valid role' })
  role?: string;

  @IsOptional()
  @IsString({ message: 'Provider must be a string' })
  provider?: string;

  @IsOptional()
  @IsString({ message: 'Google ID must be a string' })
  googleId?: string;

  @IsOptional()
  @IsString({ message: 'Facebook ID must be a string' })
  facebookId?: string;
}