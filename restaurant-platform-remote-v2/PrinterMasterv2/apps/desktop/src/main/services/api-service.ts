import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import log from 'electron-log';
import { APIResponse, License, Printer, PrinterTestResult, SystemMetrics } from '../../types';

export class APIService extends EventEmitter {
  private client: AxiosInstance;
  private baseURL: string;
  private authToken?: string;
  private initialized = false;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor() {
    super();
    this.baseURL = 'http://localhost:3001';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RestaurantPrint-Pro',
      },
    });
    
    this.setupInterceptors();
  }

  async initialize(): Promise<void> {
    try {
      log.info('Initializing APIService...');
      
      // Test connection
      await this.testConnection();
      
      this.initialized = true;
      log.info('APIService initialized successfully');
      this.emit('connected');
    } catch (error) {
      log.error('Failed to initialize APIService:', error);
      this.emit('disconnected', error.message);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down APIService...');
    this.initialized = false;
    this.authToken = undefined;
    this.removeAllListeners();
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
    log.info('API base URL updated:', url);
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    log.info('Auth token updated');
  }

  clearAuthToken(): void {
    this.authToken = undefined;
    delete this.client.defaults.headers.common['Authorization'];
    log.info('Auth token cleared');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/health');
      return response.status === 200;
    } catch (error) {
      log.error('API connection test failed:', error);
      return false;
    }
  }

  // License Management
  async validateLicense(licenseKey: string, deviceInfo: any): Promise<APIResponse<License>> {
    return this.request('POST', '/api/v1/printer-licenses/validate', {
      licenseKey,
      deviceInfo,
    });
  }

  async getLicenseInfo(licenseKey: string): Promise<APIResponse<License>> {
    return this.request('GET', `/api/v1/printer-licenses/${licenseKey}`);
  }

  // Printer Management
  async registerPrinter(printer: Partial<Printer>): Promise<APIResponse<Printer>> {
    return this.request('POST', '/api/v1/printers/register', printer);
  }

  async autoRegisterPrinters(registrationData: {
    branchId: string;
    deviceId: string;
    printers: Array<{
      name: string;
      driver: string;
      connection: string;
      default: boolean;
      capabilities?: any;
      status?: string;
    }>;
    deviceInfo?: {
      hostname?: string;
      platform?: string;
      version?: string;
    };
  }): Promise<APIResponse<any>> {
    return this.request('POST', '/api/v1/printing/printers/auto-register', registrationData);
  }

  async updatePrinterStatus(printerId: string, status: string): Promise<APIResponse<Printer>> {
    return this.request('PUT', `/api/v1/printers/${printerId}/status`, { status });
  }

  async getPrinters(branchId: string): Promise<APIResponse<Printer[]>> {
    return this.request('GET', `/api/v1/printers/branch/${branchId}`);
  }

  async deletePrinter(printerId: string): Promise<APIResponse<void>> {
    return this.request('DELETE', `/api/v1/printers/${printerId}`);
  }

  // Printer Testing
  async testPrinter(printerId: string, testType: string = 'status'): Promise<APIResponse<PrinterTestResult>> {
    return this.request('POST', `/api/v1/printers/${printerId}/test`, { testType });
  }

  async getTestHistory(printerId: string, limit: number = 50): Promise<APIResponse<PrinterTestResult[]>> {
    return this.request('GET', `/api/v1/printers/${printerId}/test-history?limit=${limit}`);
  }

  // Device Management
  async registerDevice(deviceInfo: any): Promise<APIResponse<any>> {
    return this.request('POST', '/api/v1/devices/register', deviceInfo);
  }

  async sendHeartbeat(deviceId: string, metrics: SystemMetrics): Promise<APIResponse<void>> {
    return this.request('PUT', `/api/v1/devices/${deviceId}/heartbeat`, metrics);
  }

  // Monitoring
  async sendStatusBatch(statusUpdates: any[]): Promise<APIResponse<void>> {
    return this.request('POST', '/api/v1/monitoring/status-batch', { updates: statusUpdates });
  }

  async sendTelemetry(telemetryData: any): Promise<APIResponse<void>> {
    return this.request('POST', '/api/v1/telemetry', telemetryData);
  }

  // Generic request method with retry logic
  private async request<T = any>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const response: AxiosResponse<APIResponse<T>> = await this.client.request({
          method: method.toLowerCase() as any,
          url,
          data,
          ...config,
        });
        
        return response.data;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryCount && this.shouldRetry(error)) {
          log.warn(`API request failed (attempt ${attempt}/${this.retryCount}):`, error.message);
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        break;
      }
    }
    
    log.error(`API request failed after ${this.retryCount} attempts:`, lastError);
    this.emit('error', lastError);
    
    throw lastError;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        log.debug('API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        log.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        log.debug('API Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error) => {
        if (error.response) {
          log.error('API Response Error:', {
            status: error.response.status,
            url: error.config?.url,
            data: error.response.data,
          });
        } else if (error.request) {
          log.error('API Network Error:', error.message);
        } else {
          log.error('API Error:', error.message);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (!error.response) return true; // Network error
    if (error.code === 'ECONNABORTED') return true; // Timeout
    if (error.response.status >= 500) return true; // Server error
    if (error.response.status === 429) return true; // Rate limited
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check
  isConnected(): boolean {
    return this.initialized;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  hasAuthToken(): boolean {
    return !!this.authToken;
  }
}