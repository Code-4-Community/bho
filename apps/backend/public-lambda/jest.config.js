module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['/node_modules/(?!@bho/)'],
  // Jest doesn't read the tsconfig.base.json paths
  moduleNameMapper: {
    '^@bho/davis-client$': '<rootDir>/../../../libs/davis-client/src/index.ts',
  },
};
