# Webhook Testing Suite

A comprehensive testing framework for the webhook integration platform, featuring unit tests, integration tests, performance tests, and end-to-end workflow validation.

## 🎯 Overview

This test suite provides complete coverage for:

- **Webhook validation services** for all providers (Careem, Talabat, Deliveroo, Jahez)
- **Retry mechanisms** with exponential backoff and dead letter queues
- **Rate limiting** and security features
- **Performance testing** under high-volume scenarios
- **End-to-end webhook flows** and lifecycle management

## 📁 Test Structure

```
tests/
├── webhook.spec.ts              # Main test suite with unit & integration tests
├── webhook-retry.spec.ts        # Comprehensive retry service testing
├── webhook-performance.spec.ts  # Performance and load testing
├── test-utils.ts               # Testing utilities and helpers
├── mock-payloads.ts            # Mock webhook payloads for all providers
├── setup.ts                    # Global test setup
├── integration-setup.ts        # Integration test configuration
├── jest.config.js              # Jest configuration
├── run-tests.js                # Test runner script
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Environment Setup**:
   ```bash
   export DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
   export JWT_SECRET="your-test-jwt-secret"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

### Running Tests

#### Using the Test Runner (Recommended)

```bash
# Run unit tests with development configuration
node src/modules/webhook/tests/run-tests.js unit development

# Run integration tests for CI
node src/modules/webhook/tests/run-tests.js integration ci

# Run performance tests with debug output
node src/modules/webhook/tests/run-tests.js performance debug

# Run all tests
node src/modules/webhook/tests/run-tests.js all development
```

#### Using Jest Directly

```bash
# Run all webhook tests
npm test -- --testPathPattern="webhook.*spec.ts"

# Run with coverage
npm run test:cov -- --testPathPattern="webhook.*spec.ts"

# Run specific test file
npm test -- src/modules/webhook/tests/webhook.spec.ts

# Run in watch mode
npm run test:watch -- --testPathPattern="webhook.*spec.ts"
```

## 📋 Test Categories

### 1. Unit Tests (`webhook.spec.ts`)

**WebhookValidationService Tests:**
- ✅ Careem webhook signature validation
- ✅ Talabat API key validation with timestamp checking
- ✅ Deliveroo HMAC signature validation
- ✅ Jahez bearer token validation with duplicate request checking
- ✅ Rate limiting functionality
- ✅ IP address validation

**WebhookRetryService Tests:**
- ✅ Exponential backoff algorithm
- ✅ Dead letter queue management
- ✅ Priority queue handling
- ✅ Retry statistics tracking
- ✅ Queue filtering and management

**WebhookService Tests:**
- ✅ Webhook registration
- ✅ Log retrieval with pagination
- ✅ Statistics generation
- ✅ Configuration management
- ✅ Webhook deletion

### 2. Integration Tests (`webhook.spec.ts`)

**Endpoint Testing:**
- ✅ Valid webhook processing for all providers
- ✅ Invalid signature rejection
- ✅ Malformed JSON handling
- ✅ Request validation
- ✅ Rate limiting enforcement

**Security Testing:**
- ✅ Signature tampering detection
- ✅ Client ID validation
- ✅ Large payload handling

### 3. Performance Tests (`webhook-performance.spec.ts`)

**High Volume Load Tests:**
- ✅ 1000+ concurrent webhook requests
- ✅ Mixed provider webhook load
- ✅ Sustained traffic handling
- ✅ Retry queue performance

**Resource Usage Tests:**
- ✅ Memory leak detection
- ✅ Large payload efficiency
- ✅ Concurrent access handling

**Stress Tests:**
- ✅ Webhook burst handling
- ✅ Failure recovery testing

### 4. End-to-End Tests (`webhook.spec.ts`)

**Complete Order Lifecycle:**
- ✅ Careem order creation → update → cancellation
- ✅ Deliveroo order creation → pickup
- ✅ Menu synchronization across providers
- ✅ Connection testing for all providers

**Error Handling:**
- ✅ Webhook failure recovery
- ✅ Malformed payload handling
- ✅ System stability under mixed load

## 🎭 Mock Data

### Provider Coverage

The test suite includes comprehensive mock payloads for:

**Careem:**
- Order created, updated, cancelled events
- Customer and payment information
- Middle East specific data (AED currency, Arabic names)

**Talabat:**
- Order lifecycle events
- Menu updates
- Kuwait/GCC specific data (KWD currency)

**Deliveroo:**
- Order events with pickup workflow
- Connection test events
- UK specific data (GBP currency, UK addresses)

**Jahez:**
- Saudi Arabia specific workflows
- Bilingual (Arabic/English) menu items
- SAR currency and local address formats

### Mock Payload Features

- **Realistic Data**: Currency codes, phone numbers, addresses per region
- **Validation Compliance**: Meets DTO validation requirements
- **Batch Generation**: Efficient creation of multiple test payloads
- **Invalid Payloads**: Comprehensive error scenario testing

