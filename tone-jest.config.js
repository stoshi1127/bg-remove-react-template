const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Exclude Playwright tests from Jest
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
  ],
  // Performance optimizations to prevent freezing
  maxWorkers: 2, // Limit concurrent workers to prevent CPU overload
  workerIdleMemoryLimit: '512MB', // Limit memory usage per worker
  testTimeout: 10000, // 10 second timeout for individual tests
  detectOpenHandles: true, // Detect handles that prevent Jest from exiting
  forceExit: true, // Force exit after tests complete
  logHeapUsage: true, // Log heap usage information
  // Run tests serially for integration tests to prevent resource conflicts
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jest-environment-jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}'],
      testPathIgnorePatterns: [
        '<rootDir>/src/__tests__/integration/',
      ],
    },
    {
      displayName: 'integration',
      testEnvironment: 'jest-environment-jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.{js,jsx,ts,tsx}'],
      maxWorkers: 1, // Run integration tests serially
      testTimeout: 30000, // Longer timeout for integration tests
    },
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)