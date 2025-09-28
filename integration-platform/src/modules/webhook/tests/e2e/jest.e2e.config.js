module.exports = {
  displayName: 'Webhook E2E Tests',
  testEnvironment: 'node',
  rootDir: '../../../..',
  testMatch: [
    '<rootDir>/src/modules/webhook/tests/e2e/**/*.e2e-spec.ts'
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/modules/webhook/**/*.(t|j)s',
    '!src/modules/webhook/**/*.spec.ts',
    '!src/modules/webhook/**/*.interface.ts',
    '!src/modules/webhook/**/*.dto.ts',
    '!src/modules/webhook/tests/**/*',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/src/modules/webhook/tests/e2e/setup.e2e.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};