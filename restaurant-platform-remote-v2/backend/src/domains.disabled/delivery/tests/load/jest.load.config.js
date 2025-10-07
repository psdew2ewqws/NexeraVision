module.exports = {
  displayName: 'Delivery Load Tests',
  testMatch: [
    '<rootDir>/src/modules/delivery/tests/load/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/modules/delivery/tests/unit/',
    '<rootDir>/src/modules/delivery/tests/integration/',
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
  coverageDirectory: '<rootDir>/coverage/delivery-load',
  coverageReporters: ['text', 'lcov', 'json'],
  setupFilesAfterEnv: [
    '<rootDir>/src/modules/delivery/tests/load/setup.load.ts'
  ],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Extended timeouts for load tests
  testTimeout: 300000, // 5 minutes
  
  // Load test specific configurations
  maxWorkers: 1, // Run load tests sequentially to avoid resource conflicts
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Memory and performance settings
  workerIdleMemoryLimit: '1GB',
  
  globals: {
    'ts-jest': {
      useESM: false,
      isolatedModules: true,
      // Increase memory limit for TypeScript compilation
      maxNodeModuleJsDepth: 1
    }
  },
  
  // Custom reporters for load testing
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicDir: '<rootDir>/coverage/delivery-load/html-report',
        filename: 'load-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Delivery System Load Test Report',
        logoImgPath: undefined,
        customInfos: [
          {
            title: 'Load Test Configuration',
            value: 'Target: 50,000+ orders/day capacity'
          },
          {
            title: 'Test Environment',
            value: 'Mocked external APIs with realistic delays'
          },
          {
            title: 'Performance Targets',
            value: 'Response time <2s, 95% success rate, Memory usage <300MB'
          }
        ]
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage/delivery-load',
        outputName: 'load-test-results.xml',
        classNameTemplate: 'LoadTest.{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
        addFileAttribute: true
      }
    ],
    [
      './custom-load-reporter.js',
      {
        outputFile: '<rootDir>/coverage/delivery-load/performance-metrics.json'
      }
    ]
  ],
  
  // Test result processing
  testResultsProcessor: '<rootDir>/src/modules/delivery/tests/load/results-processor.js',
  
  // Notification settings for load tests
  notify: true,
  notifyMode: 'failure-change',
  
  // Snapshot serializer for consistent output
  snapshotSerializers: [
    '<rootDir>/src/modules/delivery/tests/load/snapshot-serializer.js'
  ]
};