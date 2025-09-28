import {
  ConnectionConfig,
  MenuSyncResult,
  OrderSyncResult,
  InventoryItem,
  PosOrder,
} from '../types/pos-adapter.types';

export interface IPosAdapter {
  /**
   * Unique identifier for the POS provider
   */
  readonly providerId: string;

  /**
   * Human-readable name of the POS provider
   */
  readonly providerName: string;

  /**
   * Test connection to POS system
   */
  testConnection(config: ConnectionConfig): Promise<boolean>;

  /**
   * Synchronize menu items from POS system
   */
  syncMenu(config: ConnectionConfig): Promise<MenuSyncResult>;

  /**
   * Synchronize orders from POS system
   */
  syncOrders(config: ConnectionConfig, since?: Date): Promise<OrderSyncResult>;

  /**
   * Update inventory levels in POS system
   */
  updateInventory(config: ConnectionConfig, items: InventoryItem[]): Promise<boolean>;

  /**
   * Create a new order in POS system
   */
  createOrder(config: ConnectionConfig, order: PosOrder): Promise<string | null>;

  /**
   * Update order status in POS system
   */
  updateOrderStatus(config: ConnectionConfig, orderId: string, status: string): Promise<boolean>;
}

export interface IPosWebhookHandler {
  /**
   * Handle incoming webhook from POS system
   */
  handleWebhook(payload: any, headers: Record<string, string>): Promise<{
    success: boolean;
    type: 'order' | 'menu' | 'inventory';
    data?: any;
    error?: string;
  }>;

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean;
}

export interface IPosAuthHandler {
  /**
   * Handle OAuth2 authorization flow
   */
  handleOAuthCallback(code: string, state: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;

  /**
   * Refresh access token
   */
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthorizationUrl(redirectUri: string, state: string): string;
}