## 🔧 Test Utilities

### WebhookTestUtils Class

Provides comprehensive testing utilities:

```typescript
// Signature generation
WebhookTestUtils.generateHmacSignature(payload, secret);
WebhookTestUtils.generateHmacSignatureBase64(payload, secret);

// Mock creation
WebhookTestUtils.createMockHeaders(provider, clientId, signature);
WebhookTestUtils.createMockRequest(body, headers, rawBody);
WebhookTestUtils.createMockResponse();

// Performance measurement
const timer = WebhookTestUtils.createPerformanceTimer();
// ... operations ...
const executionTime = timer.stop();

// Environment validation
WebhookTestUtils.validateTestEnvironment();

// Cleanup utilities
await WebhookTestUtils.cleanupTestData(prismaService, clientId);
```

## 📊 Coverage Reports

Test coverage reports are generated in multiple formats:

- **Console**: Real-time coverage summary
- **HTML**: Detailed visual reports in `coverage/webhook/`
- **LCOV**: For CI/CD integration

### Coverage Targets

- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

## ⚡ Performance Benchmarks

### Expected Performance Metrics

**Webhook Processing:**
- Single webhook: < 50ms average
- Batch of 100: < 5 seconds
- 1000 concurrent: < 30 seconds
- Success rate: > 90%

**Retry Queue:**
- Queue 500 items: < 10 seconds
- Process batch retry: < 30 seconds
- Memory usage: < 100MB increase

**System Stability:**
- Memory leak tolerance: < 50MB over 1000 operations
- Sustained load: 20 RPS for 30 seconds
- Recovery time: < 5 seconds after failure

## 🛠 Configuration

### Test Runner Options

```bash
# Test Suites
unit         # Fast unit tests (30s timeout)
integration  # API integration tests (45s timeout)
performance  # Load tests (120s timeout)
all          # Complete suite

# Configurations
fast         # No coverage, auto workers
ci           # CI optimized, coverage enabled
development  # Full output, coverage enabled
debug        # Verbose, single worker

# Options
--watch      # Watch mode
--bail       # Stop on first failure
--silent     # Suppress output
--list       # List test files
```

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://localhost:5432/test_db"
JWT_SECRET="test-secret-key"

# Optional
WEBHOOK_BASE_URL="http://localhost:3001"
DEBUG_TESTS="true"               # Enable debug logging
NODE_OPTIONS="--max-old-space-size=4096"  # For performance tests
```

### Jest Configuration

Custom configuration in `jest.config.js`:

- **Projects**: Separate configs for unit/integration/performance
- **Coverage**: Thresholds and reporting
- **Timeouts**: Appropriate for each test type
- **Workers**: Optimized for test type

## 🔍 Debugging

### Debug Mode

```bash
# Enable debug output
DEBUG_TESTS=true node run-tests.js unit debug

# Run specific test with debug
npm test -- --testNamePattern="should validate Careem webhook" --verbose
```

### Common Issues

**Database Connection:**
```bash
# Ensure test database exists
createdb webhook_test
export DATABASE_URL="postgresql://localhost:5432/webhook_test"
```

**Memory Issues in Performance Tests:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

**Timeout Issues:**
```bash
# Increase Jest timeout
jest --testTimeout=120000
```

## 📈 Continuous Integration

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Webhook Tests
  run: |
    node src/modules/webhook/tests/run-tests.js all ci

- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/webhook/lcov.info
```

### Pre-commit Hooks

```bash
# Run fast tests before commit
node src/modules/webhook/tests/run-tests.js unit fast --bail
```

## 📝 Writing New Tests

### Test Structure Template

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup for each test
  });

  describe('Specific Functionality', () => {
    it('should handle expected behavior', async () => {
      // Arrange
      const clientId = WebhookTestUtils.generateClientId();
      const payload = MockWebhookPayloads.careem.orderCreated(clientId);

      // Act
      const result = await serviceMethod(payload);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle error cases', async () => {
      // Test error scenarios
    });
  });
});
```

### Mock Payload Creation

```typescript
// Add new provider payloads
static newProvider = {
  orderCreated: (clientId: string) => ({
    eventId: WebhookTestUtils.generateEventId(),
    eventType: EventType.ORDER_CREATED,
    provider: EventProvider.NEW_PROVIDER,
    clientId,
    timestamp: new Date().toISOString(),
    data: {
      // Provider-specific data structure
    }
  })
};
```

## 🤝 Contributing

1. **Add Tests**: Ensure new webhook features include comprehensive tests
2. **Update Mocks**: Add realistic mock data for new providers
3. **Performance**: Include performance tests for new high-volume features
4. **Documentation**: Update this README for new test patterns

## 📞 Support

For issues with the test suite:

1. Check the **Common Issues** section above
2. Run tests with `debug` configuration for detailed output
3. Review test logs in the console
4. Ensure environment variables are properly set

---

*This comprehensive test suite ensures the webhook integration platform maintains high quality, performance, and reliability across all supported delivery providers.*