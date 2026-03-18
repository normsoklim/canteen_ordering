import { registerAs } from '@nestjs/config';

export interface BakongConfig {
  token: string;
  accountId: string;
  merchantName: string;
  merchantCity: string;
  apiUrl: string;
  isSandbox: boolean;
}

export default registerAs('bakong', (): BakongConfig => ({
  token: process.env.BAKONG_TOKEN!,
  accountId: process.env.BAKONG_ACCOUNT_ID!,
  merchantName: process.env.BAKONG_MERCHANT_NAME!,
  merchantCity: process.env.BAKONG_MERCHANT_CITY || 'Phnom Penh',
  apiUrl:
    process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh',
  isSandbox: process.env.NODE_ENV !== 'production',
}));