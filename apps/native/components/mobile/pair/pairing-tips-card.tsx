import { Banner } from "@/components/ui";
import { Text } from "@/lib/primitives";

export function PairingTipsCard() {
  return (
    <Banner className="mb-4">
      <Text className="text-muted-foreground text-xs">
        Dica: mantenha celular e desktop na mesma rede para pareamento e sincronização em tempo real.
      </Text>
    </Banner>
  );
}
