# NEXARA Webhook System E2E Tests

This directory contains comprehensive end-to-end tests for the NEXARA webhook integration system. These tests validate all components working together to ensure system reliability and security.

## 📋 Test Coverage

### 1. Webhook Registration Tests (`webhook-registration.e2e-spec.ts`)
- ✅ Webhook endpoint registration and validation
- ✅ API key authentication
- ✅ Input validation and error handling
- ✅ Duplicate registration prevention
- ✅ Configuration management
- ✅ Health checks

### 2. Security Validation Tests (`webhook-security.e2e-spec.ts`)
- ✅ **Careem HMAC SHA256** signature validation
- ✅ **Deliveroo HMAC SHA256** signature validation (base64)
- ✅ **Talabat API key** validation with timestamp checks
- ✅ **Jahez Bearer token** validation with duplicate prevention
- ✅ Cross-provider security isolation
- ✅ Rate limiting and IP restrictions
- ✅ Malformed payload handling

### 3. Event Processing Tests (`webhook-processing.e2e-spec.ts`)
- ✅ Order event processing (created, updated, cancelled, delivered)
- ✅ Menu event processing (availability changes, bulk updates)
- ✅ Event normalization and transformation
- ✅ Real-time WebSocket event emission
- ✅ Performance metrics collection
- ✅ Error handling and edge cases
- ✅ Concurrent event processing

### 4. Retry Mechanism Tests (`webhook-retry.e2e-spec.ts`)
- ✅ Automatic retry with exponential backoff
- ✅ HTTP error code handling (4xx vs 5xx)
- ✅ Maximum retry limit enforcement
- ✅ Manual retry functionality
- ✅ Retry queue management and prioritization
- ✅ Circuit breaker patterns
- ✅ Retry metrics and analytics

## 🚀 Running the Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure test database is available
npm run prisma:migrate:test

# Start the application (if testing against running instance)
npm run start:dev
```

### Run All E2E Tests
```bash
# Using the comprehensive test runner (recommended)
./src/modules/webhook/tests/e2e/run-e2e-tests.js

# Using Jest directly
npm run test:e2e:webhook

# With coverage
npm run test:e2e:webhook -- --coverage
```

### Run Individual Test Suites
```bash
# Registration tests only
npx jest webhook-registration.e2e-spec.ts

# Security tests only
npx jest webhook-security.e2e-spec.ts

# Processing tests only
npx jest webhook-processing.e2e-spec.ts

# Retry tests only
npx jest webhook-retry.e2e-spec.ts
```

### Run with Specific Options
```bash
# Verbose output
./run-e2e-tests.js --verbose

# Generate coverage report
./run-e2e-tests.js --coverage

# Skip cleanup
./run-e2e-tests.js --no-cleanup
```

## 📊 Test Reports

The test runner generates comprehensive reports:

### Generated Files
- `e2e-test-report.json` - Machine-readable test results
- `e2e-test-report.html` - Human-readable HTML report
- `coverage/e2e/` - Code coverage reports

### Report Contents
- **Test Results**: Pass/fail statistics and details
- **Code Coverage**: Statement, branch, and function coverage
- **Performance Metrics**: Test execution times and system performance
- **Security Validation**: Authentication and authorization test results
- **Issue Analysis**: Identified problems and recommendations
- **System Health**: Overall webhook system status

## 🔧 Test Configuration

### Environment Variables
```bash
# Test database
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/webhook_test

# Mock external service credentials
CAREEM_WEBHOOK_SECRET=careem_test_secret_123
TALABAT_API_KEY=talabat_test_api_key_456
DELIVEROO_WEBHOOK_SECRET=deliveroo_test_secret_789
JAHEZ_BEARER_TOKEN=jahez_test_bearer_token_abc
```

### Jest Configuration
See `jest.e2e.config.js` for:
- Test patterns and file matching
- Coverage thresholds and reporting
- Timeout configurations
- Module mapping

### Test Setup
See `setup.e2e.ts` for:
- Global test environment setup
- Mock service configuration
- Test database initialization
- Utility functions and helpers

## 🎯 Test Scenarios

### Authentication Scenarios
```typescript
// Careem HMAC validation
const payload = { event_type: 'order_created', ... };
const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

