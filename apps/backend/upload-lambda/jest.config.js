module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  transformIgnorePatterns: ['/node_modules/(?!@bho/)'],
};
