type Insets = {
  top: number;
  bottom: number;
};

type ConfirmTakeoutModalLayoutInput = {
  windowHeight: number;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  insets: Insets;
  verticalMargin?: number;
  minCardHeight?: number;
};

type ConfirmTakeoutModalLayout = {
  justifyContent: "center" | "flex-start";
  cardMaxHeight: number;
  paddingTop: number;
  paddingBottom: number;
};

const DEFAULT_VERTICAL_MARGIN = 24;
const DEFAULT_MIN_CARD_HEIGHT = 320;
const KEYBOARD_EXTRA_BOTTOM_PADDING = 24;

export function getConfirmTakeoutModalLayout({
  windowHeight,
  keyboardHeight,
  isKeyboardVisible,
  insets,
  verticalMargin = DEFAULT_VERTICAL_MARGIN,
  minCardHeight = DEFAULT_MIN_CARD_HEIGHT,
}: ConfirmTakeoutModalLayoutInput): ConfirmTakeoutModalLayout {
  const keyboardOffset = isKeyboardVisible ? keyboardHeight : 0;
  const availableHeight =
    windowHeight - insets.top - insets.bottom - keyboardOffset - verticalMargin * 2;
  const cardMaxHeight = Math.max(minCardHeight, availableHeight);

  return {
    justifyContent: isKeyboardVisible ? "flex-start" : "center",
    cardMaxHeight,
    paddingTop: isKeyboardVisible ? Math.max(insets.top + 8, verticalMargin) : insets.top,
    paddingBottom: insets.bottom + (isKeyboardVisible ? KEYBOARD_EXTRA_BOTTOM_PADDING : 0),
  };
}
