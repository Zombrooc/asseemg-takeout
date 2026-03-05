import path from "path";
import { existsSync, readFileSync } from "fs";
import { getConfirmTakeoutModalLayout } from "@/components/mobile/audit/confirm-takeout-modal.layout";

const modalFilePath = path.resolve(
  __dirname,
  "../../components/mobile/audit/confirm-takeout-modal.tsx"
);

function loadModalSource(): string {
  expect(existsSync(modalFilePath)).toBe(true);
  return readFileSync(modalFilePath, "utf-8");
}

describe("confirm-takeout-modal keyboard regression", () => {
  it("keeps modal centered when keyboard is closed", () => {
    const layout = getConfirmTakeoutModalLayout({
      windowHeight: 820,
      keyboardHeight: 0,
      isKeyboardVisible: false,
      insets: { top: 24, bottom: 16 },
    });

    expect(layout.justifyContent).toBe("center");
    expect(layout.paddingBottom).toBe(16);
    expect(layout.cardMaxHeight).toBe(732);
  });

  it("aligns content to top and shrinks card maxHeight when keyboard is open", () => {
    const layout = getConfirmTakeoutModalLayout({
      windowHeight: 820,
      keyboardHeight: 300,
      isKeyboardVisible: true,
      insets: { top: 24, bottom: 16 },
    });

    expect(layout.justifyContent).toBe("flex-start");
    expect(layout.paddingTop).toBe(32);
    expect(layout.paddingBottom).toBe(40);
    expect(layout.cardMaxHeight).toBe(432);
  });

  it("keeps retirante input testIDs in modal source", () => {
    const source = loadModalSource();
    expect(source).toContain('testID="takeout-confirm-modal-retirante-nome"');
    expect(source).toContain('testID="takeout-confirm-modal-retirante-cpf"');
  });
});
