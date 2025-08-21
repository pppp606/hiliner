/** @type {import('jest').Config} */
export default {
  // Main configuration
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'jsdom',
  
  // Path configuration
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/utils/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/src/hooks/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/tests/**/*.{ts,tsx,js,jsx}'
  ],
  
  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  
  // Coverage thresholds (80% minimum)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'CommonJS',
        lib: ['ES2020', 'DOM'],
      }
    }]
  },
  
  // Module name mapping (for path aliases if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Handle node_modules - transform ESM dependencies
  transformIgnorePatterns: [
    'node_modules/(?!(ink|ink-testing-library|chalk|ansi-escapes|cli-cursor)/)'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Setup files for testing environment
  setupFilesAfterEnv: [],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};