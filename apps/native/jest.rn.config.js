/** @type {import('jest').Config} */
module.exports = {
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/rn/**/*.test.(ts|tsx|js|jsx)"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@pickup/api/(.*)$": "<rootDir>/../../packages/api/src/$1",
    "^@pickup/env/native$": "<rootDir>/__tests__/rn/mocks/pickup-env-native.ts",
    "^react-native$": "<rootDir>/__tests__/rn/mocks/react-native.tsx",
    "^react-native/(.*)$": "<rootDir>/__tests__/rn/mocks/react-native.tsx",
    "^react-test-renderer$": "<rootDir>/../../node_modules/.pnpm/react-test-renderer@19.1.0_react@19.1.0/node_modules/react-test-renderer",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.rn.setup.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: false, diagnostics: false, tsconfig: { module: "commonjs", esModuleInterop: true, jsx: "react-jsx", noImplicitAny: false, skipLibCheck: true } }],
  },
};
