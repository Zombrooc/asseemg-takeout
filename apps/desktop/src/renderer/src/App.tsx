import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Archive,
	ArrowLeft,
	BarChart3,
	Check,
	CalendarPlus,
	ClipboardList,
	Download,
	FileUp,
	FolderOpen,
	ListPlus,
	LayoutDashboard,
	Minus,
	PackageCheck,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Settings,
	Square,
	Trash2,
	Upload,
	UserPlus,
	Wifi,
	X,
} from "lucide-react";
import type {
	AuditEvent,
	EventParticipant,
	EventSummary,
	CreateLegacyParticipantPayload,
	LegacyEventParticipant,
	LegacyReservedNumber,
} from "./api";
import { api, wsUrl } from "./api";
import { autoMap, buildMappedCsv, decodeCsv, getImportSteps, LEGACY_FIELDS, mappingIsValid, mapRows, parseCsv, type Mapping, type ParsedCsv } from "./import-utils";
import { ASSEEMGLogo } from "./AsseemgLogo";
import { getEventMetadataErrors } from "./event-validation";
import type { WsTakeoutMessage } from "@pickup/api/takeout-contracts";
import { createParticipantSearchIndex, searchParticipantIndex } from "@pickup/api/participant-search";
import type { ParticipantExportFormat } from "./participant-export";

const QRCodeSVG = lazy(() => import("qrcode.react").then(({ QRCodeSVG: Component }) => ({ default: Component })));

function DeferredQrCode({ value, size, level }: { value: string; size: number; level?: "L" | "M" | "Q" | "H" }) {
	return (
		<Suspense fallback={<span className="qr-placeholder" style={{ width: size, height: size }} aria-hidden="true" />}>
			<QRCodeSVG value={value} size={size} level={level} />
		</Suspense>
	);
}

type Page = "dashboard" | "event" | "new-event" | "import" | "audit" | "settings";
type Notice = { kind: "success" | "error"; message: string } | null;

export const SHOW_PARTICIPANT_QR_STORAGE_KEY = "desktop.showParticipantQr";

function birthDateParts(value: string | null | undefined): [number, number, number] | null {
	if (!value) return null;
	const trimmed = value.trim();
	const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
	if (iso) return [Number(iso[1]), Number(iso[2]), Number(iso[3])];
	const brazilian = /^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{4})/.exec(trimmed);
	if (brazilian) return [Number(brazilian[3]), Number(brazilian[2]), Number(brazilian[1])];
	return null;
}

function formatBirthDate(value: string | null | undefined): string {
	if (!value) return "-";
	const parts = birthDateParts(value);
	return parts ? `${String(parts[2]).padStart(2, "0")}/${String(parts[1]).padStart(2, "0")}/${String(parts[0]).padStart(2, "0")}` : value;
}

function getAge(value: string | null | undefined, today = new Date()): string {
	if (!value) return "-";
	const parts = birthDateParts(value);
	if (!parts) return "-";
	let age = today.getFullYear() - parts[0];
	if (today.getMonth() + 1 < parts[1] || (today.getMonth() + 1 === parts[1] && today.getDate() < parts[2])) age--;
	return age >= 0 ? String(age) : "-";
}

function getTodayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function groupLegacyReservations(items: LegacyReservedNumber[]): Array<{ start: number; end: number; label: string | null }> {
	return items.reduce<Array<{ start: number; end: number; label: string | null }>>((groups, item) => {
		const previous = groups.at(-1);
		if (previous && previous.end + 1 === item.bibNumber && previous.label === (item.label ?? null)) {
			previous.end = item.bibNumber;
		} else {
			groups.push({ start: item.bibNumber, end: item.bibNumber, label: item.label ?? null });
		}
		return groups;
	}, []);
}

function getParticipantField(item: EventParticipant | LegacyEventParticipant, field: string): string {
	const value = (item as unknown as Record<string, unknown>)[field];
	return value == null || value === "" ? "-" : String(value);
}

export function formatAuditCpf(value: string | null | undefined): string {
	const digits = value?.replace(/\D/g, "") ?? "";
	if (digits.length !== 11) return value?.trim() || "—";
	return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function readShowParticipantQr(storage: Pick<Storage, "getItem"> = localStorage): boolean {
	return storage.getItem(SHOW_PARTICIPANT_QR_STORAGE_KEY) === "true";
}

function useAsync<T>(
	loader: () => Promise<T>,
	deps: unknown[],
	initial: T,
): { data: T; loading: boolean; error: string | null; reload: () => void; patch: (updater: (current: T) => T) => void } {
	const [data, setData] = useState(initial);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [version, setVersion] = useState(0);
	const loaderRef = useRef(loader);
	loaderRef.current = loader;
	const reload = useCallback(() => setVersion((current) => current + 1), []);
	const patch = useCallback((updater: (current: T) => T) => setData((current) => updater(current)), []);
	useEffect(() => {
		void version;
		let active = true;
		setLoading(true);
		Promise.resolve()
			.then(() => loaderRef.current())
			.then((value) => {
				if (active) {
					setData(value);
					setError(null);
					setLoading(false);
				}
			})
			.catch((caught: unknown) => {
				if (active) {
					setError(
						caught instanceof Error ? caught.message : "Erro inesperado",
					);
					setLoading(false);
				}
			});
		return () => {
			active = false;
		};
	}, [...deps, version]);
	return { data, loading, error, reload, patch };
}

export function shouldReloadParticipants(messageData: unknown): boolean {
	if (typeof messageData !== "string") return false;
	try {
		const message = JSON.parse(messageData) as { type?: unknown };
		return (
			message.type === "participant_checked_in" ||
			message.type === "participant_checkin_reverted" ||
			message.type === "participant_updated"
		);
	} catch {
		return false;
	}
}

export function patchDesktopParticipants<T extends { id: string; ticketId?: string; checkinDone: boolean }>(participants: T[], message: WsTakeoutMessage): T[] {
	const participantMessage = message as { source_type?: string; participant_id?: string; ticket_id?: string };
	const isLegacy = participantMessage.source_type === "legacy_csv" || (participantMessage.ticket_id == null && participantMessage.participant_id != null);
	if (message.type === "participant_updated") {
		const fields = message as typeof message & { name?: string | null; cpf?: string | null; birthDate?: string | null; ticketName?: string | null; modality?: string | null; shirtSize?: string | null; team?: string | null; participant?: Record<string, unknown> };
		const patch = { ...(fields.participant ?? {}), ...(fields.name !== undefined ? { name: fields.name } : {}), ...(fields.cpf !== undefined ? { cpf: fields.cpf } : {}), ...(fields.birthDate !== undefined ? { birthDate: fields.birthDate } : {}), ...(fields.ticketName !== undefined ? { ticketName: fields.ticketName } : {}), ...(fields.modality !== undefined ? { modality: fields.modality } : {}), ...(fields.shirtSize !== undefined ? { shirtSize: fields.shirtSize } : {}), ...(fields.team !== undefined ? { team: fields.team } : {}) };
		return participants.map((item) => {
			const matches = isLegacy
				? item.id === participantMessage.participant_id || item.ticketId === participantMessage.ticket_id
				: item.ticketId === participantMessage.ticket_id || item.id === participantMessage.participant_id;
			return matches ? { ...item, ...patch } : item;
		});
	}
	const target = isLegacy ? participantMessage.participant_id : participantMessage.ticket_id;
	if (!target) return participants;
	if (message.type !== "participant_checked_in" && message.type !== "participant_checkin_reverted") return participants;
	const done = message.type === "participant_checked_in";
	return participants.map((item) =>
		(isLegacy ? item.id === target : item.ticketId === target)
			? { ...item, checkinDone: done }
			: item,
	);
}

function WindowControls() {
	return (
		<div className="window-controls">
			<button
				type="button"
				aria-label="Minimizar"
				onClick={() => void window.desktopWindow.minimize()}
			>
				<Minus size={15} />
			</button>
			<button
				type="button"
				aria-label="Maximizar"
				onClick={() => void window.desktopWindow.maximize()}
			>
				<Square size={13} />
			</button>
			<button
				type="button"
				aria-label="Fechar"
				className="close"
				onClick={() => void window.desktopWindow.close()}
			>
				<X size={15} />
			</button>
		</div>
	);
}

function Shell({
	page,
	setPage,
	children,
}: {
	page: Page;
	setPage: (page: Page) => void;
	children: React.ReactNode;
}) {
	const items: Array<{
		page: Page;
		label: string;
		icon: typeof LayoutDashboard;
	}> = [
		{ page: "dashboard", label: "Visão geral", icon: LayoutDashboard },
		{ page: "audit", label: "Auditoria", icon: ClipboardList },
	];
	return (
		<div className="app-shell">
			<header className="titlebar">
				<div className="brand">
					<ASSEEMGLogo aria-label="ASSEEMG" />
					<strong>Retira</strong>
				</div>
				<span className="titlebar-caption">Operação offline</span>
				<WindowControls />
			</header>
			<div className="workspace">
				<aside className="sidebar">
					<div className="sidebar-label">Operação</div>
					{items.map(({ page: itemPage, label, icon: Icon }) => (
						<button
							type="button"
							key={itemPage}
							className={page === itemPage ? "nav-item active" : "nav-item"}
							onClick={() => setPage(itemPage)}
						>
							<Icon size={17} />
							{label}
						</button>
					))}
					<div className="sidebar-spacer" />
					<div className="connection-pill">
						<span className="online-dot" />
						<div>
							<small>Servidor local</small>
							<strong>127.0.0.1:5555</strong>
						</div>
					</div>
					<button type="button" className={page === "settings" ? "sidebar-footer active" : "sidebar-footer"} onClick={() => setPage("settings")}>
						<Settings size={15} /> Configurações
					</button>
				</aside>
				<main className="content">{children}</main>
			</div>
		</div>
	);
}

function Notice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
	return notice ? (
		<div className={`notice ${notice.kind}`}>
			<span>{notice.message}</span>
			<button type="button" onClick={onClose}>
				<X size={15} />
			</button>
		</div>
	) : null;
}

