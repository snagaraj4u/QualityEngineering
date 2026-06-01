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
  // Mirror the TypeScript path aliases from tsconfig.json so suites that
  // transitively import workspace packages (e.g. SkillRouterService -> @core)
  // resolve the same way under ts-jest as they do under tsc.
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@db/(.*)$': '<rootDir>/packages/database/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
