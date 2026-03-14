/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Map the 'vscode' module to our hand-crafted mock
    '^vscode$': '<rootDir>/__mocks__/vscode.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  // Print individual test names
  verbose: true,
  // Collect coverage from Phase 1 source files
  collectCoverageFrom: [
    'src/renderer/**/*.ts',
    'src/exporter/HtmlExporter.ts',
    'src/preview/previewTemplate.ts',
    'src/config/Settings.ts',
  ],
  coverageDirectory: 'coverage',
};