function SettingsPage({
	showParticipantQr,
	onShowParticipantQrChange,
}: {
	showParticipantQr: boolean;
	onShowParticipantQrChange: (value: boolean) => void;
}) {
	return (
		<div className="page">
			<PageHeader
				eyebrow="PreferÃªncias do aplicativo"
				title="ConfiguraÃ§Ãµes"
				subtitle="Ajuste o que Ã© exibido durante a operaÃ§Ã£o de retirada."
			/>
			<section className="settings-card" aria-labelledby="participant-qr-setting-title">
				<div>
					<h2 id="participant-qr-setting-title">QR Code dos participantes</h2>
					<p>Exibir o QR Code de cada participante na lista do evento.</p>
				</div>
				<label className="switch-control">
					<span className="sr-only">Exibir QR Code dos participantes</span>
					<input
						type="checkbox"
						checked={showParticipantQr}
						onChange={(event) => onShowParticipantQrChange(event.target.checked)}
					/>
					<span className="switch-track" aria-hidden="true" />
				</label>
			</section>
		</div>
	);
}

function Dashboard({
	onOpenEvent,
	onOpenNewEvent,
	notify,
}: {
	onOpenEvent: (event: EventSummary) => void;
	onOpenNewEvent: () => void;
	notify: (notice: Exclude<Notice, null>) => void;
}) {
	const events = useAsync(api.events, [], [] as EventSummary[]);
	const health = useAsync(api.health, [], { status: "" });
	const network = useAsync(api.network, [], {
		baseUrl: "",
		port: 5555,
		addresses: [],
	});
	const connection = useAsync(
		api.connection,
		[],
		null as Awaited<ReturnType<typeof api.connection>> | null,
	);
	const firewall = useAsync(() => window.desktopWindow.firewallStatus(), [], {
		supported: false,
		allowed: true,
		ruleName: "",
		port: 5555,
		reason: undefined as string | undefined,
	});
	const [showArchived, setShowArchived] = useState(false);
	const activeEvents = events.data.filter((event) => !event.archivedAt);
	const archivedEvents = events.data.filter((event) => event.archivedAt);
	const primaryAddress =
		network.data.addresses.find((address) => address.isPrimary)?.url ??
		network.data.baseUrl;
	const pairingUrl = connection.data
		? `${connection.data.baseUrl}?token=${encodeURIComponent(connection.data.pairingToken)}`
		: "";
	const renew = async () => {
		try {
			await api.renewPairing();
			connection.reload();
			notify({ kind: "success", message: "Token renovado" });
		} catch (caught) {
			notify({
				kind: "error",
				message:
					caught instanceof Error ? caught.message : "Falha ao renovar token",
			});
		}
	};
	const allowFirewall = async () => {
		const status = await window.desktopWindow.allowFirewall();
		firewall.reload();
		notify(
			status.allowed
				? { kind: "success", message: "A porta 5555 foi liberada no firewall" }
				: {
						kind: "error",
						message: status.reason ?? "Não foi possível liberar a porta 5555",
					},
		);
	};
	const archive = async (event: EventSummary) => {
		try {
			await api.archive(event.eventId);
			events.reload();
			notify({ kind: "success", message: "Evento arquivado" });
		} catch (caught) {
			notify({
				kind: "error",
				message: caught instanceof Error ? caught.message : "Falha ao arquivar",
			});
		}
	};
	const remove = async (event: EventSummary) => {
		if (
			!window.confirm(
				`Apagar o evento “${event.name ?? event.eventId}” e seus participantes?`,
			)
		)
			return;
		try {
			await api.removeEvent(event.eventId);
			events.reload();
			notify({ kind: "success", message: "Evento apagado" });
		} catch (caught) {
			notify({
				kind: "error",
				message: caught instanceof Error ? caught.message : "Falha ao apagar",
			});
		}
	};
	return (
		<div className="page">
			<PageHeader
				eyebrow="Painel de operação"
				title="Visão geral"
				subtitle="Monitore o servidor local e gerencie os eventos carregados."
					action={
						<button
							type="button"
							className="button primary"
						onClick={onOpenNewEvent}
					>
						<Plus size={16} /> Novo Evento
					</button>
				}
			/>
			{firewall.data.supported && !firewall.data.allowed && (
				<section className="firewall-alert">
					<div className="firewall-alert-icon">
						<Wifi size={20} />
					</div>
					<div>
						<strong>Libere o acesso à rede local</strong>
						<p>
							O celular precisa acessar a porta 5555 para funcionar. O Windows
							solicitará autorização administrativa.
						</p>
						<small>{firewall.data.reason}</small>
					</div>
					<button
						type="button"
						className="button primary"
						onClick={() => void allowFirewall()}
					>
						Liberar porta 5555
					</button>
				</section>
			)}
			<div className="metric-grid">
				<Metric
					icon={<Wifi />}
					label="Servidor"
					value={health.data.status === "ok" ? "Online" : "Verificando"}
					detail="API local na porta 5555"
					status={health.data.status === "ok" ? "good" : "neutral"}
				/>
				<Metric
					icon={<PackageCheck />}
					label="Eventos ativos"
					value={String(activeEvents.length)}
					detail="Disponíveis para retirada"
					status="neutral"
				/>
				<Metric
					icon={<BarChart3 />}
					label="Rede"
					value={primaryAddress || "Detectando"}
					detail="Endereço para o app mobile"
					status="neutral"
				/>
			</div>
			<section className="pairing-card">
				<div>
					<div className="eyebrow">Conectar app mobile</div>
					<h2>Escaneie para parear</h2>
					<p>
						Use o QR Code no aplicativo de operação. O token expira em 15
						minutos.
					</p>
					<div className="pairing-url">
						{pairingUrl || "Gerando código..."}
						<button
							type="button"
							className="button subtle"
							disabled={!pairingUrl}
							onClick={() => {
								if (pairingUrl) {
									void navigator.clipboard.writeText(pairingUrl);
									notify({ kind: "success", message: "URL copiada" });
								}
							}}
						>
							Copiar URL
						</button>
					</div>
					{network.data.addresses.length > 1 && (
						<div className="network-addresses">
							<small>Outros endereços disponíveis nesta máquina</small>
							{network.data.addresses.map((address) => (
								<button
									key={`${address.interfaceName}-${address.ip}`}
									type="button"
									className={address.isPrimary ? "selected" : ""}
									onClick={() => {
										void navigator.clipboard.writeText(
											`${address.url}?token=${encodeURIComponent(connection.data?.pairingToken ?? "")}`,
										);
										notify({ kind: "success", message: "URL da rede copiada" });
									}}
								>
									{address.ip} · {address.interfaceName}
								</button>
							))}
						</div>
					)}
					<button type="button" className="button outline" onClick={() => void renew()}>
						<RefreshCw size={15} /> Renovar token
					</button>
				</div>
				<div className="qr-frame">
					{pairingUrl ? (
						<DeferredQrCode value={pairingUrl} size={156} />
					) : (
						<span className="spinner" />
					)}
				</div>
			</section>
			<section className="section">
				<div className="section-heading">
					<div>
						<div className="eyebrow">Base de eventos</div>
						<h2>Eventos</h2>
					</div>
					<button type="button" className="button ghost" onClick={() => events.reload()}>
						<RefreshCw size={15} /> Atualizar
					</button>
				</div>
				{events.loading ? (
					<Loading />
				) : activeEvents.length === 0 ? (
					<Empty
						icon={<FolderOpen />}
						title="Nenhum evento ativo"
						detail="Importe um arquivo para começar a operação."
					/>
				) : (
					<div className="event-grid">
						{activeEvents.map((event) => (
							<EventCard
								key={event.eventId}
								event={event}
								onOpen={() => onOpenEvent(event)}
								onArchive={() => void archive(event)}
								onDelete={() => void remove(event)}
							/>
						))}
					</div>
				)}
				{archivedEvents.length > 0 ? (
					<>
						<button
							type="button"
							className="archive-toggle"
							onClick={() => setShowArchived((value) => !value)}
						>
							<Archive size={15} /> {showArchived ? "Ocultar" : "Mostrar"}{" "}
							arquivados ({archivedEvents.length})
						</button>
						{showArchived && (
							<div className="event-grid archived">
								{archivedEvents.map((event) => (
									<EventCard
										key={event.eventId}
										event={event}
										onOpen={() => onOpenEvent(event)}
										onArchive={() =>
											void api
												.unarchive(event.eventId)
												.then(() => events.reload())
										}
										onDelete={() => void remove(event)}
									/>
								))}
							</div>
						)}
					</>
				) : null}
			</section>
		</div>
	);
}

