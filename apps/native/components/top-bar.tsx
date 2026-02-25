import type { ReactNode } from "react";

import { Text, View } from "@/lib/primitives";

type TopBarProps = {
	title: string;
	subtitle?: string;
	rightSlot?: ReactNode;
};

export function TopBar({ title, subtitle, rightSlot }: TopBarProps) {
	return (
		<View className="mb-4">
			<View className="flex-row items-start justify-between gap-3">
				<View className="flex-1">
					<Text className="font-semibold text-2xl text-foreground">
						{title}
					</Text>
					{subtitle ? (
						<Text className="mt-1 text-muted-foreground text-sm">
							{subtitle}
						</Text>
					) : null}
				</View>
				{rightSlot ? <View>{rightSlot}</View> : null}
			</View>
		</View>
	);
}
