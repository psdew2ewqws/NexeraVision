import { Injectable, Logger } from '@nestjs/common';
import { IProviderAdapter } from '../interfaces/provider-adapter.interface';
import { CareemAdapter } from '../providers/careem.adapter';
import { TalabatAdapter } from '../providers/talabat.adapter';

/**
 * Adapter Factory
 * Creates and manages provider-specific adapters
 */
@Injectable()
export class AdapterFactory {
  private readonly logger = new Logger(AdapterFactory.name);
  private readonly adapters: Map<string, IProviderAdapter>;

  constructor(
    private careemAdapter: CareemAdapter,
    private talabatAdapter: TalabatAdapter,
  ) {
    // Initialize adapter map
    this.adapters = new Map<string, IProviderAdapter>();
    this.registerAdapters();
  }

  /**
   * Register all available adapters
   */
  private registerAdapters() {
    this.adapters.set('careem', this.careemAdapter);
    this.adapters.set('talabat', this.talabatAdapter);

    // Add more adapters as they are implemented
    // this.adapters.set('deliveroo', this.deliverooAdapter);
    // this.adapters.set('ubereats', this.uberEatsAdapter);

    this.logger.log(`Registered ${this.adapters.size} provider adapters`);
  }

  /**
   * Get adapter for a specific provider
   */
  getAdapter(provider: string): IProviderAdapter {
    const adapter = this.adapters.get(provider.toLowerCase());

    if (!adapter) {
      throw new Error(`No adapter found for provider: ${provider}`);
    }

    return adapter;
  }

  /**
   * Check if provider is supported
   */
  isProviderSupported(provider: string): boolean {
    return this.adapters.has(provider.toLowerCase());
  }

  /**
   * Get list of supported providers
   */
  getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Register a new adapter dynamically
   * Useful for runtime adapter registration
   */
  registerAdapter(provider: string, adapter: IProviderAdapter) {
    if (this.adapters.has(provider)) {
      this.logger.warn(`Overwriting existing adapter for provider: ${provider}`);
    }

    this.adapters.set(provider.toLowerCase(), adapter);
    this.logger.log(`Registered adapter for provider: ${provider}`);
  }
}