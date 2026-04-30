import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventSummary } from "@/components/event-summary";
import { ParticipantsTable, resolveDisplayTicket, formatCpf } from "@/components/participants-table";
import { ReservedNumbersCollapsible } from "@/components/takeout/reserved-numbers-collapsible";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { cn } from "@/lib/utils";
import { formatBirthDateBR } from "@/lib/format-date";
import Fuse from "fuse.js";
import {
  getEventParticipants,
  getEvents,
  getLegacyEventParticipants,
  getLegacyReservedNumbers,
  postLegacyTakeoutConfirm,
  postLegacyCreateParticipant,
  postLegacyTakeoutUndo,
  postLegacyReserveNumbers,
  postTakeoutConfirm,
  postTakeoutUndo,
  putEventParticipant,
  putLegacyEventParticipant,
  type CreateLegacyParticipantPayload,
  type EventParticipant,
  type LegacyEventParticipant,
  type LegacyReservedNumber,
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

  // Busca por CPF apenas com dígitos (ex: usuário digita "12345678" sem pontos/traços)
  const queryDigits = query.replace(/\D/g, "");
  if (queryDigits.length >= 3 && participant.cpf) {
    const cpfDigits = participant.cpf.replace(/\D/g, "");
    if (cpfDigits.includes(queryDigits)) return true;
  }

  const values = [
    participant.name,
    participant.cpf,
    participant.birthDate,
    participant.ticketId,
    participant.sourceTicketId,
    participant.qrCode,
    participant.ticketName,
    participant.bibNumber != null ? String(participant.bibNumber) : null,
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
  const [confirmingParticipant, setConfirmingParticipant] = useState<EventParticipant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<EventParticipant | null>(null);
  const [editName, setEditName] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editTicketType, setEditTicketType] = useState("");
  const [editShirtSize, setEditShirtSize] = useState("");
  const [editTeam, setEditTeam] = useState("");
  const [reserveStart, setReserveStart] = useState("");
  const [reserveEnd, setReserveEnd] = useState("");
  const [reserveLabel, setReserveLabel] = useState("");
  const [isReservedListOpen, setIsReservedListOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createReservationId, setCreateReservationId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");
  const [createCpf, setCreateCpf] = useState("");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [createTicketType, setCreateTicketType] = useState("");
  const [createShirtSize, setCreateShirtSize] = useState("");
  const [createTeam, setCreateTeam] = useState("");
  const [createSex, setCreateSex] = useState("");
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

  const { data: reservedNumbers = [], isLoading: reservedLoading } = useQuery<LegacyReservedNumber[]>({
    queryKey: ["takeout", "events", eventId, "legacy-reservations"],
    queryFn: () => getLegacyReservedNumbers(eventId),
    enabled: eventSummary?.sourceType === "legacy_csv",
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

  const undoMutation = useMutation({
    mutationFn: (p: EventParticipant) =>
      eventSummary?.sourceType === "legacy_csv"
        ? postLegacyTakeoutUndo({
            request_id: crypto.randomUUID(),
            event_id: eventId,
            participant_id: p.id,
            device_id: "web-dashboard",
          })
        : postTakeoutUndo({
            request_id: crypto.randomUUID(),
            ticket_id: p.ticketId,
            device_id: "web-dashboard",
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
      toast.success("Check-in desfeito");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao desfazer"),
  });

  const editMutation = useMutation({
    mutationFn: async (p: EventParticipant) => {
      const payload = {
        name: editName.trim(),
        cpf: editCpf.trim(),
        birthDate: editBirthDate.trim(),
        ticketType: editTicketType.trim(),
        shirtSize: editShirtSize.trim(),
        team: editTeam.trim(),
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
        toast.error("Dados invalidos. Confira nome, cpf, data e tipo de ingresso.");
        return;
      }
      toast.error(message);
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      const start = Number(reserveStart);
      const end = Number(reserveEnd || reserveStart);
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new Error("Informe números válidos para a reserva.");
      }
      if (start <= 0 || end <= 0) {
        throw new Error("Os números devem ser maiores que zero.");
      }
      if (end < start) {
        throw new Error("O número final não pode ser menor que o inicial.");
      }
      const label = reserveLabel.trim() || null;
      const numbers = [];
      for (let i = start; i <= end; i += 1) {
        numbers.push({ bibNumber: i, label });
      }
      return postLegacyReserveNumbers(eventId, { numbers });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "legacy-reservations"] });
      const created = res.created ?? 0;
      const skipped = res.skipped ?? 0;
      toast.success(`Reservas criadas: ${created}${skipped ? ` (puladas: ${skipped})` : ""}`);
      setReserveStart("");
      setReserveEnd("");
      setReserveLabel("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar reservas"),
  });

  const createParticipantMutation = useMutation({
    mutationFn: async () => {
      if (createReservationId == null) {
        throw new Error("Selecione um número reservado.");
      }
      if (!createName.trim()) {
        throw new Error("Nome é obrigatório.");
      }
      if (!createCpf.trim()) {
        throw new Error("CPF é obrigatório.");
      }
      if (!isBirthDateInAllowedRange(createBirthDate, minBirthDate, maxBirthDate)) {
        throw new Error(`Data de nascimento inválida. Use uma data entre ${minBirthDate} e ${maxBirthDate}.`);
      }
      if (!createTicketType.trim()) {
        throw new Error("Tipo de ingresso é obrigatório.");
      }
      const payload: CreateLegacyParticipantPayload = {
        reservationId: createReservationId,
        name: createName.trim(),
        cpf: createCpf.trim(),
        birthDate: createBirthDate.trim(),
        ticketType: createTicketType.trim(),
        shirtSize: createShirtSize.trim() ? createShirtSize.trim() : null,
        team: createTeam.trim() ? createTeam.trim() : null,
        sex: createSex.trim() ? createSex.trim() : null,
      };
      return postLegacyCreateParticipant(eventId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
      queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "legacy-reservations"] });
      toast.success("Participante criado");
      setCreateModalOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar participante"),
  });

  const ticketTypeOptions = useMemo(() => getTicketTypeOptions(participants), [participants]);

  useEffect(() => {
    if (!editingParticipant) return;
    setEditName(editingParticipant.name ?? "");
    setEditCpf(editingParticipant.cpf ?? "");
    setEditBirthDate(editingParticipant.birthDate ?? "");
    setEditTicketType(resolveInitialTicketType(editingParticipant, ticketTypeOptions));
    setEditShirtSize(editingParticipant.shirtSize ?? "");
    setEditTeam(editingParticipant.team ?? "");
  }, [editingParticipant, ticketTypeOptions]);

  const openCreateModal = () => {
    setCreateReservationId(reservedNumbers[0]?.bibNumber ?? null);
    setCreateName("");
    setCreateCpf("");
    setCreateBirthDate("");
    setCreateTicketType(ticketTypeOptions[0] ?? "");
    setCreateShirtSize("");
    setCreateTeam("");
    setCreateSex("");
    setCreateModalOpen(true);
  };

  const fuse = useMemo(
    () =>
      new Fuse(participants, {
        keys: ["name"],
        threshold: 0.4,
        includeScore: false,
      }),
    [participants]
  );

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;

    // Passo rápido: match exato/parcial (CPF, número de peito, ingresso, etc.)
    const exactMatches = participants.filter((p) => participantMatchesSearch(p, searchQuery));
    if (exactMatches.length > 0) return exactMatches;

    // Fallback: busca fuzzy por nome (tolera typos), mínimo 3 chars
    if (normalizeSearchValue(searchQuery).length >= 3) {
      return fuse.search(searchQuery).map((r) => r.item);
    }

    return [];
  }, [participants, searchQuery, fuse]);

  const realStats = useMemo(() => getParticipantStats(participants), [participants]);

  const handleSaveEdit = () => {
    if (!editingParticipant) return;
    if (!isBirthDateInAllowedRange(editBirthDate, minBirthDate, maxBirthDate)) {
      toast.error(`Data de nascimento invalida. Use uma data entre ${minBirthDate} e ${maxBirthDate}.`);
      return;
    }
    if (!editTicketType.trim()) {
      toast.error("Tipo de ingresso e obrigatorio.");
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
        <div className="flex flex-wrap items-center gap-2">
          {eventSummary?.sourceType === "legacy_csv" ? (
            <Button size="sm" onClick={openCreateModal}>
              Cadastrar participante
            </Button>
          ) : null}
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
          {eventSummary?.sourceType === "legacy_csv" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reservas de número</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="reserve-start">Número inicial</Label>
                      <Input
                        id="reserve-start"
                        type="number"
                        inputMode="numeric"
                        value={reserveStart}
                        onChange={(e) => setReserveStart(e.target.value)}
                        placeholder="Ex.: 16"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reserve-end">Número final</Label>
                      <Input
                        id="reserve-end"
                        type="number"
                        inputMode="numeric"
                        value={reserveEnd}
                        onChange={(e) => setReserveEnd(e.target.value)}
                        placeholder="Ex.: 75"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reserve-label">Etiqueta / Equipe (opcional)</Label>
                      <Input
                        id="reserve-label"
                        value={reserveLabel}
                        onChange={(e) => setReserveLabel(e.target.value)}
                        placeholder="Ex.: TIA GLEIDA"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => reserveMutation.mutate()}
                      disabled={reserveMutation.isPending}
                    >
                      {reserveMutation.isPending ? "Salvando..." : "Adicionar reservas"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {reservedLoading ? "Carregando reservas..." : `${reservedNumbers.length} disponíveis`}
                    </p>
                  </div>
                  {reservedNumbers.length > 0 ? (
                    <ReservedNumbersCollapsible
                      reservedNumbers={reservedNumbers}
                      isOpen={isReservedListOpen}
                      onOpenChange={setIsReservedListOpen}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma reserva disponível. Adicione uma faixa para liberar números.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
          <ParticipantsTable
            eventName={eventName}
            participants={filteredParticipants}
            onConfirm={(p) => setConfirmingParticipant(p)}
            onUndo={(p) => {
              const label = p.name ?? p.ticketId;
              if (!window.confirm(`Desfazer check-in de "${label}"?`)) return;
              undoMutation.mutate(p);
            }}
            onEdit={(p) => setEditingParticipant(p)}
            isConfirming={confirmMutation.isPending}
            isUndoing={undoMutation.isPending}
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
              <Label htmlFor="edit-cpf">CPF</Label>
              <Input
                id="edit-cpf"
                value={editCpf}
                onChange={(e) => setEditCpf(e.target.value)}
                placeholder="CPF"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ticket-type">Tipo de ingresso</Label>
              <Input
                id="edit-ticket-type"
                aria-label="Tipo de ingresso"
                value={editTicketType}
                list="ticket-type-options"
                onChange={(e) => setEditTicketType(e.target.value)}
                placeholder="Ex.: 5KM, 10KM, Kids..."
              />
              <datalist id="ticket-type-options">
                {ticketTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </datalist>
              {ticketTypeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma sugestao disponivel; voce pode digitar um valor customizado.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shirt-size">Tamanho da camisa</Label>
              <Input
                id="edit-shirt-size"
                value={editShirtSize}
                onChange={(e) => setEditShirtSize(e.target.value)}
                placeholder="Ex.: P, M, G, GG"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-team">Equipe</Label>
              <Input
                id="edit-team"
                value={editTeam}
                onChange={(e) => setEditTeam(e.target.value)}
                placeholder="Nome da equipe"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingParticipant(null)} disabled={editMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmingParticipant ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-xl">
            <h2 id="confirm-modal-title" className="text-lg font-semibold">
              Confirmar retirada
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{confirmingParticipant.name ?? "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">CPF</dt>
                <dd className="font-mono">{formatCpf(confirmingParticipant.cpf)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Data de Nascimento</dt>
                <dd className="font-mono">{formatBirthDateBR(confirmingParticipant.birthDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Número de Peito</dt>
                <dd className="font-mono tabular-nums">
                  {confirmingParticipant.bibNumber != null ? confirmingParticipant.bibNumber : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ingresso</dt>
                <dd>{resolveDisplayTicket(confirmingParticipant)}</dd>
              </div>
            </dl>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmingParticipant(null)}
                disabled={confirmMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  confirmMutation.mutate(confirmingParticipant, {
                    onSettled: () => setConfirmingParticipant(null),
                  });
                }}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? "Confirmando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Cadastrar participante (reserva)</h2>
            <div className="space-y-2">
              <Label htmlFor="create-reservation">Número reservado</Label>
              <select
                id="create-reservation"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={createReservationId == null ? "" : String(createReservationId)}
                onChange={(event) => {
                  const value = event.target.value;
                  setCreateReservationId(value ? Number(value) : null);
                }}
              >
                <option value="">Selecione um número</option>
                {reservedNumbers.map((item) => (
                  <option key={item.bibNumber} value={String(item.bibNumber)}>
                    #{item.bibNumber} {item.label ? `— ${item.label}` : ""}
                  </option>
                ))}
              </select>
              {reservedNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma reserva disponível. Crie uma faixa antes de cadastrar.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome do participante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-birth-date">Data de nascimento</Label>
              <Input
                id="create-birth-date"
                type="date"
                value={createBirthDate}
                onChange={(e) => setCreateBirthDate(e.target.value)}
                min={minBirthDate}
                max={maxBirthDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-cpf">CPF</Label>
              <Input
                id="create-cpf"
                value={createCpf}
                onChange={(e) => setCreateCpf(e.target.value)}
                placeholder="CPF"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-ticket-type">Tipo de ingresso</Label>
              <Input
                id="create-ticket-type"
                value={createTicketType}
                onChange={(e) => setCreateTicketType(e.target.value)}
                placeholder="Ex.: 5KM, 10KM, Kids..."
                list="create-ticket-type-options"
              />
              <datalist id="create-ticket-type-options">
                {ticketTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-shirt-size">Tamanho da camisa</Label>
              <Input
                id="create-shirt-size"
                value={createShirtSize}
                onChange={(e) => setCreateShirtSize(e.target.value)}
                placeholder="Ex.: P, M, G, GG"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-team">Equipe</Label>
              <Input
                id="create-team"
                value={createTeam}
                onChange={(e) => setCreateTeam(e.target.value)}
                placeholder="Nome da equipe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sex">Sexo (opcional)</Label>
              <Input
                id="create-sex"
                value={createSex}
                onChange={(e) => setCreateSex(e.target.value)}
                placeholder="Ex.: Feminino, Masculino"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                disabled={createParticipantMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createParticipantMutation.mutate()}
                disabled={createParticipantMutation.isPending || reservedNumbers.length === 0}
              >
                {createParticipantMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export function mapLegacyToEventParticipant(legacy: LegacyEventParticipant): EventParticipant {
  const customFormResponses = [
    { name: "sexo", label: "Sexo", type: "text", response: legacy.sex ?? "-" },
    { name: "camisa", label: "Tamanho da Camisa", type: "text", response: legacy.shirtSize ?? "-" },
    { name: "equipe", label: "Equipe", type: "text", response: legacy.team ?? "-" },
  ];

  return {
    id: legacy.id,
    name: legacy.name,
    cpf: legacy.cpf,
    birthDate: legacy.birthDate,
    shirtSize: legacy.shirtSize ?? null,
    team: legacy.team ?? null,
    ticketId: legacy.id,
    sourceTicketId: undefined,
    ticketName: legacy.modality ?? "Legado CSV",
    qrCode: legacy.id,
    checkinDone: legacy.checkinDone,
    bibNumber: legacy.bibNumber,
    customFormResponses,
  };
}
