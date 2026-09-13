/** @type {import('jest').Config} */
module.exports = {
  roots: ["<rootDir>"],
  // The .js files beside the TypeScript sources are generated artifacts.
  // Running both copies doubles tests and makes Jest resolve stale modules.
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
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
