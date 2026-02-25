import { cn } from "heroui-native";
import type { PropsWithChildren, ReactElement } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  type FlatListProps,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";

import { FlatList, ScrollView, View } from "@/lib/primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BaseProps = {
  className?: string;
  contentClassName?: string;
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

type ScreenProps<T> = PropsWithChildren<
  BaseProps & (ScrollModeProps | FlatListModeProps<T> | StaticModeProps) & ViewProps
>;

export function Screen<T>(props: ScreenProps<T>): ReactElement {
  const {
    children,
    className,
    contentClassName,
    keyboardAware = true,
    ...rest
  } = props;
  const insets = useSafeAreaInsets();

  const mode = props.mode ?? "scroll";

  const body = (() => {
    if (mode === "flatlist") {
      const flatListProps = (props as FlatListModeProps<T>).flatListProps;
      return (
        <FlatList
          keyboardShouldPersistTaps="handled"
          {...flatListProps}
          contentContainerStyle={[
            { flexGrow: 1 },
            flatListProps.contentContainerStyle,
          ]}
        />
      );
    }

    if (mode === "static") {
      return <View className={cn("flex-1", contentClassName)}>{children}</View>;
    }

    const scrollViewProps = (props as ScrollModeProps).scrollViewProps;
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        {...scrollViewProps}
        contentContainerStyle={[
          { flexGrow: 1 },
          scrollViewProps?.contentContainerStyle,
        ]}
      >
        <View className={contentClassName}>{children}</View>
      </ScrollView>
    );
  })();

  const sharedProps = {
    className: cn("flex-1 bg-background", className),
    style: {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    ...(rest as ViewProps),
  };

  if (!keyboardAware) {
    return <View {...sharedProps}>{body}</View>;
  }

  return (
    <KeyboardAvoidingView
      {...sharedProps}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  );
}

export function Container<T>(props: ScreenProps<T>) {
  return <Screen {...props} />;
}
