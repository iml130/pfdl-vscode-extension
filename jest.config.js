/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^.+\\.(css|less)$': '<rootDir>/jest-style-mock.js' },
  collectCoverageFrom: [
    'client/src/code_visualization/*.ts',
    '!**/node_modules/**',
    '!client/src/code_visualization/main.ts'
  ],
  coverageReporters: ['html', 'text', 'text-summary', 'cobertura'],
  testMatch: ['**/*.test.ts']
};
