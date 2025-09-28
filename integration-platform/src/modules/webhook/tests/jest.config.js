module.exports = {
  displayName: 'Webhook Tests',
  testMatch: [
    '<rootDir>/src/modules/webhook/tests/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '<rootDir>/src/modules/webhook/**/*.(t|j)s',
    '!<rootDir>/src/modules/webhook/tests/**/*',
    '!<rootDir>/src/modules/webhook/**/*.spec.ts',
    '!<rootDir>/src/modules/webhook/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/webhook',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/src/modules/webhook/tests/setup.ts',
  ],
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 60000, // 60 seconds for performance tests
  maxWorkers: 4, // Limit concurrent workers for performance tests
  verbose: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Test suites configuration
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/src/modules/webhook/tests/webhook.spec.ts',
        '<rootDir>/src/modules/webhook/tests/webhook-retry.spec.ts',
      ],
      testTimeout: 30000,
    },
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/src/modules/webhook/tests/webhook.spec.ts',
      ],
      testTimeout: 45000,
      setupFilesAfterEnv: [
        '<rootDir>/src/modules/webhook/tests/setup.ts',
        '<rootDir>/src/modules/webhook/tests/integration-setup.ts',
      ],
    },
    {
      displayName: 'Performance Tests',
      testMatch: [
        '<rootDir>/src/modules/webhook/tests/webhook-performance.spec.ts',
      ],
      testTimeout: 120000, // 2 minutes for performance tests
      maxWorkers: 1, // Run performance tests sequentially
    },
  ],
};