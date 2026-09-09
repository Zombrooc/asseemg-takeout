var ENV_KEY = "EXPO_PUBLIC_SERVER_URL";
var DEFAULT_SERVER_URL = "http://127.0.0.1:5555";
jest.mock("@pickup/env/native", function () {
    var url = process.env[ENV_KEY];
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("Invalid environment variables");
    }
    return {
        env: { EXPO_PUBLIC_SERVER_URL: url !== null && url !== void 0 ? url : DEFAULT_SERVER_URL },
    };
});
function loadNativeEnv() {
    return require("@pickup/env/native");
}
describe("@pickup/env/native", function () {
    var originalServerUrl = process.env[ENV_KEY];
    afterEach(function () {
        if (originalServerUrl === undefined) {
            delete process.env[ENV_KEY];
            return;
        }
        process.env[ENV_KEY] = originalServerUrl;
    });
    it("uses default URL when EXPO_PUBLIC_SERVER_URL is missing", function () {
        delete process.env[ENV_KEY];
        jest.resetModules();
        var env = loadNativeEnv().env;
        expect(env.EXPO_PUBLIC_SERVER_URL).toBe(DEFAULT_SERVER_URL);
    });
    it("uses override URL when EXPO_PUBLIC_SERVER_URL is set", function () {
        process.env[ENV_KEY] = "http://192.168.0.5:5555";
        jest.resetModules();
        var env = loadNativeEnv().env;
        expect(env.EXPO_PUBLIC_SERVER_URL).toBe("http://192.168.0.5:5555");
    });
    it("throws on invalid EXPO_PUBLIC_SERVER_URL", function () {
        process.env[ENV_KEY] = "invalid-url";
        jest.resetModules();
        expect(function () { return loadNativeEnv(); }).toThrow("Invalid environment variables");
    });
});
