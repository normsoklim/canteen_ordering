import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullname: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @IsOptional() // Make password optional for social logins
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  facebookId?: string;

  @IsOptional()
  isEmailVerified?: boolean;

  @IsOptional()
  emailVerificationToken?: string;

  @IsOptional()
  emailVerifiedAt?: Date;

  @IsString()
  @IsOptional()
  phone?: string;
}
