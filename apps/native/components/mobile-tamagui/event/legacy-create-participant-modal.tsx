import { Button, Card, Input } from "@/components/ui-tamagui";
import type {
  CreateLegacyParticipantPayload,
  LegacyReservedNumber,
} from "@/lib/takeout-api-types";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_DATE = "1900-01-01";

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const iso = parsed.toISOString().slice(0, 10);
  return iso === value && value >= MIN_DATE;
}

type Props = {
  visible: boolean;
  reservations: LegacyReservedNumber[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLegacyParticipantPayload) => void;
};

export function LegacyCreateParticipantModal({
  visible,
  reservations,
  submitting,
  onClose,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [team, setTeam] = useState("");
  const [sex, setSex] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setReservationId(reservations[0]?.bibNumber ?? null);
    setName("");
    setCpf("");
    setBirthDate("");
    setTicketType("");
    setShirtSize("");
    setTeam("");
    setSex("");
    setError(null);
  }, [visible, reservations]);

  const handleSubmit = () => {
    if (reservationId == null) {
      setError("Selecione um número reservado.");
      return;
    }
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    if (!cpf.trim()) {
      setError("CPF é obrigatório.");
      return;
    }
    if (!isValidDate(birthDate.trim())) {
      setError("Data de nascimento inválida (AAAA-MM-DD).");
      return;
    }
    if (!ticketType.trim()) {
      setError("Tipo de ingresso é obrigatório.");
      return;
    }
    setError(null);
    onSubmit({
      reservationId,
      name: name.trim(),
      cpf: cpf.trim(),
      birthDate: birthDate.trim(),
      ticketType: ticketType.trim(),
      shirtSize: shirtSize.trim() ? shirtSize.trim() : null,
      team: team.trim() ? team.trim() : null,
      sex: sex.trim() ? sex.trim() : null,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", padding: 16, justifyContent: "center" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Card style={{ padding: 16, maxHeight: "90%" }}>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
              Cadastrar participante (reserva)
            </Text>

            <Text style={{ fontSize: 14, marginBottom: 8 }}>Número reservado</Text>
            {reservations.length === 0 ? (
              <Text style={{ color: "#6b7280", marginBottom: 12 }}>
                Nenhuma reserva disponível.
              </Text>
            ) : (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 8,
                  maxHeight: 140,
                  marginBottom: 12,
                }}
              >
                <ScrollView>
                  {reservations.map((item) => {
                    const selected = reservationId === item.bibNumber;
                    return (
                      <Pressable
                        key={item.bibNumber}
                        onPress={() => setReservationId(item.bibNumber)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          backgroundColor: selected ? "#eef2ff" : "transparent",
                          borderBottomWidth: 1,
                          borderBottomColor: "#f3f4f6",
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>
                          #{item.bibNumber} {item.label ? `— ${item.label}` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <ScrollView style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, marginBottom: 6 }}>Nome</Text>
              <Input value={name} onChangeText={setName} placeholder="Nome do participante" />

              <Text style={{ fontSize: 14, marginVertical: 6 }}>CPF</Text>
              <Input value={cpf} onChangeText={setCpf} placeholder="CPF" />

              <Text style={{ fontSize: 14, marginVertical: 6 }}>Data de nascimento</Text>
              <Input
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="AAAA-MM-DD"
              />

              <Text style={{ fontSize: 14, marginVertical: 6 }}>Tipo de ingresso</Text>
              <Input value={ticketType} onChangeText={setTicketType} placeholder="Ex.: 5KM" />

              <Text style={{ fontSize: 14, marginVertical: 6 }}>Tamanho da camisa</Text>
              <Input value={shirtSize} onChangeText={setShirtSize} placeholder="Ex.: P, M, G" />

              <Text style={{ fontSize: 14, marginVertical: 6 }}>Equipe</Text>
              <Input value={team} onChangeText={setTeam} placeholder="Nome da equipe" />

              <Text style={{ fontSize: 14, marginVertical: 6 }}>Sexo (opcional)</Text>
              <Input value={sex} onChangeText={setSex} placeholder="Ex.: Feminino" />
            </ScrollView>

            {error ? (
              <Text style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 8, paddingBottom: insets.bottom }}>
              <Button variant="bordered" onPress={onClose} isDisabled={submitting}>
                Cancelar
              </Button>
              <Button
                onPress={handleSubmit}
                isDisabled={submitting || reservations.length === 0}
                loading={submitting}
              >
                {submitting ? "Salvando" : "Cadastrar"}
              </Button>
            </View>
          </Card>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
