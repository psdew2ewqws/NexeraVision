# Integration Domain

Production-ready integration domain for delivery provider webhooks, API authentication, and order management.

## Overview

The integration domain handles all external delivery provider integrations including webhooks, API keys, order management, and monitoring.

## Architecture

```
domains/integration/
├── webhooks/                    # Webhook management
├── api-keys/                    # API key authentication
├── integration-orders/          # Order management
├── monitoring/                  # Analytics and monitoring
├── integration.module.ts        # Root module
└── index.ts                     # Public API exports
```

## Key Features

- Multi-provider webhook support (Careem, Talabat, Deliveroo, Jahez, HungerStation)
- Exponential backoff retry logic with dead letter queue
- State machine-based order lifecycle management
- Comprehensive monitoring and analytics
- Secure API key authentication

## Usage

See individual subdomain READMEs for detailed usage examples.
