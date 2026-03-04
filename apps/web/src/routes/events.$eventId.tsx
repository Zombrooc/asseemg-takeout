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

export function getTicketTypeOptions(participants: EventParticipant[]): string[] {
  const options = new Set<string>();
  for (const participant of participants) {
    const value = participant.ticketName?.trim();
    if (value) options.add(value);
  }
  return Array.from(options).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function resolveInitialTicketType(
  participant: EventParticipant,
  ticketTypeOptions: string[]
): string {
  const currentTicketType = participant.ticketName?.trim();
  if (currentTicketType && ticketTypeOptions.includes(currentTicketType)) {
    return currentTicketType;
  }
  return ticketTypeOptions[0] ?? "";
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isBirthDateInAllowedRange(
  value: string,
  minDate = "1900-01-01",
  maxDate = getTodayIsoDate()
): boolean {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  if (normalized < minDate || normalized > maxDate) return false;

  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === normalized;
}

export function getParticipantStats(participants: EventParticipant[]): {
  total: number;
  confirmed: number;
  pending: number;
} {
  const total = participants.length;
  const confirmed = participants.filter((p) => p.checkinDone).length;
  return {
    total,
    confirmed,
    pending: Math.max(total - confirmed, 0),
  };
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingParticipant, setEditingParticipant] = useState<EventParticipant | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editTicketType, setEditTicketType] = useState("");
  const minBirthDate = "1900-01-01";
  const maxBirthDate = useMemo(() => getTodayIsoDate(), []);

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

  const ticketTypeOptions = useMemo(() => getTicketTypeOptions(participants), [participants]);

  useEffect(() => {
    if (!editingParticipant) return;
    setEditName(editingParticipant.name ?? "");
    setEditBirthDate(editingParticipant.birthDate ?? "");
    setEditTicketType(resolveInitialTicketType(editingParticipant, ticketTypeOptions));
  }, [editingParticipant, ticketTypeOptions]);

  const filteredParticipants = useMemo(
    () => participants.filter((participant) => participantMatchesSearch(participant, searchQuery)),
    [participants, searchQuery]
  );

  const realStats = useMemo(() => getParticipantStats(participants), [participants]);

  const handleSaveEdit = () => {
    if (!editingParticipant) return;
    if (!isBirthDateInAllowedRange(editBirthDate, minBirthDate, maxBirthDate)) {
      toast.error(`Data de nascimento invalida. Use uma data entre ${minBirthDate} e ${maxBirthDate}.`);
      return;
    }
    if (ticketTypeOptions.length === 0) {
      toast.error("Nao ha tipos de ingresso disponiveis para este evento.");
      return;
    }
    if (!ticketTypeOptions.includes(editTicketType.trim())) {
      toast.error("Selecione um tipo de ingresso valido.");
      return;
    }
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
            confirmedCount={realStats.confirmed}
            pendingCount={realStats.pending}
            rateBaseTotal={realStats.total}
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
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                min={minBirthDate}
                max={maxBirthDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ticket-type">Tipo de ingresso</Label>
              <select
                id="edit-ticket-type"
                aria-label="Tipo de ingresso"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={editTicketType}
                onChange={(e) => setEditTicketType(e.target.value)}
              >
                {ticketTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {ticketTypeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum tipo de ingresso disponivel para este evento.
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingParticipant(null)} disabled={editMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editMutation.isPending || ticketTypeOptions.length === 0}
              >
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