// Talabat API key validation
headers['x-talabat-api-key'] = 'valid_api_key';

// Deliveroo HMAC validation (base64)
const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

// Jahez Bearer token validation
headers['authorization'] = 'Bearer valid_token';
```

### Event Processing Scenarios
```typescript
// Order lifecycle events
- order.created → Initial order placement
- order.updated → Status changes during processing
- order.cancelled → Cancellation handling
- order.delivered → Completion confirmation

// Menu management events
- menu.updated → Menu changes
- item.availability_changed → Stock updates
```

### Retry Scenarios
```typescript
// HTTP status code handling
- 4xx errors → No retry (client errors)
- 5xx errors → Automatic retry (server errors)
- 429 errors → Retry with backoff (rate limiting)

// Retry configuration
- maxRetries: 3-10 attempts
- retryDelay: 100-10000ms
- backoffMultiplier: 1.5-3x
```

## 🛡️ Security Testing

### HMAC Signature Validation
- **Careem**: SHA256 HMAC with hex encoding
- **Deliveroo**: SHA256 HMAC with base64 encoding
- **Payload Integrity**: Tampering detection
- **Secret Management**: Secure credential handling

### API Key Validation
- **Talabat**: Header-based API key authentication
- **Timestamp Validation**: Replay attack prevention
- **Key Rotation**: Support for credential updates

### Bearer Token Validation
- **Jahez**: OAuth-style bearer token authentication
- **Duplicate Prevention**: Request ID tracking
- **Token Expiration**: Time-based validation

## ⚡ Performance Testing

### Metrics Collected
- **Processing Time**: Individual event processing duration
- **Throughput**: Events processed per second
- **Memory Usage**: System resource consumption
- **Database Performance**: Query execution times
- **Network Latency**: External service communication

### Performance Thresholds
- Single event processing: < 200ms
- Concurrent events (10): < 2 seconds
- Retry processing: < 5 seconds
- Memory usage: < 512MB per test suite

## 🔍 Debugging and Troubleshooting

### Common Issues
1. **Database Connection**: Ensure test database is running
2. **Port Conflicts**: Check that ports 3000/3001 are available
3. **Network Issues**: Verify mock service endpoints
4. **Permission Errors**: Ensure test files are executable

### Debug Mode
```bash
# Enable debug logging
DEBUG=webhook:* ./run-e2e-tests.js

# Run single test with detailed output
npx jest webhook-security.e2e-spec.ts --verbose --detectOpenHandles
```

### Log Analysis
```bash
# View test logs
tail -f logs/e2e-tests.log

# View application logs during testing
tail -f logs/application.log
```

## 📈 Continuous Integration

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: Run Webhook E2E Tests
  run: |
    npm run test:e2e:webhook
    npm run test:coverage:upload
```

### Quality Gates
- **Minimum Coverage**: 80% statement coverage
- **Test Pass Rate**: 100% for critical tests
- **Performance**: No degradation from baseline
- **Security**: All authentication tests must pass

## 🤝 Contributing

### Adding New Tests
1. Follow existing test patterns and naming conventions
2. Include both positive and negative test cases
3. Add performance and security validations
4. Update this README with new test coverage

### Test Categories
- **Critical**: Must pass for production deployment
- **Security**: Authentication and authorization tests
- **Performance**: Speed and resource usage tests
- **Integration**: Cross-component interaction tests

## 📚 Additional Resources

- [Webhook API Documentation](../../README.md)
- [Security Best Practices](../../../docs/security.md)
- [Performance Guidelines](../../../docs/performance.md)
- [Troubleshooting Guide](../../../docs/troubleshooting.md)

---

**Last Updated**: September 27, 2024
**Test Coverage**: 95%+ statement coverage
**Supported Providers**: Careem, Talabat, Deliveroo, Jahez
**Test Types**: Registration, Security, Processing, Retry, Performance