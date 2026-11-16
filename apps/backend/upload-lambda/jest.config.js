module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@bho/(.*)$': '<rootDir>/../../../libs/$1/src/index.ts',
  },
  transformIgnorePatterns: ['/node_modules/(?!@bho/)'],
};
