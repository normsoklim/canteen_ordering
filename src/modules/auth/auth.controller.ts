import { GoogleCallbackParameters } from './../../../node_modules/@types/passport-google-oauth20/index.d';
import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { GoogleAuthGuard } from 'src/common/guards/google-auth/google-auth.guard';
import { FacebookAuthGuard } from 'src/common/guards/facebook-auth/facebook-auth.guard';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  signIn(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.signIn(loginDto);
  }
  
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<{ message: string; email: string }> {
    return this.authService.register(registerDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyRegDto: VerifyRegistrationDto): Promise<{ user: any }> {
    return this.authService.verifyRegistration(verifyRegDto);
  }

  @Post('logout')
  async logout(@User() user: any): Promise<{ message: string }> {
    return this.authService.logout(user.userId);
  }

  @Post('resend-otp')
  resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    return this.authService.resendOtp(resendOtpDto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@User() user: any) {
    return this.authService.getProfile(user.userId);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  GoogleCallback(@Req() req, @Res() res) {
    return res.redirect(`http://localhost:5173/login-success?token=${req.user.accessToken}`);
  }

 

  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  facebookCallback(@Req() req, @Res() res) {
    return res.redirect(`http://localhost:5173/login-success?token=${req.user.accessToken}`);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestPasswordResetDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}