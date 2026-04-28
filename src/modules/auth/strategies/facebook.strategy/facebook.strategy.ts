import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { AuthService } from '../../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(
  Strategy,
  'facebook',
) {
  constructor(private authService: AuthService) {
    const clientID = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const callbackURL = process.env.FACEBOOK_CALLBACK_URL;

    if (!clientID) {
      throw new Error('FACEBOOK_APP_ID is not defined in environment variables');
    }
    if (!clientSecret) {
      throw new Error('FACEBOOK_APP_SECRET is not defined in environment variables');
    }
    if (!callbackURL) {
      throw new Error('FACEBOOK_CALLBACK_URL is not defined in environment variables');
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      profileFields: ['id', 'emails', 'name', 'displayName'],
      scope: ['email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const facebookId = profile.id;
    
    if (!email) {
      throw new Error('Email not provided by Facebook');
    }

    // Create or find user
    const user = await this.authService.validateOAuthLogin({
      email,
      full_name: name,
      provider: 'facebook',
      password: facebookId, // Use facebookId as password for OAuth users
      providerId: facebookId,
      facebookId: facebookId,
      isEmailVerified: true, // Facebook has already verified the email
      phone: '',
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
        facebookId: user.facebookId,
        phone: user.phone,
      },
    };
  }
}