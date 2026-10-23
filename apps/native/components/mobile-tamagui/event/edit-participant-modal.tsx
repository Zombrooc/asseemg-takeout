import { Button, Card, Input } from "@/components/ui-tamagui";
import type {
	EventParticipant,
	LegacyEventParticipant,
	UpdateEventParticipantPayload,
} from "@/lib/takeout-api-types";
import { normalizeDateOnly, parseDateOnlyParts } from "@/lib/format-date";
import React, { useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SourceType = "json_sync" | "legacy_csv";
type Participant = EventParticipant | LegacyEventParticipant;

type Props = {
	visible: boolean;
	participant: Participant | null;
	sourceType: SourceType;
	submitting: boolean;
	onClose: () => void;
	onSubmit: (payload: UpdateEventParticipantPayload) => void;
};

function isValidDate(value: string): boolean {
	return (
		parseDateOnlyParts(value) != null && normalizeDateOnly(value) === value
	);
}

export function EditParticipantModal({
	visible,
	participant,
	sourceType,
	submitting,
	onClose,
	onSubmit,
}: Props) {
	const insets = useSafeAreaInsets();
	const [name, setName] = useState("");
	const [cpf, setCpf] = useState("");
	const [birthDate, setBirthDate] = useState("");
	const [ticketType, setTicketType] = useState("");
	const [shirtSize, setShirtSize] = useState("");
	const [team, setTeam] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!visible || !participant) return;
		const legacy =
			sourceType === "legacy_csv"
				? (participant as LegacyEventParticipant)
				: null;
		const eventParticipant = participant as EventParticipant;
		setName(participant.name ?? "");
		setCpf(participant.cpf ?? "");
		setBirthDate(normalizeDateOnly(participant.birthDate) ?? "");
		setTicketType(legacy?.modality ?? eventParticipant.ticketName ?? "");
		setShirtSize(participant.shirtSize ?? "");
		setTeam(participant.team ?? "");
		setError(null);
	}, [visible, participant, sourceType]);

	const handleSubmit = () => {
		if (!name.trim()) {
			setError("Nome é obrigatório.");
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
			name: name.trim(),
			cpf: cpf.trim(),
			birthDate: normalizeDateOnly(birthDate.trim())!,
			ticketType: ticketType.trim(),
			shirtSize: shirtSize.trim() || null,
			team: team.trim() || null,
		});
	};

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View
				style={{
					flex: 1,
					backgroundColor: "rgba(0,0,0,0.4)",
					padding: 16,
					justifyContent: "center",
				}}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<Card style={{ padding: 16, maxHeight: "90%" }}>
						<Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
							Editar participante
						</Text>
						<ScrollView
							keyboardShouldPersistTaps="handled"
							style={{ marginBottom: 12 }}
						>
							<Text style={{ fontSize: 14, marginBottom: 6 }}>Nome</Text>
							<Input
								value={name}
								onChangeText={setName}
								placeholder="Nome do participante"
							/>

							<Text style={{ fontSize: 14, marginVertical: 6 }}>CPF</Text>
							<Input value={cpf} onChangeText={setCpf} placeholder="CPF" />

							<Text style={{ fontSize: 14, marginVertical: 6 }}>
								Data de nascimento
							</Text>
							<Input
								value={birthDate}
								onChangeText={setBirthDate}
								placeholder="AAAA-MM-DD"
							/>

							<Text style={{ fontSize: 14, marginVertical: 6 }}>
								Tipo de ingresso
							</Text>
							<Input
								value={ticketType}
								onChangeText={setTicketType}
								placeholder="Ex.: 5KM"
							/>

							<Text style={{ fontSize: 14, marginVertical: 6 }}>
								Tamanho da camisa
							</Text>
							<Input
								value={shirtSize}
								onChangeText={setShirtSize}
								placeholder="Ex.: P, M, G"
							/>

							<Text style={{ fontSize: 14, marginVertical: 6 }}>Equipe</Text>
							<Input
								value={team}
								onChangeText={setTeam}
								placeholder="Nome da equipe"
							/>
						</ScrollView>

						{error ? (
							<Text style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</Text>
						) : null}

						<View
							style={{
								flexDirection: "row",
								gap: 8,
								paddingBottom: insets.bottom,
							}}
						>
							<Button
								variant="bordered"
								onPress={onClose}
								isDisabled={submitting}
							>
								Cancelar
							</Button>
							<Button
								onPress={handleSubmit}
								isDisabled={submitting}
								loading={submitting}
							>
								{submitting ? "Salvando" : "Salvar"}
							</Button>
						</View>
					</Card>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}
