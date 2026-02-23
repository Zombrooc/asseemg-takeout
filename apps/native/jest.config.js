/** @type {import('jest').Config} */
module.exports = {
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx|js|jsx)"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: false, tsconfig: { module: "commonjs", esModuleInterop: true } }],
  },
  collectCoverageFrom: ["**/*.{ts,tsx}", "!**/__tests__/**", "!**/node_modules/**"],
};