function PageHeader({
	eyebrow,
	title,
	subtitle,
	action,
}: {
	eyebrow: string;
	title: string;
	subtitle: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="page-header">
			<div>
				<div className="eyebrow">{eyebrow}</div>
				<h1>{title}</h1>
				<p>{subtitle}</p>
			</div>
			{action}
		</div>
	);
}
function Metric({
	icon,
	label,
	value,
	detail,
	status,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	detail: string;
	status: "good" | "neutral";
}) {
	return (
		<div className="metric-card">
			<span className={`metric-icon ${status}`}>{icon}</span>
			<div>
				<small>{label}</small>
				<strong>{value}</strong>
				<span>{detail}</span>
			</div>
		</div>
	);
}
function EventCard({
	event,
	onOpen,
	onArchive,
	onDelete,
}: {
	event: EventSummary;
	onOpen: () => void;
	onArchive: () => void;
	onDelete: () => void;
}) {
	return (
		<article className="event-card">
			<button type="button" className="event-card-main" onClick={onOpen}>
				<span className="event-date">
					{event.startDate
						? new Date(`${event.startDate}T00:00:00`).toLocaleDateString(
								"pt-BR",
							)
						: "Sem data"}
				</span>
				<h3>{event.name ?? event.eventId}</h3>
				<span className="event-id">{event.eventId}</span>
				<span className="event-open">
					Abrir evento <ArrowLeft size={14} />
				</span>
			</button>
			<div className="event-actions">
				<button
					type="button"
					title={event.archivedAt ? "Desarquivar" : "Arquivar"}
					onClick={onArchive}
				>
					<Archive size={15} />
				</button>
				<button type="button" title="Apagar" onClick={onDelete}>
					<Trash2 size={15} />
				</button>
			</div>
		</article>
	);
}
function Loading() {
	return (
		<div className="loading">
			<span className="spinner" /> Carregando...
		</div>
	);
}
function Empty({
	icon,
	title,
	detail,
}: {
	icon: React.ReactNode;
	title: string;
	detail: string;
}) {
	return (
		<div className="empty">
			<span>{icon}</span>
			<strong>{title}</strong>
			<p>{detail}</p>
		</div>
	);
}

function LegacyParticipantModal({
	reservations,
	busy,
	onClose,
	onSubmit,
}: {
	reservations: LegacyReservedNumber[];
	busy: boolean;
	onClose: () => void;
	onSubmit: (payload: CreateLegacyParticipantPayload) => Promise<void>;
}) {
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
		setReservationId(reservations[0]?.bibNumber ?? null);
	}, [reservations]);

	const submit = async () => {
		if (reservationId == null) return setError("Selecione um número reservado.");
		if (!name.trim()) return setError("Nome é obrigatório.");
		if (!cpf.trim()) return setError("CPF é obrigatório.");
		const parsedDate = new Date(`${birthDate}T00:00:00Z`);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(parsedDate.getTime()) || birthDate < "1900-01-01" || birthDate > getTodayIsoDate()) {
			return setError("Informe uma data de nascimento válida.");
		}
		if (!ticketType.trim()) return setError("Tipo de ingresso é obrigatório.");
		setError(null);
		await onSubmit({
			reservationId,
			name: name.trim(),
			cpf: cpf.trim(),
			birthDate,
			ticketType: ticketType.trim(),
			shirtSize: shirtSize.trim() || null,
			team: team.trim() || null,
			sex: sex.trim() || null,
		});
	};

	return (
		<div className="modal-backdrop">
			<div className="modal" role="dialog" aria-modal="true" aria-labelledby="legacy-participant-title">
				<h2 id="legacy-participant-title">Cadastrar participante</h2>
				<p className="modal-help">Use uma reserva disponível para criar o cadastro manualmente.</p>
				<div className="form-grid">
					<Field label="Número reservado">
						<select value={reservationId == null ? "" : String(reservationId)} onChange={(event) => setReservationId(event.target.value ? Number(event.target.value) : null)}>
							<option value="">Selecione um número</option>
							{reservations.map((item) => <option key={item.bibNumber} value={item.bibNumber}>#{item.bibNumber}{item.label ? ` — ${item.label}` : ""}</option>)}
						</select>
					</Field>
					<Field label="Nome"><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
					<Field label="CPF"><input value={cpf} onChange={(event) => setCpf(event.target.value)} inputMode="numeric" /></Field>
					<Field label="Data de nascimento"><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} min="1900-01-01" max={getTodayIsoDate()} /></Field>
					<Field label="Tipo de ingresso"><input value={ticketType} onChange={(event) => setTicketType(event.target.value)} placeholder="Ex.: 5KM" /></Field>
					<Field label="Tamanho da camisa"><input value={shirtSize} onChange={(event) => setShirtSize(event.target.value)} placeholder="Ex.: M" /></Field>
					<Field label="Equipe"><input value={team} onChange={(event) => setTeam(event.target.value)} /></Field>
					<Field label="Sexo (opcional)"><input value={sex} onChange={(event) => setSex(event.target.value)} /></Field>
				</div>
				{error ? <p className="validation-error" role="alert">{error}</p> : null}
				<div className="form-actions">
					<button type="button" className="button ghost" onClick={onClose} disabled={busy}>Cancelar</button>
					<button type="button" className="button primary" onClick={() => void submit()} disabled={busy || reservations.length === 0}>
						{busy ? "Salvando..." : "Cadastrar participante"}
					</button>
				</div>
			</div>
		</div>
	);
}

function LegacyReservationsModal({
	reservations,
	onClose,
}: {
	reservations: LegacyReservedNumber[];
	onClose: () => void;
}) {
	return (
		<div className="modal-backdrop">
			<div className="modal reservation-modal" role="dialog" aria-modal="true" aria-labelledby="available-reservations-title">
				<h2 id="available-reservations-title">Números reservados disponíveis</h2>
				<p className="modal-help">Confira os números individuais e a descrição de cada reserva.</p>
				<div className="reservation-detail-list">
					{reservations.map((item) => (
						<div className="reservation-detail-row" key={item.bibNumber}>
							<strong>#{item.bibNumber}</strong>
							<span>{item.label || "Sem descrição"}</span>
						</div>
					))}
				</div>
				<div className="form-actions">
					<button type="button" className="button primary" onClick={onClose}>Fechar</button>
				</div>
			</div>
		</div>
	);
}

