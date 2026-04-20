export interface RegisterResponseDto {
    user: {
        id: number;
        email: string;
        fullname: string;
        role: string;
        provider: string;
        isEmailVerified: boolean;
    };
}