// Core types for the integration platform

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'operator';
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  settings: CompanySettings;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  timezone: string;
  currency: string;
  language: string;
  business_hours: BusinessHours;
}

export interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    is_closed: boolean;
  };
}

// Integration types
export interface Integration {
  id: string;
  company_id: string;
  provider: DeliveryProvider;
  status: IntegrationStatus;
  config: IntegrationConfig;
  health: IntegrationHealth;
  created_at: string;
  updated_at: string;
}

export type DeliveryProvider = 'careem' | 'talabat' | 'deliveroo' | 'uber_eats' | 'jahez' | 'hungerstation' | 'noon_food' | 'mrsool' | 'zomato';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'disabled';

export interface IntegrationConfig {
  api_key?: string;
  secret_key?: string;
  webhook_url?: string;
  webhook_secret?: string;
  store_id?: string;
  brand_id?: string;
  auto_accept_orders: boolean;
  sync_menu: boolean;
  sync_inventory: boolean;
}

export interface IntegrationHealth {
  last_ping: string;
  response_time: number;
  error_count: number;
  success_rate: number;
  status: 'healthy' | 'warning' | 'critical';
}

// Order types
export interface Order {
  id: string;
  external_id: string;
  company_id: string;
  provider: DeliveryProvider;
  status: OrderStatus;
  customer: Customer;
  items: OrderItem[];
  totals: OrderTotals;
  delivery_info: DeliveryInfo;
  timeline: OrderTimeline[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  address: Address;
}

export interface Address {
  street: string;
  city: string;
  area: string;
  building?: string;
  floor?: string;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: OrderModifier[];
  special_instructions?: string;
}

export interface OrderModifier {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  delivery_fee: number;
  service_fee: number;
  discount: number;
  total: number;
}

export interface DeliveryInfo {
  type: 'delivery' | 'pickup';
  scheduled_time?: string;
  delivery_time?: string;
  driver_name?: string;
  driver_phone?: string;
  tracking_url?: string;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  user?: string;
}

// Menu types
export interface MenuItem {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  modifiers: MenuModifier[];
  provider_mappings: ProviderMapping[];
  created_at: string;
  updated_at: string;
}

export interface MenuModifier {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface ProviderMapping {
  provider: DeliveryProvider;
  external_id: string;
  name?: string;
  price?: number;
  is_synced: boolean;
  last_sync: string;
}

// Webhook types
export interface WebhookLog {
  id: string;
  company_id: string;
  provider: DeliveryProvider;
  event_type: string;
  payload: Record<string, any>;
  response_status: number;
  response_body?: string;
  error?: string;
  processed_at?: string;
  created_at: string;
}

// Analytics types
export interface DashboardStats {
  total_orders: number;
  active_integrations: number;
  pending_orders: number;
  revenue_today: number;
  order_trends: OrderTrend[];
  provider_performance: ProviderPerformance[];
  recent_activity: Activity[];
}

export interface OrderTrend {
  date: string;
  orders: number;
  revenue: number;
}

export interface ProviderPerformance {
  provider: DeliveryProvider;
  orders: number;
  revenue: number;
  avg_response_time: number;
  error_rate: number;
}

export interface Activity {
  id: string;
  type: 'order' | 'integration' | 'webhook' | 'menu';
  message: string;
  timestamp: string;
  user?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface IntegrationForm {
  provider: DeliveryProvider;
  api_key: string;
  secret_key?: string;
  store_id?: string;
  brand_id?: string;
  auto_accept_orders: boolean;
  sync_menu: boolean;
  sync_inventory: boolean;
}

export interface MenuSyncForm {
  provider: DeliveryProvider;
  items: string[];
  sync_prices: boolean;
  sync_availability: boolean;
}

// Utility types
export interface SelectOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  providers?: DeliveryProvider[];
  status?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Enhanced provider management types
export interface ProviderConfig {
  id: string;
  provider: DeliveryProvider;
  display_name: string;
  logo_url: string;
  color: string;
  country: string;
  supported_features: string[];
  documentation_url?: string;
}

export interface ProviderMetrics {
  provider: DeliveryProvider;
  total_orders: number;
  successful_orders: number;
  failed_orders: number;
  avg_response_time: number;
  uptime: number;
  last_24h_orders: number;
  revenue_today: number;
  error_rate: number;
}

export interface IntegrationTest {
  provider: DeliveryProvider;
  test_type: 'connection' | 'menu_sync' | 'order_create' | 'webhook';
  status: 'pending' | 'success' | 'failed';
  message?: string;
  response_time?: number;
  timestamp: string;
}

// Analytics types
export interface ProviderAnalytics {
  provider: DeliveryProvider;
  orders_by_hour: { hour: number; orders: number }[];
  revenue_by_day: { date: string; revenue: number }[];
  success_rate: number;
  avg_delivery_time: number;
  popular_items: { name: string; orders: number }[];
}

export interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical';
  active_providers: number;
  total_providers: number;
  uptime: number;
  last_incident?: string;
  server_load: number;
  memory_usage: number;
}

// Export functionality types
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  date_range: {
    start: string;
    end: string;
  };
  providers?: DeliveryProvider[];
  columns: string[];
  filters?: FilterOptions;
}

// WebSocket event types
export interface WSMessage {
  type: 'order_update' | 'provider_status' | 'system_alert' | 'metrics_update';
  data: any;
  timestamp: string;
}

export interface ProviderStatusUpdate {
  provider: DeliveryProvider;
  status: IntegrationStatus;
  health: IntegrationHealth;
  last_order?: string;
}

// Profile page types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'operator';
  company_id?: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  language: string;
  two_factor_enabled: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_delivery?: string;
  delivery_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface NotificationPreferences {
  email_notifications: {
    order_updates: boolean;
    system_alerts: boolean;
    integration_status: boolean;
    daily_summary: boolean;
    security_alerts: boolean;
  };
  push_notifications: {
    order_updates: boolean;
    system_alerts: boolean;
    integration_status: boolean;
  };
  notification_frequency: 'immediate' | 'hourly' | 'daily';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  backup_codes?: string[];
  session_timeout: number;
  login_notifications: boolean;
  password_last_changed: string;
}

export interface ProfileUpdateForm {
  name: string;
  email: string;
  phone?: string;
  timezone: string;
  language: string;
}

export interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ApiKeyForm {
  name: string;
  permissions: string[];
  expires_at?: string;
}

export interface WebhookForm {
  name: string;
  url: string;
  events: string[];
  secret?: string;
}