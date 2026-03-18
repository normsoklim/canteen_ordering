export interface AuthResponseDto {
    user:{
        id: number;
        email: string;
        fullname: string;
        role: string;
        provider: string;
    };
    access_token: string;
}