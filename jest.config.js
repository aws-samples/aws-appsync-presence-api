module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', 'integration/*.test.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
