import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventSummary } from "@/components/event-summary";
import { ParticipantsTable } from "@/components/participants-table";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { cn } from "@/lib/utils";
import {
  getEventParticipants,
  getEvents,
  getLegacyEventParticipants,
  postLegacyTakeoutConfirm,
  postTakeoutConfirm,
  putEventParticipant,
  putLegacyEventParticipant,
  type EventParticipant,
  type LegacyEventParticipant,
} from "@/lib/takeout-api";
import { useTakeoutWs } from "@/lib/use-takeout-ws";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Search, X } from "lucide-react";

const isDev = import.meta.env.DEV;

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
});

export function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function participantMatchesSearch(participant: EventParticipant, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const values = [
    participant.name,
    participant.cpf,
    participant.birthDate,
    participant.ticketId,
    participant.sourceTicketId,
    participant.qrCode,
    participant.ticketName,
  ];

  return values.some((value) => {
    if (value == null) return false;
    return normalizeSearchValue(String(value)).includes(normalizedQuery);
  });
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingParticipant, setEditingParticipant] = useState<EventParticipant | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editTicketType, setEditTicketType] = useState("");

  useTakeoutWs(eventId);

  const { data: events = [] } = useQuery({
    queryKey: ["takeout", "events"],
    queryFn: () => getEvents(true),
  });
  const eventSummary = events.find((e) => e.eventId === eventId);
  const eventName = eventSummary?.name ?? eventId;

  const { data: participants = [], isLoading, refetch } = useQuery({
    queryKey: ["takeout", "events", eventId, "participants"],
    queryFn: async () => {
      if (eventSummary?.sourceType === "legacy_csv") {
        const rows = await getLegacyEventParticipants(eventId);
        return rows.map(mapLegacyToEventParticipant);
      }
      return getEventParticipants(eventId);
    },
    refetchInterval: 10_000,
  });

  const confirmMutation = useMutation({
    mutationFn: (p: EventParticipant) =>
      eventSummary?.sourceType === "legacy_csv"
        ? postLegacyTakeoutConfirm({
            request_id: crypto.randomUUID(),
            event_id: eventId,
            participant_id: p.id,
            device_id: "web-dashboard",
          })
        : postTakeoutConfirm({
            request_id: crypto.randomUUID(),
            ticket_id: p.ticketId,
            device_id: "web-dashboard",
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
      toast.success("Check-in confirmado");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao confirmar"),
  });

  const editMutation = useMutation({
    mutationFn: async (p: EventParticipant) => {
      const payload = {
        name: editName.trim(),
        birthDate: editBirthDate.trim(),
        ticketType: editTicketType.trim(),
      };

      if (eventSummary?.sourceType === "legacy_csv") {
        await putLegacyEventParticipant(eventId, p.id, payload);
        return;
      }
      await putEventParticipant(eventId, p.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
      setEditingParticipant(null);
      toast.success("Participante atualizado");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Erro ao editar participante";
      if (message.includes("HTTP 409")) {
        toast.error("Participante ja confirmado nao pode ser editado");
        return;
      }
      if (message.includes("HTTP 400")) {
        toast.error("Dados invalidos. Confira nome, data e tipo de ingresso.");
        return;
      }
      toast.error(message);
    },
  });

  useEffect(() => {
    if (!editingParticipant) return;
    setEditName(editingParticipant.name ?? "");
    setEditBirthDate(editingParticipant.birthDate ?? "");
    setEditTicketType(editingParticipant.ticketName ?? "");
  }, [editingParticipant]);

  const filteredParticipants = useMemo(
    () => participants.filter((participant) => participantMatchesSearch(participant, searchQuery)),
    [participants, searchQuery]
  );

  const confirmedCount = filteredParticipants.filter((p) => p.checkinDone).length;
  const pendingCount = filteredParticipants.length - confirmedCount;

  const handleSaveEdit = () => {
    if (!editingParticipant) return;
    editMutation.mutate(editingParticipant);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/" },
          { label: eventName, href: `/events/${eventId}` },
          { label: "Participantes" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">{eventName}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Atualizar lista"
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} aria-hidden />
          Atualizar
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Buscar por nome, CPF ou ingresso..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-8"
          aria-label="Buscar participante"
        />
        {searchQuery.trim() ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando participantes...</p>
      ) : (
        <>
          <EventSummary
            totalParticipants={filteredParticipants.length}
            confirmedCount={confirmedCount}
            pendingCount={pendingCount}
          />
          <ParticipantsTable
            eventName={eventName}
            participants={filteredParticipants}
            onConfirm={(p) => confirmMutation.mutate(p)}
            onEdit={(p) => setEditingParticipant(p)}
            isConfirming={confirmMutation.isPending}
            isEditing={editMutation.isPending}
            showQrColumn={isDev}
          />
        </>
      )}

      {editingParticipant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Editar participante</h2>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do participante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-birth-date">Data de nascimento</Label>
              <Input
                id="edit-birth-date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ticket-type">Tipo de ingresso</Label>
              <Input
                id="edit-ticket-type"
                value={editTicketType}
                onChange={(e) => setEditTicketType(e.target.value)}
                placeholder="Ex.: 5KM, 10KM"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingParticipant(null)} disabled={editMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
                {editMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export function mapLegacyToEventParticipant(legacy: LegacyEventParticipant): EventParticipant {
  return {
    id: legacy.id,
    name: legacy.name,
    cpf: legacy.cpf,
    birthDate: legacy.birthDate,
    ticketId: legacy.id,
    sourceTicketId: undefined,
    ticketName: legacy.modality ?? "Legado CSV",
    qrCode: legacy.id,
    checkinDone: legacy.checkinDone,
    customFormResponses: [
      { name: "sexo", label: "Sexo", type: "text", response: legacy.sex ?? "-" },
      { name: "camisa", label: "Tamanho da Camisa", type: "text", response: legacy.shirtSize ?? "-" },
      { name: "equipe", label: "Equipe", type: "text", response: legacy.team ?? "-" },
    ],
  };
}

