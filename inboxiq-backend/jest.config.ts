import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.[jt]sx?$": ["ts-jest", { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!jose/)",
  ],
  setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/__tests__/**",
    "!src/server.ts",
  ],
};

export default config;
