import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
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
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*(*.)@(spec|test).[jt]s?(x)', // Matches unit tests: *.spec.ts, *.test.ts
    '<rootDir>/test/**/*.test.[jt]s?(x)',
    '<rootDir>/test/**/*.e2e.test.[jt]s?(x)',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@formflow/shared/env$': '<rootDir>/../../libs/shared/env/src/index.ts',
    '^@formflow/shared/entities$': '<rootDir>/../../libs/shared/entities/src/index.ts',
    '^@formflow/shared/data-source$': '<rootDir>/../../libs/shared/data-source/src/index.ts',
    '^@formflow/shared/utils$': '<rootDir>/../../libs/shared/utils/encryption/src/index.ts',
    '^@formflow/shared/utils/logger$': '<rootDir>/../../libs/shared/utils/logger/src/index.ts',
  },
};

export default config;
