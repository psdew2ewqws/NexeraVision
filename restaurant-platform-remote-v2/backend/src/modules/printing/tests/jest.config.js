/**
 * Jest Configuration for Printing Module Tests
 * Optimized for PrinterMaster WebSocket System testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: '../../../..',

  // Test match patterns
  testMatch: [
    '<rootDir>/src/modules/printing/tests/**/*.spec.ts',
    '<rootDir>/src/modules/printing/tests/**/*.test.ts'
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@mocks/(.*)$': '<rootDir>/src/modules/printing/tests/mocks/$1'
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/modules/printing/gateways/**/*.ts',
    'src/modules/printing/services/**/*.ts',
    'src/modules/printing/controllers/**/*.ts',
    '!src/modules/printing/**/*.spec.ts',
    '!src/modules/printing/**/*.test.ts',
    '!src/modules/printing/tests/**/*'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/modules/printing/gateways/printing-websocket.gateway.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/modules/printing/tests/setup.ts'
  ],

  // Test timeout
  testTimeout: 15000,

  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'ts'
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true
};
