import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { Button, Chip, Input, Spinner, Surface } from "heroui-native";
import { useMemo, useState } from "react";

import { Container } from "@/components/container";
import { TopBar } from "@/components/top-bar";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { formatDateTimeBR } from "@/lib/format-date";
import { FlatList, Text, View } from "@/lib/primitives";
import type { AuditEvent } from "@/lib/takeout-api-types";

type AuditStatusFilter = "ALL" | AuditEvent["status"];

const STATUS_OPTIONS: AuditStatusFilter[] = [
	"ALL",
	"CONFIRMED",
	"DUPLICATE",
	"FAILED",
];

export default function AuditScreen() {
	const router = useRouter();
	const [status, setStatus] = useState<AuditStatusFilter>("ALL");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	const { api, isPaired, isReachable } = useTakeoutConnection();

	const params = useMemo(
		() => ({
			status: status === "ALL" ? undefined : status,
			from: from.trim() || undefined,
			to: to.trim() || undefined,
		}),
		[status, from, to],
	);

	const auditQuery = useQuery({
		queryKey: [
			"takeout-audit",
			params.status ?? "ALL",
			params.from ?? "",
			params.to ?? "",
		],
		queryFn: () =>
			api ? api.getAudit(params) : Promise.reject(new Error("No API")),
		enabled: !!api && isPaired && isReachable,
		refetchInterval: 15_000,
	});

	if (!isPaired) {
		return (
			<Container className="px-4 py-6">
				<TopBar
					title="Auditoria"
					subtitle="Conecte o app ao desktop para consultar os registros de check-in."
				/>
				<Link href="/pair" asChild>
					<Button className="px-4 py-3">Parear com o Desktop</Button>
				</Link>
			</Container>
		);
	}

	return (
		<Container className="px-4 pb-4" isScrollable={false}>
			<View className="py-4">
				<TopBar
					title="Auditoria"
					subtitle="Filtre por status e período para revisar confirmações e conflitos."
				/>

				<View className="mb-3 gap-2">
					<Text className="text-muted-foreground text-xs uppercase">
						Status
					</Text>
					<View className="flex-row flex-wrap gap-2">
						{STATUS_OPTIONS.map((item) => (
							<Chip
								key={item}
								variant={item === status ? "secondary" : "bordered"}
								size="sm"
								onPress={() => setStatus(item)}
							>
								<Chip.Label>{item}</Chip.Label>
							</Chip>
						))}
					</View>
				</View>

				<View className="mb-3 gap-2">
					<Input
						label="De (ISO)"
						value={from}
						onChangeText={setFrom}
						placeholder="2026-01-01T00:00:00.000Z"
						autoCapitalize="none"
					/>
					<Input
						label="Até (ISO)"
						value={to}
						onChangeText={setTo}
						placeholder="2026-01-31T23:59:59.000Z"
						autoCapitalize="none"
					/>
					<Button
						variant="bordered"
						size="sm"
						onPress={() => auditQuery.refetch()}
					>
						Aplicar filtros
					</Button>
				</View>

				{!isReachable ? (
					<Surface variant="tertiary" className="mb-3 rounded-2xl p-3">
						<Text className="text-muted-foreground text-sm">
							Desktop offline. Reconecte para atualizar os registros.
						</Text>
						<Button
							className="mt-2"
							size="sm"
							variant="bordered"
							onPress={() => router.push("/pair")}
						>
							Reconectar
						</Button>
					</Surface>
				) : null}

				{auditQuery.isLoading ? (
					<View className="items-center py-8">
						<Spinner size="lg" />
					</View>
				) : auditQuery.isError ? (
					<Surface variant="tertiary" className="rounded-2xl p-3">
						<Text className="text-danger text-sm">
							{auditQuery.error instanceof Error
								? auditQuery.error.message
								: "Erro ao carregar auditoria."}
						</Text>
					</Surface>
				) : (
					<FlatList
						data={auditQuery.data ?? []}
						keyExtractor={(item) => item.request_id}
						contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
						ListEmptyComponent={
							<Text className="py-6 text-muted-foreground">
								Nenhum registro para os filtros selecionados.
							</Text>
						}
						renderItem={({ item }) => (
							<Surface variant="secondary" className="rounded-2xl p-3">
								<View className="mb-1 flex-row items-center justify-between">
									<Text className="font-semibold text-foreground">
										{item.ticket_id}
									</Text>
									<Chip
										size="sm"
										variant="secondary"
										color={
											item.status === "CONFIRMED"
												? "success"
												: item.status === "FAILED"
													? "danger"
													: "warning"
										}
									>
										<Chip.Label>{item.status}</Chip.Label>
									</Chip>
								</View>
								<Text className="text-muted-foreground text-xs">
									Req: {item.request_id}
								</Text>
								<Text className="text-muted-foreground text-xs">
									Dispositivo: {item.device_id}
								</Text>
								<Text className="text-muted-foreground text-xs">
									{formatDateTimeBR(item.created_at)}
								</Text>
							</Surface>
						)}
					/>
				)}
			</View>
		</Container>
	);
}
