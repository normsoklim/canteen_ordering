import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';
import { OtpService } from './otp.service';
import { EmailService } from '../email/email.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private emailService: EmailService,
  ) {}

  async signIn(
    loginDto: LoginDto,
  ): Promise<{ user: any; access_token: string }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

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
        providerId: user.providerId,
        googleId: user.googleId,
        facebookId: user.facebookId,
        isEmailVerified: user.isEmailVerified,
        phone: user.phone,
        
      
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(registerDto: RegisterDto): Promise<{ message: string; email: string }> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmailOrNull(
      registerDto.email,
    );
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    // Generate and send OTP
    const otpCode = await this.otpService.createOtp(registerDto.email);
    const emailSent = await this.emailService.sendOtpEmail(registerDto.email, otpCode);

    if (!emailSent) {
      throw new BadRequestException('Failed to send OTP email');
    }

    return {
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: registerDto.email,
    };
  }

  async verifyRegistration(verifyRegDto: VerifyRegistrationDto): Promise<{ user: any }> {
    const { email, otpCode, full_name, password, provider, role, providerId, googleId, facebookId ,phone } = verifyRegDto;
    
    // Verify OTP
    const isOtpValid = await this.otpService.verifyOtp(email, otpCode);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Check if user still doesn't exist (prevent race conditions)
    const existingUser = await this.usersService.findByEmailOrNull(email);
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    // Create the user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      fullname: full_name || email.split('@')[0],
      email: email,
      password: hashedPassword,
      provider: provider || 'local',
      role:
        role && Role[role as keyof typeof Role]
          ? Role[role as keyof typeof Role]
          : Role.Customer,
      providerId: providerId,
      googleId: googleId,
      facebookId: facebookId,
      isEmailVerified: true,
      phone: phone,
      emailVerifiedAt: new Date(),
      
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.fullname);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        provider: user.provider,
        providerId: user.providerId,
        googleId: user.googleId,
        facebookId: user.facebookId,
        isEmailVerified: user.isEmailVerified,
        phone: user.phone,
      },
    };
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmailOrNull(email);
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    // Check if there's already a valid OTP
    const hasValidOtp = await this.otpService.hasValidOtp(email);
    if (hasValidOtp) {
      throw new BadRequestException('OTP already sent. Please wait before requesting a new one.');
    }

    // Generate and send new OTP
    const otpCode = await this.otpService.createOtp(email);
    const emailSent = await this.emailService.sendOtpEmail(email, otpCode);

    if (!emailSent) {
      throw new BadRequestException('Failed to send OTP email');
    }

    return {
      message: 'New OTP sent to your email.',
    };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
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
      providerId: user.providerId,
      googleId: user.googleId,
      facebookId: user.facebookId,
      phone: user.phone,
    };
  }
  
  async validateOAuthLogin(registerDto: RegisterDto): Promise<any> {
    let user = await this.usersService.findByEmailOrNull(registerDto.email);
    if (user) {
      // Update existing user with provider information if not set
      if (registerDto.providerId && !user.providerId) {
        user.providerId = registerDto.providerId;
        if (registerDto.provider === 'google' && !user.googleId) {
          user.googleId = registerDto.googleId;
        }
        if (registerDto.provider === 'facebook' && !user.facebookId) {
          user.facebookId = registerDto.facebookId;
        }
        await this.usersService.update(user.id, user);
      }
      return user;
    } else {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      user = await this.usersService.create({
        fullname: registerDto.full_name || registerDto.email.split('@')[0],
        email: registerDto.email,
        password: hashedPassword,
        provider: registerDto.provider || 'local',
        role:
          registerDto.role && Role[registerDto.role as keyof typeof Role]
            ? Role[registerDto.role as keyof typeof Role]
            : Role.Customer,
        providerId: registerDto.providerId,
        googleId: registerDto.googleId,
        facebookId: registerDto.facebookId,
        isEmailVerified: registerDto.isEmailVerified ?? false,
        emailVerifiedAt: registerDto.isEmailVerified ? new Date() : undefined,
        phone: registerDto.phone,
      });
      return user;
    }
  }
  
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmailVerificationToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.usersService.verifyEmail(user.id);

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Request password reset by sending OTP to user's email
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmailOrNull(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If the email exists, an OTP has been sent to your email' };
    }

    // Generate and send OTP
    const otpCode = await this.otpService.createOtp(email);
    const emailSent = await this.emailService.sendPasswordResetOtpEmail(email, otpCode);

    if (!emailSent) {
      throw new BadRequestException('Failed to send OTP email');
    }

    return { message: 'If the email exists, an OTP has been sent to your email' };
  }

  /**
   * Reset password using OTP verification
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otpCode, newPassword } = resetPasswordDto;

    // Verify OTP
    const isOtpValid = await this.otpService.verifyOtp(email, otpCode);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Check if user exists
    const user = await this.usersService.findByEmailOrNull(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersService.updatePassword(email, hashedPassword);

    return { message: 'Password reset successfully' };
  }

  async logout(userId: number): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { message: 'Logged out successfully' };
  }
}