function EventPage({
	event,
	onBack,
	notify,
	showParticipantQr,
}: {
	event: EventSummary;
	onBack: () => void;
	notify: (notice: Exclude<Notice, null>) => void;
	showParticipantQr: boolean;
}) {
	const legacy = event.sourceType === "legacy_csv";
	const participants = useAsync(
		() =>
			legacy
				? api.legacyParticipants(event.eventId)
				: api.participants(event.eventId),
		[event.eventId, legacy],
		[] as Array<EventParticipant | LegacyEventParticipant>,
	);
	const reservations = useAsync(
		() => legacy ? api.legacyReservations(event.eventId) : Promise.resolve([] as LegacyReservedNumber[]),
		[event.eventId, legacy],
		[] as LegacyReservedNumber[],
	);
	const reservationGroups = useMemo(() => groupLegacyReservations(reservations.data), [reservations.data]);
	const [socketConnected, setSocketConnected] = useState(false);
	useEffect(() => {
		let socket: WebSocket | null = null;
		let retryTimer: number | null = null;
		let retryDelay = 1000;
		let stopped = false;

		const connect = () => {
			if (stopped) return;
			socket = new WebSocket(wsUrl(event.eventId));
			socket.onopen = () => {
				retryDelay = 1000;
				setSocketConnected(true);
			};
			socket.onmessage = (message) => {
				try {
					const data = JSON.parse(message.data) as WsTakeoutMessage;
					if (data.type === "lock_acquired" || data.type === "lock_renewed" || data.type === "lock_snapshot") {
						const participantId = data.participant_id;
						const deviceId = data.device_id;
						const expiresAt = data.expires_at;
						if (participantId && deviceId && expiresAt) setLockMap((current) => ({ ...current, [participantId]: { deviceId, expiresAt } }));
					} else if (data.type === "lock_released" && data.participant_id) {
						const participantId = data.participant_id;
						setLockMap((current) => current[participantId]?.deviceId === data.device_id ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== participantId)) : current);
					}
					participants.patch((current) => patchDesktopParticipants(current, data));
				} catch { /* ignore malformed messages */ }
			};
			socket.onclose = () => {
				setSocketConnected(false);
				if (stopped) return;
				retryTimer = window.setTimeout(connect, retryDelay);
				retryDelay = Math.min(retryDelay * 2, 30_000);
			};
			socket.onerror = () => socket?.close();
		};

		connect();
		return () => {
			stopped = true;
			setSocketConnected(false);
			if (retryTimer !== null) window.clearTimeout(retryTimer);
			socket?.close();
		};
	}, [event.eventId, participants.patch]);
	useEffect(() => {
		const timer = window.setInterval(() => setLockMap((current) => Object.fromEntries(Object.entries(current).filter(([, lock]) => lock.expiresAt > Date.now() / 1000))), 1000);
		return () => window.clearInterval(timer);
	}, []);
	useEffect(() => {
		if (socketConnected) return;
		const timer = window.setInterval(() => participants.reload(), 120_000);
		return () => window.clearInterval(timer);
	}, [participants.reload, socketConnected]);
	const [search, setSearch] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [lockMap, setLockMap] = useState<Record<string, { deviceId: string; expiresAt: number }>>({});
	const [confirming, setConfirming] = useState<EventParticipant | LegacyEventParticipant | null>(null);
	const [editing, setEditing] = useState<EventParticipant | LegacyEventParticipant | null>(null);
	const [editName, setEditName] = useState("");
	const [editCpf, setEditCpf] = useState("");
	const [editBirthDate, setEditBirthDate] = useState("");
	const [editTicketType, setEditTicketType] = useState("");
	const [editShirtSize, setEditShirtSize] = useState("");
	const [editTeam, setEditTeam] = useState("");
	const [isProxyTakeout, setIsProxyTakeout] = useState(false);
	const [retiranteNome, setRetiranteNome] = useState("");
	const [retiranteCpf, setRetiranteCpf] = useState("");
	const [reserveStart, setReserveStart] = useState("");
	const [reserveEnd, setReserveEnd] = useState("");
	const [reserveLabel, setReserveLabel] = useState("");
	const [reserveBusy, setReserveBusy] = useState(false);
	const [reservationsOpen, setReservationsOpen] = useState(false);
	const [createParticipantOpen, setCreateParticipantOpen] = useState(false);
	const [createParticipantBusy, setCreateParticipantBusy] = useState(false);
	const [exportBusy, setExportBusy] = useState<ParticipantExportFormat | null>(null);
	useEffect(() => {
		if (!confirming) return;
		setIsProxyTakeout(false);
		setRetiranteNome("");
		setRetiranteCpf("");
		let active = true;
		void api.acquireLock(confirming.id).catch(() => {});
		const timer = window.setInterval(() => { if (active) void api.renewLock(confirming.id).catch(() => {}); }, 15000);
		return () => { active = false; window.clearInterval(timer); void api.releaseLock(confirming.id).catch(() => {}); };
	}, [confirming]);
	const participantSearchIndex = useMemo(
		() =>
			createParticipantSearchIndex(participants.data, (item) => ({
				exact: Object.values(item),
				fuzzy: [
					item.name,
					"modality" in item ? item.modality : (item as EventParticipant).ticketName,
					item.team,
				],
			})),
		[participants.data],
	);
	const filtered = useMemo(
		() => searchParticipantIndex(participantSearchIndex, search),
		[participantSearchIndex, search],
	);
	const confirm = async (item: EventParticipant | LegacyEventParticipant) => {
		if (isProxyTakeout && !retiranteNome.trim()) {
			notify({ kind: "error", message: "Informe o nome do retirante" });
			return;
		}
		setBusyId(item.id);
		try {
			const lock = await api.acquireLock(item.id);
			if (!lock.acquired) throw new Error("Participante em atendimento por outro dispositivo");
			const requestId = crypto.randomUUID();
			if (legacy)
				await api.legacyConfirm({
					request_id: requestId,
					event_id: event.eventId,
					participant_id: item.id,
					device_id: "desktop",
					payload_json: isProxyTakeout ? JSON.stringify({ retirada_por_terceiro: true, retirante_nome: retiranteNome.trim(), ...(retiranteCpf.trim() ? { retirante_cpf: retiranteCpf.trim() } : {}) }) : undefined,
				});
			else
				await api.confirm({
					request_id: requestId,
					ticket_id: (item as EventParticipant).ticketId,
					device_id: "desktop",
					payload_json: isProxyTakeout ? JSON.stringify({ retirada_por_terceiro: true, retirante_nome: retiranteNome.trim(), ...(retiranteCpf.trim() ? { retirante_cpf: retiranteCpf.trim() } : {}) }) : undefined,
				});
			participants.patch((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, checkinDone: true } : candidate));
			await api.releaseLock(item.id);
			notify({ kind: "success", message: "Retirada confirmada" });
		} catch (caught) {
			notify({
				kind: "error",
				message:
					caught instanceof Error
						? caught.message
						: "Falha ao confirmar retirada",
			});
		} finally {
			await api.releaseLock(item.id).catch(() => {});
			setBusyId(null);
		}
	};
	const undo = async (item: EventParticipant | LegacyEventParticipant) => {
		setBusyId(item.id);
		try {
			const requestId = crypto.randomUUID();
			if (legacy)
				await api.legacyUndo({
					request_id: requestId,
					event_id: event.eventId,
					participant_id: item.id,
					device_id: "desktop",
				});
			else
				await api.undo({
					request_id: requestId,
					ticket_id: (item as EventParticipant).ticketId,
					device_id: "desktop",
				});
			participants.patch((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, checkinDone: false } : candidate));
			notify({ kind: "success", message: "Retirada desfeita" });
		} catch (caught) {
			notify({
				kind: "error",
				message:
					caught instanceof Error
						? caught.message
						: "Falha ao desfazer retirada",
			});
		} finally {
			setBusyId(null);
		}
	};
	const checked = participants.data.filter((item) => item.checkinDone).length;
	const openEdit = (item: EventParticipant | LegacyEventParticipant) => {
		setEditing(item); setEditName("name" in item ? item.name ?? "" : ""); setEditCpf(item.cpf ?? "");
		setEditBirthDate(item.birthDate ?? ""); setEditTicketType(legacy ? ((item as LegacyEventParticipant).modality ?? "") : ((item as EventParticipant).ticketName ?? ""));
		setEditShirtSize((item as EventParticipant).shirtSize ?? (item as LegacyEventParticipant).shirtSize ?? ""); setEditTeam((item as EventParticipant).team ?? (item as LegacyEventParticipant).team ?? "");
	};
	const saveEdit = async () => {
		if (!editing || !editName.trim() || !editBirthDate || !editTicketType.trim()) { notify({ kind: "error", message: "Preencha nome, data e tipo de ingresso" }); return; }
		setBusyId(editing.id);
		try {
			const payload = { name: editName.trim(), cpf: editCpf.trim(), birthDate: editBirthDate, ticketType: editTicketType.trim(), shirtSize: editShirtSize.trim() || null, team: editTeam.trim() || null };
			const updated = legacy ? await api.updateLegacyParticipant(event.eventId, editing.id, payload) : await api.updateParticipant(event.eventId, editing.id, payload);
			participants.patch((current) => current.map((candidate) => candidate.id === editing.id ? updated : candidate));
			setEditing(null); notify({ kind: "success", message: "Participante atualizado" });
		} catch (caught) { notify({ kind: "error", message: caught instanceof Error ? caught.message : "Falha ao editar participante" }); }
		finally { setBusyId(null); }
	};
	const createReservations = async () => {
		const start = Number(reserveStart);
		const end = Number(reserveEnd || reserveStart);
		if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) {
			notify({ kind: "error", message: "Informe números inteiros maiores que zero." });
			return;
		}
		if (end < start) {
			notify({ kind: "error", message: "O número final não pode ser menor que o inicial." });
			return;
		}
		setReserveBusy(true);
		try {
			const label = reserveLabel.trim() || null;
			const numbers = Array.from({ length: end - start + 1 }, (_, index) => ({ bibNumber: start + index, label }));
			const result = await api.reserveLegacyNumbers(event.eventId, { numbers });
			reservations.patch((current) => {
				const existing = new Set(current.map((item) => item.bibNumber));
				const created = numbers
					.filter((item) => !existing.has(item.bibNumber))
					.map((item) => ({
						eventId: event.eventId,
						bibNumber: item.bibNumber,
						label: item.label,
						status: "available" as const,
						createdAt: new Date().toISOString(),
					}));
				return [...current, ...created].sort((left, right) => left.bibNumber - right.bibNumber);
			});
			setReserveStart("");
			setReserveEnd("");
			setReserveLabel("");
			notify({ kind: "success", message: `Reservas criadas: ${result.created}${result.skipped ? ` (${result.skipped} já existentes)` : ""}` });
		} catch (caught) {
			notify({ kind: "error", message: caught instanceof Error ? caught.message : "Falha ao criar reservas" });
		} finally {
			setReserveBusy(false);
		}
	};
	const createParticipant = async (payload: CreateLegacyParticipantPayload) => {
		setCreateParticipantBusy(true);
		try {
			const created = await api.createLegacyParticipant(event.eventId, payload);
			participants.patch((current) => [created, ...current]);
			reservations.patch((current) => current.filter((item) => item.bibNumber !== payload.reservationId));
			setCreateParticipantOpen(false);
			notify({ kind: "success", message: "Participante criado" });
		} catch (caught) {
			notify({ kind: "error", message: caught instanceof Error ? caught.message : "Falha ao cadastrar participante" });
		} finally {
			setCreateParticipantBusy(false);
		}
	};
	const exportFile = async (format: ParticipantExportFormat) => {
		if (participants.data.length === 0) {
			notify({ kind: "error", message: "Nenhum participante para exportar." });
			return;
		}
		setExportBusy(format);
		try {
			const { exportParticipants } = await import("./participant-export");
			const result = await exportParticipants(participants.data, event, format);
			if (result.status === "saved") notify({ kind: "success", message: `${format.toUpperCase()} salvo com ${result.count} participante(s).` });
		} catch (caught) {
			notify({ kind: "error", message: caught instanceof Error ? caught.message : "Falha ao exportar participantes" });
		} finally {
			setExportBusy(null);
		}
	};
	return (
		<div className="page">
			<button type="button" className="back-link" onClick={onBack}>
				<ArrowLeft size={15} /> Voltar para eventos
			</button>
			<PageHeader
				eyebrow={legacy ? "Evento legado" : "Evento sincronizado"}
				title={event.name ?? event.eventId}
				subtitle={`${participants.data.length} participantes · ${checked} retiradas confirmadas`}
				action={
					<div className="header-actions">
						<button type="button" className="button outline" onClick={() => void exportFile("csv")} disabled={exportBusy !== null || participants.loading}>
							<Download size={15} /> {exportBusy === "csv" ? "Exportando..." : "Exportar CSV"}
						</button>
						<button type="button" className="button outline" onClick={() => void exportFile("xlsx")} disabled={exportBusy !== null || participants.loading}>
							<Download size={15} /> {exportBusy === "xlsx" ? "Exportando..." : "Exportar XLSX"}
						</button>
						<button type="button" className="button ghost" onClick={() => participants.reload()} disabled={exportBusy !== null}>
							<RefreshCw size={15} /> Atualizar
						</button>
					</div>
				}
			/>
			<div className="toolbar">
				<div className="search-box">
					<Search size={17} />
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Buscar nome, CPF ou ticket..."
					/>
				</div>
				<span className="result-count">{filtered.length} resultados</span>
			</div>
			{legacy ? (
				<section className="reservation-card" aria-labelledby="reservations-title">
					<div className="section-heading reservation-heading">
						<div>
							<div className="eyebrow">Operação manual</div>
							<h2 id="reservations-title">Reservas de números</h2>
							<p>Reserve uma faixa para cadastrar participantes que não estão no arquivo importado.</p>
						</div>
						<div className="reservation-count">{reservations.loading ? "Carregando..." : `${reservations.data.length} disponíveis`}</div>
					</div>
					<div className="reservation-form">
						<Field label="Número inicial"><input type="number" min="1" step="1" inputMode="numeric" value={reserveStart} onChange={(input) => setReserveStart(input.target.value)} placeholder="Ex.: 16" /></Field>
						<Field label="Número final"><input type="number" min="1" step="1" inputMode="numeric" value={reserveEnd} onChange={(input) => setReserveEnd(input.target.value)} placeholder="Opcional" /></Field>
						<Field label="Etiqueta / equipe (opcional)"><input value={reserveLabel} onChange={(input) => setReserveLabel(input.target.value)} placeholder="Ex.: Tia Gleida" /></Field>
						<div className="reservation-actions">
							<button type="button" className="button primary" onClick={(click) => { click.preventDefault(); void createReservations(); }} disabled={reserveBusy}>
								<ListPlus size={16} /> {reserveBusy ? "Salvando..." : "Adicionar reservas"}
							</button>
							<button type="button" className="button outline" onClick={() => setCreateParticipantOpen(true)} disabled={reservations.loading || reservations.data.length === 0}>
								<UserPlus size={16} /> Cadastrar participante
							</button>
						</div>
					</div>
					{reservationGroups.length > 0 ? <div className="reservation-summary" aria-label="Faixas reservadas">{reservationGroups.map((group) => <span key={`${group.start}-${group.end}-${group.label ?? "none"}`}><strong>{group.start === group.end ? group.start : `${group.start}–${group.end}`}</strong>{group.label ? ` · ${group.label}` : ""}</span>)}</div> : null}
					{reservations.data.length > 0 ? (
						<button type="button" className="reservation-toggle" onClick={() => setReservationsOpen(true)}>
							Ver reservas disponíveis ({reservations.data.length})
						</button>
					) : (
						<p className="reservation-empty">Nenhuma reserva disponível. Adicione uma faixa para liberar números.</p>
					)}
				</section>
			) : null}
			{participants.loading ? (
				<Loading />
			) : filtered.length === 0 ? (
				<Empty
					icon={<Search />}
					title="Nenhum participante"
					detail="Ajuste a busca ou importe dados para este evento."
				/>
			) : (
				<div className="table-card">
					<table>
						<thead>
							<tr>
								<th>Participante</th>
								<th>{legacy ? "Número" : "Ticket"}</th>
								{showParticipantQr && <th>QR Code</th>}
								<th>CPF</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.map((item) => {
								const lockedByOther = lockMap[item.id]?.deviceId != null && lockMap[item.id].deviceId !== "desktop";
								return <tr key={item.id}>
									<td>
										<strong>
											{legacy
												? (item as LegacyEventParticipant).name
												: ((item as EventParticipant).name ?? "Sem nome")}
										</strong>
										<small>
											{legacy
												? ((item as LegacyEventParticipant).modality ?? "")
												: ((item as EventParticipant).ticketName ?? "")}
										</small>
									</td>
					<td>
						{legacy
							? (item as LegacyEventParticipant).bibNumber
							: (item as EventParticipant).ticketId}
					</td>
					{showParticipantQr && (
						<td className="participant-qr-cell">
							{item.qrCode ? <DeferredQrCode value={item.qrCode} size={64} level="M" /> : <span className="muted">Sem QR Code</span>}
						</td>
					)}
									<td>
										{legacy
											? (item as LegacyEventParticipant).cpf
											: ((item as EventParticipant).cpf ?? "—")}
									</td>
									<td>
										<span
											className={
												item.checkinDone ? "status confirmed" : "status pending"
											}
										>
											{item.checkinDone ? (
												<>
													<Check size={13} /> Confirmado
												</>
											) : (
												"Pendente"
											)}
										</span>
									</td>
									<td className="row-action">
										{item.checkinDone ? (
							<button
								type="button"
								className="button small outline"
												disabled={busyId === item.id}
												onClick={() => void undo(item)}
											>
												Desfazer
											</button>
														) : lockedByOther ? <span className="status pending">Em atendimento</span> : (
															<>
																<div className="row-action-buttons">
																	<button type="button" className="button icon-button outline" title="Editar participante" aria-label="Editar participante" disabled={busyId === item.id} onClick={() => openEdit(item)}><Pencil size={14} /></button>
																<button type="button" className="button small primary" disabled={busyId === item.id || lockedByOther} onClick={() => setConfirming(item)}>{busyId === item.id ? "..." : "Confirmar"}</button>
															</div>
															</>
												)}
									</td>
								</tr>;
							})}
						</tbody>
					</table>
			</div>
			)}
			{confirming ? <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><h2>Confirmar retirada</h2><dl className="detail-list"><dt>Nome</dt><dd>{getParticipantField(confirming, "name")}</dd><dt>CPF</dt><dd>{getParticipantField(confirming, "cpf")}</dd><dt>Data de nascimento</dt><dd>{formatBirthDate(confirming.birthDate)}</dd><dt>Idade</dt><dd>{getAge(confirming.birthDate)}</dd><dt>Sexo</dt><dd>{getParticipantField(confirming, "sex")}</dd><dt>Tamanho da camisa</dt><dd>{getParticipantField(confirming, "shirtSize")}</dd><dt>Equipe</dt><dd>{getParticipantField(confirming, "team")}</dd><dt>{legacy ? "Número" : "Ingresso"}</dt><dd>{legacy ? getParticipantField(confirming, "bibNumber") : getParticipantField(confirming, "ticketId")}</dd><dt>Código do ingresso</dt><dd>{getParticipantField(confirming, "sourceTicketId")}</dd><dt>Categoria</dt><dd>{legacy ? getParticipantField(confirming, "modality") : getParticipantField(confirming, "ticketName")}</dd><dt>QR Code</dt><dd>{getParticipantField(confirming, "qrCode")}</dd>{!legacy && (confirming as EventParticipant).customFormResponses?.map((field, index) => <React.Fragment key={`${field.name}-${index}`}><dt>{field.label || field.name}</dt><dd>{String(field.response ?? "-")}</dd></React.Fragment>)}</dl><section className="third-party-section"><label><input type="checkbox" checked={isProxyTakeout} onChange={(event) => setIsProxyTakeout(event.target.checked)} disabled={busyId === confirming.id} /> Retirada por terceiros</label>{isProxyTakeout ? <div className="third-party-fields"><Field label="Nome do retirante"><input value={retiranteNome} onChange={(event) => setRetiranteNome(event.target.value)} placeholder="Nome completo" /></Field><Field label="CPF do retirante (opcional)"><input value={retiranteCpf} onChange={(event) => setRetiranteCpf(event.target.value)} inputMode="numeric" /></Field></div> : null}</section><div className="form-actions"><button type="button" className="button ghost" onClick={() => setConfirming(null)}>Cancelar</button><button type="button" className="button primary" disabled={busyId === confirming.id || (isProxyTakeout && !retiranteNome.trim())} onClick={() => { void confirm(confirming).finally(() => setConfirming(null)); }}>Confirmar retirada</button></div></div></div> : null}
			{editing ? <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><h2>Editar participante</h2><Field label="Nome"><input value={editName} onChange={(e) => setEditName(e.target.value)} /></Field><Field label="CPF"><input value={editCpf} onChange={(e) => setEditCpf(e.target.value)} /></Field><Field label="Data de nascimento"><input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} min="1900-01-01" /></Field><Field label="Tipo de ingresso"><input value={editTicketType} onChange={(e) => setEditTicketType(e.target.value)} /></Field><Field label="Tamanho da camisa"><input value={editShirtSize} onChange={(e) => setEditShirtSize(e.target.value)} /></Field><Field label="Equipe"><input value={editTeam} onChange={(e) => setEditTeam(e.target.value)} /></Field><div className="form-actions"><button type="button" className="button ghost" onClick={() => setEditing(null)}>Cancelar</button><button type="button" className="button primary" disabled={busyId === editing.id} onClick={() => void saveEdit()}>{busyId === editing.id ? "Salvando..." : "Salvar"}</button></div></div></div> : null}
			{reservationsOpen ? <LegacyReservationsModal reservations={reservations.data} onClose={() => setReservationsOpen(false)} /> : null}
			{createParticipantOpen ? <LegacyParticipantModal reservations={reservations.data} busy={createParticipantBusy} onClose={() => setCreateParticipantOpen(false)} onSubmit={createParticipant} /> : null}
		</div>
	);
}

