const ENV_KEY = "EXPO_PUBLIC_SERVER_URL";
const DEFAULT_SERVER_URL = "http://127.0.0.1:5555";

function loadNativeEnv() {
  let loaded: { env: { EXPO_PUBLIC_SERVER_URL: string } };
  jest.isolateModules(() => {
    loaded = require("@pickup/env/native");
  });
  return loaded!;
}

describe("@pickup/env/native", () => {
  const originalServerUrl = process.env.EXPO_PUBLIC_SERVER_URL;

  afterEach(() => {
    jest.resetModules();
    if (originalServerUrl === undefined) {
      delete process.env[ENV_KEY];
      return;
    }
    process.env[ENV_KEY] = originalServerUrl;
  });

  it("uses default URL when EXPO_PUBLIC_SERVER_URL is missing", () => {
    delete process.env[ENV_KEY];

    const { env } = loadNativeEnv();

    expect(env.EXPO_PUBLIC_SERVER_URL).toBe(DEFAULT_SERVER_URL);
  });

  it("uses override URL when EXPO_PUBLIC_SERVER_URL is set", () => {
    process.env[ENV_KEY] = "http://192.168.0.5:5555";

    const { env } = loadNativeEnv();

    expect(env.EXPO_PUBLIC_SERVER_URL).toBe("http://192.168.0.5:5555");
  });

  it("throws on invalid EXPO_PUBLIC_SERVER_URL", () => {
    process.env[ENV_KEY] = "invalid-url";

    expect(() => loadNativeEnv()).toThrow("Invalid environment variables");
  });
});
