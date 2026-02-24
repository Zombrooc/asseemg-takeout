import { cn } from "heroui-native";
import { type PropsWithChildren } from "react";
import type { ScrollViewProps, ViewProps } from "react-native";

import { ScrollView, View } from "@/lib/primitives";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Layout: use fixed px/numbers and SafeArea insets only. Avoid Dimensions, useWindowDimensions, and % for screen/container sizing. */
const AnimatedView = Animated.createAnimatedComponent(View);

type Props = AnimatedProps<ViewProps> & {
  className?: string;
  isScrollable?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
};

export function Container({
  children,
  className,
  isScrollable = true,
  scrollViewProps,
  ...props
}: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();

  return (
    <AnimatedView
      className={cn("flex-1 bg-background", className)}
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
      {...props}
    >
      {isScrollable ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1">{children}</View>
      )}
    </AnimatedView>
  );
}
