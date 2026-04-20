export interface AuthResponseDto {
    user:{
        id: number;
        email: string;
        fullname: string;
        role: string;
        isEmailVerified: boolean;
        provider: string;
        providerId?: string;
        googleId?: string;
        facebookId?: string;
    };
    access_token: string;
}