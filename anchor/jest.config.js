module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(rpc-websockets|uuid|@solana|@coral-xyz)/)',
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
}
