import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AuthService } from '../../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const googleId = profile.id;
    
    if (!email) {
      throw new Error('Email not provided by Google');
    }

    // Create or find user
    const user = await this.authService.validateOAuthLogin({
      email,
      full_name: name,
      provider: 'google',
      password: googleId, // Use googleId as password for OAuth users
      providerId: googleId,
      googleId: googleId,
      isEmailVerified: true, // Google has already verified the email
    });

    // Generate JWT token
    const payload = { sub: user.id, username: user.fullname };
    const jwtToken = await this.authService['jwtService'].signAsync(payload);

    return {
      accessToken: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        provider: user.provider,
        providerId: user.providerId,
        googleId: user.googleId,
      },
    };
  }
}
