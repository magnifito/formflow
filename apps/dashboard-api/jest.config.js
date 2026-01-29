/* eslint-disable */
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  displayName: 'dashboard-api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/dashboard-api',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/scripts/**/*',
    '!src/migrations/**/*',
    '!src/data-source.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*(*.)@(spec|test).[jt]s?(x)', // Matches unit tests: *.spec.ts, *.test.ts
    '<rootDir>/test/**/*.test.[jt]s?(x)',
    '<rootDir>/test/**/*.e2e.test.[jt]s?(x)',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@formflow/shared/env$': '<rootDir>/../../libs/shared/env/src/index.ts',
    '^@formflow/shared/data-source$': '<rootDir>/../../libs/shared/data-source/src/index.ts',
    '^@formflow/shared/logger$': '<rootDir>/../../libs/shared/logger/src/index.ts',
    '^pg-boss$': '<rootDir>/test/mocks/pg-boss.mock.ts',
    '^uuid$': '<rootDir>/test/mocks/uuid.mock.ts',
  },
};
