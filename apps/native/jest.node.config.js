/** @type {import('jest').Config} */
module.exports = {
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx|js|jsx)"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/__tests__/rn/"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@pickup/api/(.*)$": "<rootDir>/../../packages/api/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: false, tsconfig: { module: "commonjs", esModuleInterop: true } }],
  },
  collectCoverageFrom: ["**/*.{ts,tsx}", "!**/__tests__/**", "!**/node_modules/**"],
};
