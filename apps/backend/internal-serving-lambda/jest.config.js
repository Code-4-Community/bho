module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['/node_modules/(?!@bho/)'],
  // Jest doesn't read the tsconfig.base.json paths
  moduleNameMapper: {
    '^@bho/db-client$': '<rootDir>/../../../libs/db-client/src/index.ts',
    '^@bho/file-store$': '<rootDir>/../../../libs/file-store/src/index.ts',
  },
};
