import { View } from "react-native";
import { Button } from "@/components/ui-tamagui";

type Props = {
  onScan: () => void;
  onReset: () => void;
  onCreateReservation?: () => void;
  createDisabled?: boolean;
  resetLoading: boolean;
  undoCount?: number;
};

export function QuickActionsRow({
  onScan,
  onReset,
  onCreateReservation,
  createDisabled = false,
  resetLoading,
  undoCount = 0,
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
      <Button
        testID="events-reset-checkins"
        variant="bordered"
        onPress={onReset}
        loading={resetLoading}
        isDisabled={resetLoading}
      >
        {undoCount > 0 ? `Desfazer (${undoCount})` : "Desfazer"}
      </Button>
    </View>
  );
}
