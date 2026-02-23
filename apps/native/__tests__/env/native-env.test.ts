const ENV_KEY = "EXPO_PUBLIC_SERVER_URL";
const DEFAULT_SERVER_URL = "http://127.0.0.1:5555";

jest.mock("@pickup/env/native", () => {
  const url = process.env[ENV_KEY];
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Invalid environment variables");
  }
  return {
    env: { EXPO_PUBLIC_SERVER_URL: url ?? DEFAULT_SERVER_URL },
  };
});

function loadNativeEnv(): { env: { EXPO_PUBLIC_SERVER_URL: string } } {
  return require("@pickup/env/native");
}

describe("@pickup/env/native", () => {
  const originalServerUrl = process.env[ENV_KEY];

  afterEach(() => {
    if (originalServerUrl === undefined) {
      delete process.env[ENV_KEY];
      return;
    }
    process.env[ENV_KEY] = originalServerUrl;
  });

  it("uses default URL when EXPO_PUBLIC_SERVER_URL is missing", () => {
    delete process.env[ENV_KEY];
    jest.resetModules();
    const { env } = loadNativeEnv();
    expect(env.EXPO_PUBLIC_SERVER_URL).toBe(DEFAULT_SERVER_URL);
  });

  it("uses override URL when EXPO_PUBLIC_SERVER_URL is set", () => {
    process.env[ENV_KEY] = "http://192.168.0.5:5555";
    jest.resetModules();
    const { env } = loadNativeEnv();
    expect(env.EXPO_PUBLIC_SERVER_URL).toBe("http://192.168.0.5:5555");
  });

  it("throws on invalid EXPO_PUBLIC_SERVER_URL", () => {
    process.env[ENV_KEY] = "invalid-url";
    jest.resetModules();
    expect(() => loadNativeEnv()).toThrow("Invalid environment variables");
  });
});
