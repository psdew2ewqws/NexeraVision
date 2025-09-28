module.exports = {
  displayName: 'Delivery Module Tests',
  testMatch: [
    '<rootDir>/src/modules/delivery/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/modules/delivery/**/*.ts',
    '!src/modules/delivery/**/*.spec.ts',
    '!src/modules/delivery/**/*.interface.ts',
    '!src/modules/delivery/**/*.dto.ts',
    '!src/modules/delivery/**/index.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/delivery',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/modules/delivery/factory/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/modules/delivery/engines/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/modules/delivery/providers/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/modules/delivery/tests/setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 30000
};