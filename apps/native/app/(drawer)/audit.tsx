import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { AuditFilters, AuditListItem } from "@/components/mobile-tamagui/audit";
import type { AuditEvent } from "@/lib/takeout-api-types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList } from "react-native";

import { Button, ScreenContainer } from "@/components/ui-tamagui";
import type { StatusFilter } from "@/components/mobile-tamagui/audit";
import { Text, View } from "react-native";

export default function AuditScreen() {
  const { api, isPaired } = useTakeoutConnection();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const auditQuery = useQuery({
    queryKey: ["takeout-audit", statusFilter],
    queryFn: () =>
      api
        ? api.getAudit(statusFilter === "ALL" ? undefined : { status: statusFilter })
        : Promise.reject(new Error("No API")),
    enabled: !!api && isPaired,
  });

  const items: AuditEvent[] = useMemo(
    () => auditQuery.data ?? [],
    [auditQuery.data],
  );

  if (!isPaired) {
    return (
      <ScreenContainer mode="static">
        <View style={{ padding: 16, paddingTop: 24, flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 8 }}>
            Auditoria
          </Text>
          <Text style={{ color: "#6b7280", marginBottom: 24 }}>
            Pareie com o desktop para ver o histórico de confirmações.
          </Text>
          <Link href="/pair" asChild>
            <Button testID="audit-pair-cta">Parear com o Desktop</Button>
          </Link>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer mode="static">
      <View style={{ padding: 16, paddingBottom: 16, flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 16 }}>
          Auditoria
        </Text>
        <View style={{ marginBottom: 16 }}>
          <AuditFilters value={statusFilter} onChange={setStatusFilter} />
        </View>
        {auditQuery.isLoading ? (
          <Text style={{ color: "#6b7280", paddingVertical: 32 }}>Carregando...</Text>
        ) : items.length === 0 ? (
          <Text style={{ color: "#6b7280", paddingVertical: 32 }}>
            Nenhum registro de auditoria.
          </Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.request_id}
            renderItem={({ item }: { item: AuditEvent }) => <AuditListItem item={item} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            removeClippedSubviews
          />
        )}
      </View>
    </ScreenContainer>
  );
}
