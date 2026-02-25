import { StatusPill } from "@/components/mobile-tamagui/home";
import { TopBar } from "@/components/ui-tamagui";

type Props = {
  title: string;
  subtitle?: string;
  isLive?: boolean;
};

export function EventHeader({ title, subtitle, isLive = true }: Props) {
  return (
    <TopBar
      title={title}
      subtitle={subtitle}
      rightSlot={<StatusPill isReachable={isLive} />}
    />
  );
}
