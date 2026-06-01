module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  // Require a name segment before `.test`/`.spec` so source files that happen to
  // be named `test.ts` (e.g. the routes/test.ts router) are not collected as suites.
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.(spec|test).{ts,tsx}'],
  // Never collect from build output (gitignored `dist/` contains compiled .test.js).
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
