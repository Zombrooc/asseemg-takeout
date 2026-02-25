import { Link, useRouter } from "expo-router";
import { Button, Chip, Surface } from "heroui-native";

import { Container } from "@/components/container";
import { TopBar } from "@/components/top-bar";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { Text, View } from "@/lib/primitives";

export default function SettingsScreen() {
	const router = useRouter();
	const {
		baseUrl,
		deviceId,
		defaultBaseUrl,
		isPaired,
		isReachable,
		checkReachability,
		clearConnection,
	} = useTakeoutConnection();

	return (
		<Container className="px-4 pb-4">
			<View className="py-4">
				<TopBar
					title="Configurações"
					subtitle="Gerencie a conexão com o desktop e os dados deste dispositivo."
					rightSlot={
						<Chip
							size="sm"
							color={isReachable ? "success" : "danger"}
							variant="secondary"
						>
							<Chip.Label>{isReachable ? "ONLINE" : "OFFLINE"}</Chip.Label>
						</Chip>
					}
				/>

				<Surface variant="tertiary" className="mb-3 rounded-2xl p-4">
					<Text className="mb-2 text-muted-foreground text-xs uppercase">
						Conexão
					</Text>
					<Text className="text-foreground">
						Base URL: {baseUrl ?? "Não configurada"}
					</Text>
					<Text className="mt-1 text-muted-foreground text-sm">
						Base padrão do app: {defaultBaseUrl}
					</Text>
					<View className="mt-3 flex-row gap-2">
						<Button size="sm" onPress={() => checkReachability()}>
							Testar conexão
						</Button>
						<Button
							size="sm"
							variant="bordered"
							onPress={() => router.push("/pair")}
						>
							Reconectar
						</Button>
					</View>
				</Surface>

				<Surface variant="tertiary" className="mb-3 rounded-2xl p-4">
					<Text className="mb-2 text-muted-foreground text-xs uppercase">
						Dispositivo
					</Text>
					<Text className="text-foreground">
						ID: {deviceId ?? "Não disponível"}
					</Text>
					<Text className="mt-1 text-muted-foreground text-sm">
						Pareado: {isPaired ? "Sim" : "Não"}
					</Text>
				</Surface>

				{isPaired ? (
					<Button
						variant="bordered"
						className="px-4 py-3"
						onPress={async () => {
							await clearConnection();
							router.replace("/pair");
						}}
					>
						Desparear dispositivo
					</Button>
				) : (
					<Link href="/pair" asChild>
						<Button className="px-4 py-3">Parear dispositivo</Button>
					</Link>
				)}
			</View>
		</Container>
	);
}
