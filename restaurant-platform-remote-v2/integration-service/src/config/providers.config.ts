import { registerAs } from '@nestjs/config';

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  webhookSecret: string;
  webhookPath: string;
  signatureHeader: string;
  ipWhitelist?: string[];
}

export default registerAs('providers', () => ({
  // Careem configuration
  careem: {
    name: 'careem',
    enabled: true,
    webhookSecret: process.env.CAREEM_WEBHOOK_SECRET || 'careem-webhook-secret-change-in-production',
    webhookPath: '/webhooks/careem',
    signatureHeader: 'x-careem-signature',
    ipWhitelist: process.env.CAREEM_IP_WHITELIST?.split(',') || [],
  } as ProviderConfig,

  // Talabat configuration
  talabat: {
    name: 'talabat',
    enabled: true,
    webhookSecret: process.env.TALABAT_WEBHOOK_SECRET || 'talabat-webhook-secret-change-in-production',
    webhookPath: '/webhooks/talabat',
    signatureHeader: 'x-talabat-signature',
    ipWhitelist: process.env.TALABAT_IP_WHITELIST?.split(',') || [],
  } as ProviderConfig,

  // Add more providers here as needed
  // deliveroo, ubereats, etc.
}));