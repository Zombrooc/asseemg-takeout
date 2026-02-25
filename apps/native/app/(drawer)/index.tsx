import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { Button, Chip, Separator, Spinner, Surface } from "heroui-native";
import { Container } from "@/components/container";
import { TopBar } from "@/components/top-bar";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { formatDateBR } from "@/lib/format-date";
import { ActivityIndicator, Pressable, Text, View } from "@/lib/primitives";

export default function Home() {
	const router = useRouter();
	const {
		isPaired,
		isLoading: connectionLoading,
		isReachable,
		api,
		clearConnection,
		checkReachability,
	} = useTakeoutConnection();
	const eventsQuery = useQuery({
		queryKey: ["takeout-events"],
		queryFn: () =>
			api ? api.getEvents() : Promise.reject(new Error("No API")),
		enabled: !!api && isPaired && isReachable,
		refetchInterval: 15_000,
	});

	if (connectionLoading) {
		return (
			<Container className="items-center justify-center px-4">
				<ActivityIndicator size="large" />
			</Container>
		);
	}

	if (!isPaired) {
		return (
			<Container className="px-4 py-6">
				<TopBar
					title="ASSEEMG Retira - Mobile"
					subtitle="Conecte ao app desktop na mesma rede para ver eventos e registrar retiradas."
				/>
				<Link href="/pair" asChild>
					<Button className="px-4 py-3">Parear com o Desktop</Button>
				</Link>
			</Container>
		);
	}

	const events = eventsQuery.data ?? [];

	return (
		<Container className="px-4 pb-4">
			<View className="mb-4 py-4">
				<TopBar
					title="Eventos"
					rightSlot={
						<Chip
							variant="secondary"
							color={isReachable ? "success" : "danger"}
							size="sm"
						>
							<Chip.Label>{isReachable ? "LIVE" : "OFFLINE"}</Chip.Label>
						</Chip>
					}
				/>
				{!isReachable ? (
					<Surface variant="tertiary" className="mb-3 rounded-2xl p-3">
						<Text className="mb-3 text-foreground text-sm">
							Desktop desconectado. Conecte-se para sincronizar dados.
						</Text>
						<View className="flex-row gap-2">
							<Button
								size="sm"
								className="px-3 py-2"
								onPress={() => checkReachability()}
							>
								Tentar novamente
							</Button>
							<Button
								size="sm"
								variant="bordered"
								className="px-3 py-2"
								onPress={() => router.push("/pair")}
							>
								Reconectar
							</Button>
						</View>
					</Surface>
				) : (
					<Surface variant="tertiary" className="rounded-2xl p-3">
						<View className="flex-row items-center">
							<View className="mr-3 h-2 w-2 rounded-full bg-success" />
							<Text className="text-muted-foreground text-sm">
								Conectado ao desktop
							</Text>
						</View>
					</Surface>
				)}
			</View>

			<Separator className="mb-4" />

			{eventsQuery.isLoading ? (
				<View className="items-center py-8">
					<Spinner size="lg" />
				</View>
			) : events.length === 0 ? (
				<Text className="py-6 text-muted-foreground">
					Nenhum evento importado. Importe eventos no app desktop para listá-los
					aqui.
				</Text>
			) : (
				<View className="gap-3">
					{events.map((ev) => (
						<Pressable
							key={ev.eventId}
							onPress={() => router.push(`/(drawer)/events/${ev.eventId}`)}
							style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
						>
							<Surface variant="secondary" className="rounded-2xl p-4">
								<Text className="font-medium text-foreground">
									{ev.name ?? ev.eventId}
								</Text>
								{ev.startDate ? (
									<Text className="mt-1 text-muted-foreground text-sm">
										{formatDateBR(ev.startDate)}
									</Text>
								) : null}
							</Surface>
						</Pressable>
					))}
				</View>
			)}

			<View className="mt-8 pt-4">
				<Button
					variant="bordered"
					className="px-4 py-3"
					onPress={async () => {
						await clearConnection();
						router.replace("/pair");
					}}
				>
					Desparear
				</Button>
			</View>
		</Container>
	);
}
