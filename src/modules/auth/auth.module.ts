import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { jwtConstants } from '../../config/jwt.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy/facebook.strategy';
import { GoogleAuthGuard } from 'src/common/guards/google-auth/google-auth.guard';
import { FacebookAuthGuard } from 'src/common/guards/facebook-auth/facebook-auth.guard';
import { OtpService } from './otp.service';
import { Otp } from './entities/otp.entity';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp]),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'google' }),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '60m') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, EmailService, JwtStrategy, GoogleStrategy, FacebookStrategy, GoogleAuthGuard, FacebookAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}