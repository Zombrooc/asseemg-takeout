import { View } from "react-native";
import { Button } from "@/components/ui-tamagui";

type Props = {
  onScan: () => void;
  onCreateReservation?: () => void;
  createDisabled?: boolean;
};

export function QuickActionsRow({
  onScan,
  onCreateReservation,
  createDisabled = false,
}: Props) {
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
      <Button testID="events-scan-ticket" variant="bordered" onPress={onScan}>
        Escanear ingresso
      </Button>
      {onCreateReservation ? (
        <Button variant="bordered" onPress={onCreateReservation} isDisabled={createDisabled}>
          Cadastrar reserva
        </Button>
      ) : null}
    </View>
  );
}
