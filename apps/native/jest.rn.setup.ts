(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/utils/responsive", () => ({
  useResponsiveScale: () => ({ scale: (n: number) => n, width: 375, height: 812 }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: any }) => children,
}));

jest.mock("uniwind/components", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    ActivityIndicator: RN.ActivityIndicator,
    FlatList: RN.FlatList,
    Modal: RN.Modal,
    Pressable: RN.Pressable,
    ScrollView: RN.ScrollView,
    Text: RN.Text,
    View: RN.View,
  };
});

jest.mock("heroui-native", () => {
  const React = require("react");
  const RN = require("react-native");

  const Button = ({ children, onPress, testID, isDisabled }: any) =>
    React.createElement(
      RN.Pressable,
      { onPress, testID, accessibilityState: { disabled: !!isDisabled } },
      React.createElement(RN.Text, null, children),
    );

  const Surface = ({ children }: any) => React.createElement(RN.View, null, children);
  const Input = ({ value, onChangeText, testID, placeholder }: any) =>
    React.createElement(RN.TextInput, { value, onChangeText, testID, placeholder });
  const Chip = ({ children }: any) => React.createElement(RN.View, null, children);
  Chip.Label = ({ children }: any) => React.createElement(RN.Text, null, children);

  return {
    Button,
    Surface,
    Input,
    Chip,
    Separator: ({ children }: any) => React.createElement(RN.View, null, children),
    Spinner: ({ children }: any) => React.createElement(RN.View, null, children),
    useThemeColor: () => "#fff",
  };
});
