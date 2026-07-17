module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        strict: false,
        strictPropertyInitialization: false,
      },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'json', 'html'],
  coverageThreshold: {
    global: {
      lines: 60,
      functions: 50,
      branches: 40,
      statements: 60,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    // P1-B: moment 空mock，解决 winston-daily-rotate-file 间接依赖导致 jest 无法加载 logger.ts
    '^moment$': '<rootDir>/__mocks__/moment.js',
  },
};
