import { Chip } from "@/components/ui";

export function StatusPill({ isReachable }: { isReachable: boolean }) {
  return (
    <Chip color={isReachable ? "success" : "danger"}>
      <Chip.Label>{isReachable ? "LIVE" : "OFFLINE"}</Chip.Label>
    </Chip>
  );
}
