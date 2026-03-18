import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(loginDto: LoginDto): Promise<{ user: any, access_token: string }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const payload = { sub: user.id, username: user.fullname };
    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        provider: user.provider,
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(registerDto: RegisterDto): Promise<{ user: any }> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmailOrNull(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    const user = await this.usersService.create({
      fullname: registerDto.full_name || registerDto.email.split('@')[0], // Use email prefix as username if not provided
      email: registerDto.email,
      password: hashedPassword,
      provider: registerDto.provider || 'local', // Default to 'local' if not provided
      role: registerDto.role && Role[registerDto.role as keyof typeof Role] ? Role[registerDto.role as keyof typeof Role] : Role.Customer, // Use provided role or default to Customer
    });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        provider: user.provider,
      
      },
    };
  }

  async getProfile(userId: number){
    const user = await this.usersService.findOne(userId);
    
    if(!user){
      throw new UnauthorizedException('User not found');
    }
    // return without password
    const { password, ...result } = user;
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      role: user.role,
      provider: user.provider,
    };
  }
}
