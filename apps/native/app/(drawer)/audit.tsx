import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { AuditFilters, AuditListItem } from "@/components/mobile/audit";
import { Container } from "@/components/ui";
import type { AuditEvent } from "@/lib/takeout-api-types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui";
import { FlatList, Text, View } from "@/lib/primitives";

type StatusFilter = "ALL" | "CONFIRMED" | "DUPLICATE" | "FAILED";

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
      <Container className="px-4 py-6" contentClassName="flex-1">
        <Text className="text-2xl font-semibold text-foreground mb-2">
          Auditoria
        </Text>
        <Text className="text-muted-foreground mb-6">
          Pareie com o desktop para ver o histórico de confirmações.
        </Text>
        <Link href="/pair" asChild>
          <Button testID="audit-pair-cta" className="px-4 py-3">
            Parear com o Desktop
          </Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="px-4 pb-4" contentClassName="flex-1">
      <Text className="text-2xl font-semibold text-foreground mb-4">
        Auditoria
      </Text>
      <View className="mb-4">
        <AuditFilters value={statusFilter} onChange={setStatusFilter} />
      </View>
      {auditQuery.isLoading ? (
        <Text className="text-muted-foreground py-8">Carregando...</Text>
      ) : items.length === 0 ? (
        <Text className="text-muted-foreground py-8">
          Nenhum registro de auditoria.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.request_id}
          renderItem={({ item }) => <AuditListItem item={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          removeClippedSubviews
        />
      )}
    </Container>
  );
}
