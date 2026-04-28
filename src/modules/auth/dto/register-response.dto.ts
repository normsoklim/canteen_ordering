export interface RegisterResponseDto {
    user: {
        id: number;
        email: string;
        fullname: string;
        role: string;
        phone:string;
        provider: string;
        isEmailVerified: boolean;
    };
}