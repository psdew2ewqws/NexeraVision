import { IsString, IsArray, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class RegisterWebhookDto {
  @IsArray()
  @IsString({ each: true })
  providers: string[];

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;
}

export class StoreCredentialsDto {
  @IsString()
  provider: string;

  @IsObject()
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    webhookSecret?: string;
    baseUrl?: string;
    [key: string]: any;
  };
}

export class SyncOrderStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  providerOrderId?: string;
}

export class WebhookEventDto {
  @IsString()
  eventType: string;

  @IsString()
  provider: string;

  @IsString()
  orderId: string;

  @IsObject()
  orderData: any;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}

export class IntegrationConfigDto {
  @IsString()
  nexaraBaseUrl: string;

  @IsString()
  appBaseUrl: string;

  @IsOptional()
  @IsBoolean()
  enableRetries?: boolean;

  @IsOptional()
  @IsObject()
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface IntegrationStatus {
  provider: string;
  webhookId: string;
  isActive: boolean;
  registeredAt: Date;
  lastEventAt?: Date;
}

export interface WebhookProcessingResult {
  success: boolean;
  orderId?: string;
  externalOrderId?: string;
  status?: string;
  message?: string;
  error?: string;
}