function ImportPage({
	notify,
	onDone,
	isNewEvent = false,
}: {
	notify: (notice: Exclude<Notice, null>) => void;
	onDone: (event?: EventSummary) => void;
	isNewEvent?: boolean;
}) {
	const [mode, setMode] = useState<"csv" | "json">("csv");
	const [eventName, setEventName] = useState("");
	const [eventStartDate, setEventStartDate] = useState("");
	const [eventEndDate, setEventEndDate] = useState("");
	const [eventStartTime, setEventStartTime] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [csv, setCsv] = useState<ParsedCsv | null>(null);
	const [mapping, setMapping] = useState<Mapping | null>(null);
	const [json, setJson] = useState<Record<string, unknown> | null>(null);
	const [busy, setBusy] = useState(false);
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const steps = getImportSteps(mode);
	const metadataValid = eventName.trim().length > 0 && eventStartDate.length > 0;
	const uploadValid = file !== null && (mode === "csv" ? csv !== null : json !== null);
	const mappingValid = mode === "json" || (mapping !== null && mappingIsValid(mapping));
	const parseFileOnWorker = async (next: File, nextMode: "csv" | "json") => {
		if (typeof Worker === "undefined") {
			if (nextMode === "csv") {
				const parsed = parseCsv(decodeCsv(await next.arrayBuffer()));
				return { mode: "csv" as const, parsed, mapping: autoMap(parsed.headers) };
			}
			const parsed = JSON.parse(await next.text()) as Record<string, unknown>;
			if (!Array.isArray(parsed.participants)) throw new Error("O JSON não contém uma lista de participantes válida");
			return { mode: "json" as const, parsed };
		}

		return new Promise<{ mode: "csv" | "json"; parsed: ParsedCsv | Record<string, unknown>; mapping?: Mapping }>((resolve, reject) => {
			const worker = new Worker(new URL("./import-parser.worker.ts", import.meta.url), { type: "module" });
			worker.onmessage = (message: MessageEvent<{ ok: boolean; mode?: "csv" | "json"; parsed?: ParsedCsv | Record<string, unknown>; mapping?: Mapping; error?: string }>) => {
				worker.terminate();
				if (message.data.ok && message.data.mode && message.data.parsed) resolve({ mode: message.data.mode, parsed: message.data.parsed, mapping: message.data.mapping });
				else reject(new Error(message.data.error ?? "Arquivo inválido"));
			};
			worker.onerror = (error) => {
				worker.terminate();
				reject(error.error instanceof Error ? error.error : new Error(error.message));
			};
			if (nextMode === "csv") void next.arrayBuffer().then((buffer) => worker.postMessage({ mode: "csv", buffer }, [buffer])).catch(reject);
			else void next.text().then((text) => worker.postMessage({ mode: "json", text })).catch(reject);
		});
	};
	const selectFile = async (next: File | null) => {
		setFile(next); setCsv(null); setMapping(null); setJson(null);
		if (!next) return;
		try {
			const result = await parseFileOnWorker(next, mode);
			if (result.mode === "csv") {
				setCsv(result.parsed as ParsedCsv); setMapping(result.mapping ?? null);
			} else {
				const parsed = result.parsed as Record<string, unknown>;
				if (!Array.isArray(parsed.participants)) throw new Error("O JSON não contém uma lista de participantes válida");
				setJson(parsed);
			}
		} catch (caught) {
			notify({ kind: "error", message: caught instanceof Error ? caught.message : "Arquivo inválido" });
			setFile(null);
		}
	};
	const submit = async () => {
		if (!isNewEvent && !file) {
			notify({ kind: "error", message: "Selecione um arquivo" });
			return;
		}
		if (mode === "csv" && file && (!csv || !mapping || !mappingIsValid(mapping))) {
			notify({ kind: "error", message: "Mapeie as colunas obrigatórias antes de importar" });
			return;
		}
		if (file && (!eventName.trim() || !eventStartDate)) {
			notify({ kind: "error", message: "Informe o nome e a data inicial do evento" });
			return;
		}
		if (isNewEvent && (!eventName.trim() || !eventStartDate)) {
			notify({ kind: "error", message: "Informe o nome e a data inicial do evento" });
			return;
		}
		setBusy(true);
		try {
			const eventId = crypto.randomUUID();
			if (mode === "csv" && file && csv && mapping) {
				const normalized = new File([buildMappedCsv(csv.rows, mapping)], file.name || "participantes.csv", { type: "text/csv" });
				await api.importCsv({ eventName: eventName.trim() || file.name.replace(/\.[^.]+$/, ""), eventStartDate: eventStartDate || new Date().toISOString().slice(0, 10), endDate: eventEndDate || null, startTime: eventStartTime || null, eventId, file: normalized });
				notify({ kind: "success", message: `${mapRows(csv.rows, mapping).length} participantes importados` });
			} else if (mode === "json" && file && json) {
				const sourceEvent = (json.event ?? {}) as Record<string, unknown>;
				await api.importJson({ ...json, eventId, event: { ...sourceEvent, id: eventId, name: eventName || sourceEvent.name || eventId, startDate: eventStartDate || sourceEvent.startDate, endDate: eventEndDate || sourceEvent.endDate || null, startTime: eventStartTime || sourceEvent.startTime || null } });
				notify({ kind: "success", message: "Evento importado" });
			} else {
				const created = await api.createEvent({ name: eventName.trim(), startDate: eventStartDate, endDate: eventEndDate || null, startTime: eventStartTime || null });
				notify({ kind: "success", message: "Evento criado" });
				onDone(created); return;
			}
			const events = await api.events();
			onDone(events.find((item) => item.eventId === eventId));
		} catch (caught) {
			notify({
				kind: "error",
				message:
					caught instanceof Error ? caught.message : "Falha na importação",
			});
		} finally {
			setBusy(false);
		}
	};
	const nextStep = () => {
		if (step === 1 && !metadataValid) { notify({ kind: "error", message: "Informe o nome e a data inicial do evento" }); return; }
		if (step === 2 && !uploadValid) { notify({ kind: "error", message: "Selecione um arquivo válido antes de avançar" }); return; }
		if (step === 3 && mode === "csv" && !mappingValid) { notify({ kind: "error", message: "Mapeie as colunas obrigatórias antes de avançar" }); return; }
		setStep((current) => Math.min(steps.length, current + 1) as 1 | 2 | 3);
	};
	const previousStep = () => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3);
	return (
		<div className="page narrow">
			<PageHeader
				eyebrow="Base de eventos"
				 title={isNewEvent ? "Novo evento" : "Importar evento"}
				subtitle="Revise os dados antes de salvar e operar as retiradas sem internet."
			/>
			{isNewEvent ? <div className="stepper" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }} aria-label="Etapas da criação do evento">{steps.map((label, index) => <div key={label} className={`step ${step === index + 1 ? "active" : ""} ${step > index + 1 ? "complete" : ""}`}><span>{index + 1}</span>{label}</div>)}</div> : null}
			{(!isNewEvent || step === 1) && <div className="import-tabs">
				<button
					type="button"
					className={mode === "csv" ? "selected" : ""}
					onClick={() => { setMode("csv"); setFile(null); setCsv(null); setMapping(null); setJson(null); }}
				>
					<FileUp size={17} /> CSV legado
				</button>
				<button
					type="button"
					className={mode === "json" ? "selected" : ""}
					onClick={() => { setMode("json"); setFile(null); setCsv(null); setMapping(null); setJson(null); }}
				>
					<Upload size={17} /> JSON sincronizado
				</button>
			</div>}
			<section className="form-card">
				{!isNewEvent || step === 1 ? <>
				{mode === "csv" ? (
					<>
						<Field label="Nome do evento">
							<input
								value={eventName}
								onChange={(event) => setEventName(event.target.value)}
								placeholder="Ex.: Corrida ASSEEMG 2026"
							/>
						</Field>
						<Field label="Data do evento">
							<input
								type="date"
								value={eventStartDate}
								onChange={(event) => setEventStartDate(event.target.value)}
							/>
						</Field>
					</>
				) : (
					<div className="info-box">
						O JSON deve conter <code>eventId</code>, <code>event</code> e{" "}
						<code>participants</code> no formato de sincronização atual.
					</div>
				)}
				{mode === "csv" ? <>
				<Field label="Data final (opcional)"><input type="date" value={eventEndDate} onChange={(event) => setEventEndDate(event.target.value)} /></Field>
				<Field label="Horário (opcional)"><input type="time" value={eventStartTime} onChange={(event) => setEventStartTime(event.target.value)} /></Field>
				</> : null}
				</> : null}
				{!isNewEvent || step === 2 ? <>
				<label className="dropzone">
					<Upload size={24} />
					<strong>{file ? file.name : "Escolha um arquivo"}</strong>
					<span>
						{file
							? `${(file.size / 1024).toFixed(1)} KB`
							: "CSV ou JSON até 25 MB"}
					</span>
					<input
						type="file"
						accept={mode === "csv" ? ".csv,text/csv" : ".json,application/json"}
						onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
					/>
				</label>
				</> : null}
				{!isNewEvent || step === 3 ? <>
				{mode === "csv" && csv && mapping ? <section className="mapping-card"><h2>Mapeamento das colunas</h2>{LEGACY_FIELDS.map((field) => <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`}><select value={mapping[field.key] == null ? "" : String(mapping[field.key])} onChange={(event) => setMapping({ ...mapping, [field.key]: event.target.value === "" ? null : Number(event.target.value) })}><option value="">{field.required ? "Selecione a coluna" : "Não usar"}</option>{csv.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Coluna ${index + 1}`}</option>)}</select></Field>)}{!mappingIsValid(mapping) && <p className="validation-error">Selecione as colunas obrigatórias sem repetir.</p>}<div className="info-box">Preview: {mapRows(csv.rows, mapping).length} participantes válidos.</div><div className="table-card import-preview"><table><thead><tr>{LEGACY_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}</tr></thead><tbody>{mapRows(csv.rows, mapping).slice(0, 10).map((row, index) => <tr key={index}>{LEGACY_FIELDS.map((field) => <td key={field.key}>{row[field.key] || "—"}</td>)}</tr>)}</tbody></table></div></section> : null}
				{mode === "json" && json ? <div className="info-box">Preview carregado: {Array.isArray(json.participants) ? json.participants.length : 0} participantes.</div> : null}
				</> : null}
				<div className="form-actions">
					{isNewEvent && step > 1 ? <button type="button" className="button outline" onClick={previousStep} disabled={busy}>Voltar</button> : null}
					{isNewEvent && mode === "csv" && step < 3 && (step !== 2 || file) ? <button type="button" className="button primary" onClick={nextStep} disabled={busy}>{step === 1 ? "Avançar para upload" : "Avançar para mapeamento"} <ArrowLeft size={15} style={{ transform: "rotate(180deg)" }} /></button> : null}
					{isNewEvent && step === 2 && !file ? <button type="button" className="button primary" disabled={busy} onClick={() => void submit()}><CalendarPlus size={16} /> Criar evento sem participantes</button> : null}
					{(!isNewEvent || step === 3 || (isNewEvent && step === 2 && mode === "json" && file)) && <button
						type="button"
						className="button primary"
						disabled={busy}
						onClick={() => void submit()}
					>
						{busy ? (
							<>
								<span className="spinner light" /> Importando...
							</>
						) : (
							<>
								<Upload size={16} /> {isNewEvent && !file ? "Criar evento" : "Importar e salvar"}
							</>
						)}
					</button>}
				</div>
			</section>
		</div>
	);
}
function Field({
	label,
	children,
	error,
	errorId,
}: {
	label: string;
	children: React.ReactNode;
	error?: string;
	errorId?: string;
}) {
	return (
		<div className="field">
			<span>{label}</span>
			{children}
			{error ? <p id={errorId} role="alert" className="validation-error">{error}</p> : null}
		</div>
	);
}

