import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
	Archive,
	ArrowLeft,
	BarChart3,
	Check,
	CalendarPlus,
	ClipboardList,
	FileUp,
	FolderOpen,
	LayoutDashboard,
	Minus,
	PackageCheck,
	Plus,
	RefreshCw,
	Search,
	Settings,
	Square,
	Trash2,
	Upload,
	Wifi,
	X,
} from "lucide-react";
import type {
	AuditEvent,
	EventParticipant,
	EventSummary,
	LegacyEventParticipant,
} from "./api";
import { api, wsUrl } from "./api";
import { autoMap, buildMappedCsv, decodeCsv, getImportSteps, LEGACY_FIELDS, mappingIsValid, mapRows, parseCsv, type Mapping, type ParsedCsv } from "./import-utils";
import { ASSEEMGLogo } from "./AsseemgLogo";
import { getEventMetadataErrors } from "./event-validation";

type Page = "dashboard" | "event" | "new-event" | "import" | "audit";
type Notice = { kind: "success" | "error"; message: string } | null;

function useAsync<T>(
	loader: () => Promise<T>,
	deps: unknown[],
	initial: T,
): { data: T; loading: boolean; error: string | null; reload: () => void } {
	const [data, setData] = useState(initial);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [version, setVersion] = useState(0);
	const loaderRef = useRef(loader);
	loaderRef.current = loader;
	const reload = useCallback(() => setVersion((current) => current + 1), []);
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
	return { data, loading, error, reload };
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
					<div className="sidebar-footer">
						<Settings size={15} /> Configurações
					</div>
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
					<button type="button" className="button outline" onClick={() => void renew()}>
						<RefreshCw size={15} /> Renovar token
					</button>
				</div>
				<div className="qr-frame">
					{pairingUrl ? (
						<QRCodeSVG value={pairingUrl} size={156} />
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

function EventPage({
	event,
	onBack,
	notify,
}: {
	event: EventSummary;
	onBack: () => void;
	notify: (notice: Exclude<Notice, null>) => void;
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
	const [search, setSearch] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [confirming, setConfirming] = useState<EventParticipant | LegacyEventParticipant | null>(null);
	const [editing, setEditing] = useState<EventParticipant | LegacyEventParticipant | null>(null);
	const [editName, setEditName] = useState("");
	const [editCpf, setEditCpf] = useState("");
	const [editBirthDate, setEditBirthDate] = useState("");
	const [editTicketType, setEditTicketType] = useState("");
	const [editShirtSize, setEditShirtSize] = useState("");
	const [editTeam, setEditTeam] = useState("");
	const filtered = useMemo(() => {
		const query = search.trim().toLocaleLowerCase("pt-BR");
		if (!query) return participants.data;
		return participants.data.filter((item) =>
			Object.values(item).some((value) =>
				String(value ?? "")
					.toLocaleLowerCase("pt-BR")
					.includes(query),
			),
		);
	}, [participants.data, search]);
	const confirm = async (item: EventParticipant | LegacyEventParticipant) => {
		setBusyId(item.id);
		try {
			const requestId = crypto.randomUUID();
			if (legacy)
				await api.legacyConfirm({
					request_id: requestId,
					event_id: event.eventId,
					participant_id: item.id,
					device_id: "desktop",
				});
			else
				await api.confirm({
					request_id: requestId,
					ticket_id: (item as EventParticipant).ticketId,
					device_id: "desktop",
				});
			participants.reload();
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
			participants.reload();
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
			if (legacy) await api.updateLegacyParticipant(event.eventId, editing.id, payload); else await api.updateParticipant(event.eventId, editing.id, payload);
			setEditing(null); participants.reload(); notify({ kind: "success", message: "Participante atualizado" });
		} catch (caught) { notify({ kind: "error", message: caught instanceof Error ? caught.message : "Falha ao editar participante" }); }
		finally { setBusyId(null); }
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
						<button
							type="button"
							className="button ghost"
						onClick={() => participants.reload()}
					>
						<RefreshCw size={15} /> Atualizar
					</button>
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
								<th>CPF</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.map((item) => (
								<tr key={item.id}>
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
												) : (
													<>
														<button type="button" className="button small outline" disabled={busyId === item.id} onClick={() => openEdit(item)}>Editar</button>
														<button type="button" className="button small primary" disabled={busyId === item.id} onClick={() => setConfirming(item)}>{busyId === item.id ? "..." : "Confirmar"}</button>
													</>
												)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
			</div>
			)}
			{confirming ? <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><h2>Confirmar retirada</h2><dl className="detail-list"><dt>Nome</dt><dd>{"name" in confirming ? confirming.name : "-"}</dd><dt>CPF</dt><dd>{confirming.cpf || "-"}</dd><dt>Data de nascimento</dt><dd>{confirming.birthDate || "-"}</dd><dt>{legacy ? "Número" : "Ticket"}</dt><dd>{legacy ? (confirming as LegacyEventParticipant).bibNumber : (confirming as EventParticipant).ticketId}</dd><dt>Categoria</dt><dd>{legacy ? (confirming as LegacyEventParticipant).modality : (confirming as EventParticipant).ticketName}</dd></dl><div className="form-actions"><button type="button" className="button ghost" onClick={() => setConfirming(null)}>Cancelar</button><button type="button" className="button primary" disabled={busyId === confirming.id} onClick={() => { void confirm(confirming).finally(() => setConfirming(null)); }}>Confirmar retirada</button></div></div></div> : null}
			{editing ? <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><h2>Editar participante</h2><Field label="Nome"><input value={editName} onChange={(e) => setEditName(e.target.value)} /></Field><Field label="CPF"><input value={editCpf} onChange={(e) => setEditCpf(e.target.value)} /></Field><Field label="Data de nascimento"><input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} min="1900-01-01" /></Field><Field label="Tipo de ingresso"><input value={editTicketType} onChange={(e) => setEditTicketType(e.target.value)} /></Field><Field label="Tamanho da camisa"><input value={editShirtSize} onChange={(e) => setEditShirtSize(e.target.value)} /></Field><Field label="Equipe"><input value={editTeam} onChange={(e) => setEditTeam(e.target.value)} /></Field><div className="form-actions"><button type="button" className="button ghost" onClick={() => setEditing(null)}>Cancelar</button><button type="button" className="button primary" disabled={busyId === editing.id} onClick={() => void saveEdit()}>{busyId === editing.id ? "Salvando..." : "Salvar"}</button></div></div></div> : null}
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
	const selectFile = async (next: File | null) => {
		setFile(next); setCsv(null); setMapping(null); setJson(null);
		if (!next) return;
		try {
			if (mode === "csv") {
				const parsed = parseCsv(decodeCsv(await next.arrayBuffer()));
				setCsv(parsed); setMapping(autoMap(parsed.headers));
			} else {
				const parsed = JSON.parse(await next.text()) as Record<string, unknown>;
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

function AuditPage() {
	const events = useAsync(api.events, [], [] as EventSummary[]);
	const [eventId, setEventId] = useState("");
	const [status, setStatus] = useState("");
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
				title="Auditoria"
				subtitle="Consulte todas as retiradas confirmadas e desfeitas."
				action={
					<button type="button" className="button ghost" onClick={() => audit.reload()}>
						<RefreshCw size={15} /> Atualizar
					</button>
				}
			/>
			<div className="filter-row">
				<select
					value={eventId}
					onChange={(event) => setEventId(event.target.value)}
				>
					<option value="">Selecione um evento</option>
					{events.data.map((event) => (
						<option key={event.eventId} value={event.eventId}>
							{event.name ?? event.eventId}
						</option>
					))}
				</select>
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
								<th>Ticket</th>
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
									<td>{item.ticket_name ?? item.ticket_id}</td>
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
	const notify = (next: Exclude<Notice, null>) => {
		setNotice(next);
		window.setTimeout(() => setNotice(null), 4500);
	};
	const openEvent = (next: EventSummary) => {
		setEvent(next);
		setPage("event");
	};
	const openNewEvent = () => setPage("new-event");
	useEffect(() => {
		if (!event) return;
		const socket = new WebSocket(wsUrl(event.eventId));
		socket.onmessage = () => {
			/* the event page polls after mutations; this keeps LAN updates visible */
		};
		return () => socket.close();
	}, [event]);
	const content =
		page === "dashboard" ? (
			<Dashboard onOpenEvent={openEvent} onOpenNewEvent={openNewEvent} notify={notify} />
		) : page === "event" && event ? (
			<EventPage
				event={event}
				onBack={() => setPage("dashboard")}
				notify={notify}
			/>
		) : page === "import" ? (
			<ImportPage notify={notify} onDone={(created) => created ? openEvent(created) : setPage("dashboard")} />
		) : page === "new-event" ? (
			<ImportPage notify={notify} isNewEvent onDone={(created) => created ? openEvent(created) : setPage("dashboard")} />
		) : (
			<AuditPage />
		);
	return (
		<Shell
			page={page}
			setPage={(next) => {
				setPage(next);
				if (next !== "event") setEvent(null);
			}}
		>
			<Notice notice={notice} onClose={() => setNotice(null)} />
			{content}
		</Shell>
	);
}
