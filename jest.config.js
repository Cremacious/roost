/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.ts",
    "<rootDir>/src/__tests__/**/*.test.tsx",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/playwright-report/",
    "<rootDir>/test-results/",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
};

module.exports = config;
