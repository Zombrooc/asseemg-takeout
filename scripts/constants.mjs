/**
 * Constants for build measurement and manifest generation.
 * Cross-platform; use from measure-build.mjs, collect-artifacts.mjs, generate-manifest.mjs.
 */

export const MANIFEST_SCHEMA_VERSION = "1.0";
export const MANIFEST_FILENAME = "build-manifest.json";

/** Paths relative to repo root (where package.json lives). Build outputs em cada app. */
export const DIST_PATHS = {
  web: "apps/web/dist",
  server: "apps/server/dist",
  desktopTarget: "apps/web/src-tauri/target",
  desktopArtifacts: "apps/web/src-tauri/target/release/bundle",
  nativeAndroid: "apps/native/dist",
  nativeIos: "apps/native/dist",
  nativeArtifacts: "apps/native/dist",
};

export const ARTIFACT_PATTERNS = [
  { key: "webJs", path: "apps/web/dist/assets/*.js", label: "Web JS bundle" },
  { key: "webCss", path: "apps/web/dist/assets/*.css", label: "Web CSS" },
  { key: "desktopExe", path: "apps/web/src-tauri/target/release/bundle/**/*.exe", label: "Desktop .exe" },
  { key: "desktopNsis", path: "apps/web/src-tauri/target/release/bundle/nsis/*.exe", label: "Desktop NSIS" },
  { key: "desktopMsi", path: "apps/web/src-tauri/target/release/bundle/msi/*.msi", label: "Desktop MSI" },
  { key: "nativeBundle", path: "apps/native/dist/**/bundles/*.js", label: "Native JS bundle" },
];
