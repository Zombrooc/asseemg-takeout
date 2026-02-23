/**
 * Constants for build measurement and manifest generation.
 * Cross-platform; use from measure-build.mjs, collect-artifacts.mjs, generate-manifest.mjs.
 */

export const MANIFEST_SCHEMA_VERSION = "1.0";
export const MANIFEST_FILENAME = "build-manifest.json";

/** Paths relative to repo root (where package.json lives). */
export const DIST_PATHS = {
  web: "dist/web",
  server: "dist/server",
  desktopTarget: "dist/desktop/target",
  desktopArtifacts: "dist/desktop/artifacts",
  nativeAndroid: "dist/native/expo-export-android",
  nativeIos: "dist/native/expo-export-ios",
  nativeArtifacts: "dist/native/artifacts",
};

export const ARTIFACT_PATTERNS = [
  { key: "webJs", path: "dist/web/assets/*.js", label: "Web JS bundle" },
  { key: "webCss", path: "dist/web/assets/*.css", label: "Web CSS" },
  { key: "desktopExe", path: "dist/desktop/artifacts/*.exe", label: "Desktop .exe" },
  { key: "desktopNsis", path: "dist/desktop/artifacts/*.nsis*.exe", label: "Desktop NSIS" },
  { key: "desktopMsi", path: "dist/desktop/artifacts/*.msi", label: "Desktop MSI" },
  { key: "nativeBundle", path: "dist/native/**/bundles/*.js", label: "Native JS bundle" },
];
