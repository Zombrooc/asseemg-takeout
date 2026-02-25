import type { PropsWithChildren } from "react";
import {
  type FlatListProps,
  KeyboardAvoidingView,
  Platform,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlatList, ScrollView } from "react-native";
import { YStack } from "tamagui";

type BaseProps = {
  keyboardAware?: boolean;
};

type ScrollModeProps = {
  mode?: "scroll";
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
};

type FlatListModeProps<T> = {
  mode: "flatlist";
  flatListProps: FlatListProps<T>;
};

type StaticModeProps = {
  mode: "static";
};

type ScreenContainerProps<T> = PropsWithChildren<
  BaseProps & (ScrollModeProps | FlatListModeProps<T> | StaticModeProps)
>;

export function ScreenContainer<T>(props: ScreenContainerProps<T>) {
  const {
    children,
    keyboardAware = true,
  } = props;
  const insets = useSafeAreaInsets();
  const mode = props.mode ?? "scroll";

  const insetStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const body =
    mode === "flatlist" ? (
      <FlatList
        keyboardShouldPersistTaps="handled"
        {...(props as FlatListModeProps<T>).flatListProps}
        contentContainerStyle={[
          { flexGrow: 1 },
          (props as FlatListModeProps<T>).flatListProps.contentContainerStyle,
        ]}
      />
    ) : mode === "static" ? (
      <YStack flex={1}>{children}</YStack>
    ) : (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        {...(props as ScrollModeProps).scrollViewProps}
        contentContainerStyle={[{ flexGrow: 1 }, (props as ScrollModeProps).scrollViewProps?.contentContainerStyle]}
      >
        {children}
      </ScrollView>
    );

  const content = (
    <YStack flex={1} backgroundColor="$background" style={insetStyle}>
      {body}
    </YStack>
  );

  if (!keyboardAware) return content;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
