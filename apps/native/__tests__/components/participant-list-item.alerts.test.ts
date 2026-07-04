import path from "path";
import { existsSync, readFileSync } from "fs";

const tamaguiItemPath = path.resolve(
  __dirname,
  "../../components/mobile-tamagui/participant-list-item.tsx"
);
const herouiItemPath = path.resolve(
  __dirname,
  "../../components/takeout/participant-list-item.tsx"
);

function loadSource(filePath: string): string {
  expect(existsSync(filePath)).toBe(true);
  return readFileSync(filePath, "utf-8");
}

describe("participant list item alerts", () => {
  it("keeps alert prop and inline message rendering in tamagui variant", () => {
    const source = loadSource(tamaguiItemPath);

    expect(source).toContain("alerts?: ParticipantAlert[];");
    expect(source).toContain("testID={`participant-alert-icon-${id}`}");
    expect(source).toContain("{alert.message}");
  });

  it("keeps alert prop and inline message rendering in heroui variant", () => {
    const source = loadSource(herouiItemPath);

    expect(source).toContain("alerts?: ParticipantAlert[];");
    expect(source).toContain("testID={`participant-alert-icon-${id}`}");
    expect(source).toContain("{alert.message}");
  });
});
