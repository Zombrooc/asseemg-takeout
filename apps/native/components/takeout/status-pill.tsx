import { Chip } from "heroui-native";

type Props = {
  isOnline: boolean;
};

export function StatusPill({ isOnline }: Props) {
  return (
    <Chip variant="secondary" color={isOnline ? "success" : "danger"} size="sm">
      <Chip.Label>{isOnline ? "LIVE" : "OFFLINE"}</Chip.Label>
    </Chip>
  );
}
