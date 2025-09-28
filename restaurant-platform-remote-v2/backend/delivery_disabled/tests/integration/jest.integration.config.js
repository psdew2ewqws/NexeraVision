module.exports = {
  displayName: 'Delivery Integration Tests',
  testMatch: [
    '<rootDir>/src/modules/delivery/tests/integration/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/modules/delivery/tests/unit/',
    '<rootDir>/src/modules/delivery/tests/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/modules/delivery/**/*.ts',
    '!src/modules/delivery/**/*.spec.ts',
    '!src/modules/delivery/**/*.interface.ts',
    '!src/modules/delivery/**/*.dto.ts',
    '!src/modules/delivery/**/index.ts',
    '!src/modules/delivery/tests/**/*'
  ],
  coverageDirectory: '<rootDir>/coverage/delivery-integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/modules/delivery/tests/integration/setup.integration.ts'
  ],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 60000, // Longer timeout for integration tests
  maxWorkers: 4, // Limit parallel workers for integration tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  globals: {
    'ts-jest': {
      useESM: false,
      isolatedModules: true
    }
  },
  // Integration test specific configurations
  testSequencer: '<rootDir>/src/modules/delivery/tests/integration/sequencer.js',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicDir: '<rootDir>/coverage/delivery-integration/html-report',
        filename: 'integration-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Delivery System Integration Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage/delivery-integration',
        outputName: 'integration-results.xml',
        classNameTemplate: 'Integration.{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ]
};