export function resolveAuditEventId(
	eventContext: Pick<EventSummary, "eventId"> | null | undefined,
	selectedEventId: string,
): string {
	return eventContext?.eventId ?? selectedEventId;
}

function AuditPage({ event }: { event?: EventSummary | null }) {
	const events = useAsync(api.events, [], [] as EventSummary[]);
	const [selectedEventId, setSelectedEventId] = useState(event?.eventId ?? "");
	const [status, setStatus] = useState("");
	const eventId = resolveAuditEventId(event, selectedEventId);
	useEffect(() => {
		setSelectedEventId(event?.eventId ?? "");
	}, [event?.eventId]);
	const audit = useAsync(
		() =>
			eventId
				? api.audit(eventId, status || undefined)
				: Promise.resolve([] as AuditEvent[]),
		[eventId, status],
		[] as AuditEvent[],
	);
	return (
		<div className="page">
			<PageHeader
				eyebrow="Rastreabilidade"
				title={event ? `Auditoria — ${event.name ?? event.eventId}` : "Auditoria"}
				subtitle={event
					? "Consulte as retiradas confirmadas e desfeitas deste evento."
					: "Consulte todas as retiradas confirmadas e desfeitas."}
				action={
					<button type="button" className="button ghost" onClick={() => audit.reload()}>
						<RefreshCw size={15} /> Atualizar
					</button>
				}
			/>
			<div className="filter-row">
				{event ? (
					<div className="audit-event-context" aria-label="Evento da auditoria">
						<span>Evento</span>
						<strong>{event.name ?? event.eventId}</strong>
					</div>
				) : (
					<select
						value={selectedEventId}
						onChange={(nextEvent) => setSelectedEventId(nextEvent.target.value)}
					>
						<option value="">Selecione um evento</option>
						{events.data.map((availableEvent) => (
							<option key={availableEvent.eventId} value={availableEvent.eventId}>
								{availableEvent.name ?? availableEvent.eventId}
							</option>
						))}
					</select>
				)}
				<select
					value={status}
					onChange={(event) => setStatus(event.target.value)}
				>
					<option value="">Todos os status</option>
					<option value="CONFIRMED">Confirmados</option>
					<option value="REVERSED">Desfeitos</option>
					<option value="DUPLICATE">Duplicados</option>
				</select>
			</div>
			{!eventId ? (
				<Empty
					icon={<ClipboardList />}
					title="Selecione um evento"
					detail="Escolha um evento para visualizar o histórico."
				/>
			) : audit.loading ? (
				<Loading />
			) : audit.data.length === 0 ? (
				<Empty
					icon={<ClipboardList />}
					title="Sem registros"
					detail="Ainda não existem operações para este evento."
				/>
			) : (
				<div className="table-card">
					<table>
						<thead>
							<tr>
								<th>Data</th>
								<th>Participante</th>
								<th>CPF</th>
								<th>Ingresso</th>
								<th>Camisa</th>
								<th>Operador</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{audit.data.map((item, index) => (
								<tr key={`${item.request_id}-${index}`}>
									<td>
										{new Date(
											item.checked_in_at ?? item.created_at,
										).toLocaleString("pt-BR")}
									</td>
									<td>{item.participant_name ?? "—"}</td>
									<td>{formatAuditCpf(item.participant_cpf)}</td>
									<td>{item.ticket_name?.trim() || "—"}</td>
									<td>{item.shirt_size?.trim() || "—"}</td>
									<td>{item.operator_alias ?? item.device_id}</td>
									<td>
										<span
											className={`status ${item.status === "REVERSED" ? "reversed" : "confirmed"}`}
										>
											{item.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function NewEventPage({
	notify,
	onCreated,
}: {
	notify: (notice: Exclude<Notice, null>) => void;
	onCreated: (event: EventSummary) => void;
}) {
	const [name, setName] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [startTime, setStartTime] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{ name?: string; startDate?: string }>({});
	const submit = async () => {
		const nextFieldErrors = getEventMetadataErrors({ name, startDate });
		if (Object.keys(nextFieldErrors).length > 0) {
			setFieldErrors(nextFieldErrors);
			return;
		}
		setFieldErrors({});
		setBusy(true);
		try {
			const extension = file?.name.toLowerCase().split(".").pop();
			if (file && extension !== "csv" && extension !== "json") {
				notify({ kind: "error", message: "Escolha um arquivo CSV ou JSON" });
				return;
			}
			const parsedJson = file && file.name.toLowerCase().endsWith(".json")
				? (JSON.parse(await file.text()) as Record<string, unknown>)
				: null;
			if (parsedJson && !Array.isArray(parsedJson.participants)) {
				notify({ kind: "error", message: "O JSON não contém uma lista de participantes válida" });
				return;
			}
			const created = await api.createEvent({
				name: name.trim(),
				startDate,
				endDate: endDate || null,
				startTime: startTime || null,
			});
			if (file && file.name.toLowerCase().endsWith(".csv")) {
				await api.importCsv({
					eventName: created.name ?? name.trim(),
					eventStartDate: created.startDate ?? startDate,
					eventId: created.eventId,
					file,
				});
			} else if (file && parsedJson) {
				const sourceEvent = (parsedJson.event ?? {}) as Record<string, unknown>;
				await api.importJson({
					...parsedJson,
					eventId: created.eventId,
					event: {
						...sourceEvent,
						id: created.eventId,
						name: created.name,
						startDate: created.startDate,
						endDate: created.endDate,
						startTime: created.startTime,
					},
				});
			}
			notify({ kind: "success", message: file ? "Evento criado e participantes importados" : "Evento criado" });
			onCreated(created);
		} catch (caught) {
			notify({ kind: "error", message: caught instanceof Error ? caught.message : "Falha ao criar evento" });
		} finally {
			setBusy(false);
		}
	};
	return (
		<div className="page narrow">
			<PageHeader eyebrow="Base de eventos" title="Novo Evento" subtitle="Cadastre o evento para iniciar a operação de retirada." />
			<section className="form-card">
				<Field label="Nome do evento" error={fieldErrors.name} errorId="new-event-name-error">
					<input
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setFieldErrors((current) => ({ ...current, name: undefined }));
						}}
						aria-invalid={fieldErrors.name ? true : undefined}
						aria-describedby={fieldErrors.name ? "new-event-name-error" : undefined}
						placeholder="Ex.: Corrida ASSEEMG 2026"
					/>
				</Field>
				<div className="form-grid">
					<Field label="Data inicial" error={fieldErrors.startDate} errorId="new-event-start-date-error">
						<input
							type="date"
							value={startDate}
							onChange={(event) => {
								setStartDate(event.target.value);
								setFieldErrors((current) => ({ ...current, startDate: undefined }));
							}}
							aria-invalid={fieldErrors.startDate ? true : undefined}
							aria-describedby={fieldErrors.startDate ? "new-event-start-date-error" : undefined}
						/>
					</Field>
					<Field label="Data final (opcional)"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
				</div>
				<Field label="Horário (opcional)"><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></Field>
				<div className="field">
						<span>Participantes (opcional)</span>
						<label className="dropzone compact">
							<Upload size={20} />
							<strong>{file ? file.name : "Escolha um arquivo CSV ou JSON"}</strong>
							<span>{file ? `${(file.size / 1024).toFixed(1)} KB` : "Os participantes serão vinculados a este evento"}</span>
							<input type="file" accept=".csv,text/csv,.json,application/json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
						</label>
					</div>
				<div className="form-actions">
					<button type="button" className="button primary" disabled={busy} onClick={() => void submit()}>
						<CalendarPlus size={16} /> {busy ? "Criando..." : "Criar Evento"}
					</button>
				</div>
			</section>
		</div>
	);
}

void NewEventPage;

export default function App() {
	const [page, setPage] = useState<Page>("dashboard");
	const [event, setEvent] = useState<EventSummary | null>(null);
	const [notice, setNotice] = useState<Notice>(null);
	const [showParticipantQr, setShowParticipantQr] = useState(() => readShowParticipantQr());
	useEffect(() => {
		localStorage.setItem(SHOW_PARTICIPANT_QR_STORAGE_KEY, String(showParticipantQr));
	}, [showParticipantQr]);
	const notify = (next: Exclude<Notice, null>) => {
		setNotice(next);
		window.setTimeout(() => setNotice(null), 4500);
	};
	const openEvent = (next: EventSummary) => {
		setEvent(next);
		setPage("event");
	};
	const navigate = (next: Page) => {
		setPage(next);
		if (next !== "event" && next !== "audit") setEvent(null);
	};
	const openNewEvent = () => navigate("new-event");
	const content =
		page === "dashboard" ? (
			<Dashboard onOpenEvent={openEvent} onOpenNewEvent={openNewEvent} notify={notify} />
		) : page === "event" && event ? (
			<EventPage
				event={event}
				onBack={() => navigate("dashboard")}
				notify={notify}
				showParticipantQr={showParticipantQr}
			/>
		) : page === "import" ? (
			<ImportPage notify={notify} onDone={(created) => created ? openEvent(created) : setPage("dashboard")} />
		) : page === "new-event" ? (
			<ImportPage notify={notify} isNewEvent onDone={(created) => created ? openEvent(created) : setPage("dashboard")} />
		) : page === "settings" ? (
			<SettingsPage
				showParticipantQr={showParticipantQr}
				onShowParticipantQrChange={setShowParticipantQr}
			/>
		) : (
			<AuditPage event={event} />
		);
	return (
		<Shell
			page={page}
			setPage={navigate}
		>
			<Notice notice={notice} onClose={() => setNotice(null)} />
			{content}
		</Shell>
	);
}
