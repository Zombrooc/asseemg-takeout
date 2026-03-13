use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        Multipart, Path, Query, State,
    },
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::api::db::DbPool;
use crate::api::repository::{
    CreateLegacyParticipantError, EventLogRepository, EventsRepository,
    LegacyParticipantSearchMode, LegacyRepository, LocksRepository, PairingRepository,
    ParticipantSearchMode, ParticipantsRepository, TakeoutRepository, UpdateLegacyParticipantError,
    UpdateParticipantError,
};
use crate::api::services::takeout::{ConfirmConflictBody, ConfirmError, TakeoutService, UndoError};
use crate::api::services::{PairingError, PairingService};
use crate::api::thevent;
use crate::api::ws::WsRegistry;

#[derive(Clone)]
pub struct AppState {
    pub pool: Arc<DbPool>,
    pub base_url: String,
    pub ws_registry: Arc<WsRegistry>,
}

fn decode_windows_1252(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| match byte {
            0x80 => '\u{20AC}',
            0x81 => '\u{0081}',
            0x82 => '\u{201A}',
            0x83 => '\u{0192}',
            0x84 => '\u{201E}',
            0x85 => '\u{2026}',
            0x86 => '\u{2020}',
            0x87 => '\u{2021}',
            0x88 => '\u{02C6}',
            0x89 => '\u{2030}',
            0x8A => '\u{0160}',
            0x8B => '\u{2039}',
            0x8C => '\u{0152}',
            0x8D => '\u{008D}',
            0x8E => '\u{017D}',
            0x8F => '\u{008F}',
            0x90 => '\u{0090}',
            0x91 => '\u{2018}',
            0x92 => '\u{2019}',
            0x93 => '\u{201C}',
            0x94 => '\u{201D}',
            0x95 => '\u{2022}',
            0x96 => '\u{2013}',
            0x97 => '\u{2014}',
            0x98 => '\u{02DC}',
            0x99 => '\u{2122}',
            0x9A => '\u{0161}',
            0x9B => '\u{203A}',
            0x9C => '\u{0153}',
            0x9D => '\u{009D}',
            0x9E => '\u{017E}',
            0x9F => '\u{0178}',
            _ => char::from(*byte),
        })
        .collect()
}

fn mojibake_score(value: &str) -> usize {
    value
        .chars()
        .filter(|ch| matches!(ch, 'Ã' | 'Â' | '�'))
        .count()
}

fn try_decode_latin1ish_as_utf8(value: &str) -> Option<String> {
    let mut bytes = Vec::<u8>::with_capacity(value.len());
    for ch in value.chars() {
        let code = ch as u32;
        if code > 0xFF {
            return None;
        }
        bytes.push(code as u8);
    }
    std::str::from_utf8(&bytes).ok().map(|decoded| decoded.to_string())
}

fn repair_mojibake_conservative(value: &str) -> String {
    let mut current = value.to_string();
    for _ in 0..3 {
        let Some(repaired) = try_decode_latin1ish_as_utf8(&current) else {
            break;
        };
        if repaired == current {
            break;
        }
        if mojibake_score(&repaired) >= mojibake_score(&current) {
            break;
        }
        current = repaired;
    }
    current
}

fn decode_utf8_or_windows_1252(bytes: &[u8]) -> String {
    let decoded = match std::str::from_utf8(bytes) {
        Ok(value) => value.to_string(),
        Err(_) => decode_windows_1252(bytes),
    };
    repair_mojibake_conservative(&decoded)
}

pub fn router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health))
        .route("/network/addresses", get(network_addresses))
        .route("/pair/info", get(pair_info))
        .route("/pair/renew", post(pair_renew))
        .route("/pair", post(pair))
        .route("/participants/:id", get(participants_get))
        .route("/events", get(events_list))
        .route("/events/:event_id/participants", get(events_participants))
        .route(
            "/events/:event_id/participants/:participant_id",
            put(events_participants_update),
        )
        .route(
            "/events/:event_id/participants/search",
            get(events_participants_search),
        )
        .route(
            "/events/:event_id/checkins/reset",
            post(events_checkins_reset),
        )
        .route("/takeout/undo", post(takeout_undo))
        .route("/takeout/undo/legacy", post(takeout_undo_legacy))
        .route("/events/:event_id/archive", post(events_archive))
        .route("/events/:event_id/unarchive", post(events_unarchive))
        .route("/events/:event_id", delete(events_delete))
        .route("/takeout/confirm", post(takeout_confirm))
        .route("/ws", get(ws_handler))
        .route("/locks", post(locks_acquire))
        .route("/locks/renew", post(locks_renew))
        .route(
            "/locks/:participant_id",
            get(locks_status).delete(locks_release),
        )
        .route("/audit", get(audit))
        .route("/admin/import", post(admin_import))
        .route("/admin/import/legacy-csv", post(admin_import_legacy_csv))
        .route("/sync/pull", get(sync_pull))
        .route("/sync/events", get(sync_events))
        .route("/sync/import", post(sync_import))
        .route("/sync/push", post(sync_push))
        .route(
            "/events/:event_id/legacy-participants",
            get(events_legacy_participants).post(events_legacy_participants_create),
        )
        .route(
            "/events/:event_id/legacy-participants/:participant_id",
            put(events_legacy_participants_update),
        )
        .route(
            "/events/:event_id/legacy-participants/search",
            get(events_legacy_participants_search),
        )
        .route(
            "/events/:event_id/legacy-reservations",
            get(events_legacy_reservations).post(events_legacy_reservations_create),
        )
        .route("/takeout/confirm/legacy", post(takeout_confirm_legacy))
        .route("/audit/legacy", get(audit_legacy))
        .layer(cors)
        .with_state(state)
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkAddressInfo {
    interface_name: String,
    ip: String,
    url: String,
    is_primary: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkAddressesResponse {
    base_url: String,
    port: u16,
    addresses: Vec<NetworkAddressInfo>,
}

fn parse_base_url_host_port(base_url: &str) -> (Option<String>, u16) {
    match base_url.parse::<axum::http::Uri>() {
        Ok(uri) => (uri.host().map(String::from), uri.port_u16().unwrap_or(5555)),
        Err(_) => (None, 5555),
    }
}

async fn network_addresses(State(state): State<AppState>) -> impl IntoResponse {
    let (primary_host, port) = parse_base_url_host_port(&state.base_url);
    let mut by_ip: std::collections::BTreeMap<String, String> = std::collections::BTreeMap::new();
    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        for (interface_name, ip) in interfaces {
            if let std::net::IpAddr::V4(ipv4) = ip {
                if ipv4.is_loopback() {
                    continue;
                }
                let ip_str = ipv4.to_string();
                by_ip
                    .entry(ip_str)
                    .and_modify(|existing_name| {
                        if interface_name < *existing_name {
                            *existing_name = interface_name.clone();
                        }
                    })
                    .or_insert(interface_name);
            }
        }
    }

    let mut addresses = by_ip
        .into_iter()
        .map(|(ip, interface_name)| NetworkAddressInfo {
            url: format!("http://{}:{}", ip, port),
            is_primary: primary_host
                .as_deref()
                .map(|host| host == ip)
                .unwrap_or(false),
            interface_name,
            ip,
        })
        .collect::<Vec<_>>();
    addresses.sort_by(|a, b| {
        a.interface_name
            .cmp(&b.interface_name)
            .then(a.ip.cmp(&b.ip))
    });

    (
        StatusCode::OK,
        Json(NetworkAddressesResponse {
            base_url: state.base_url,
            port,
            addresses,
        }),
    )
}

async fn pair_info(State(state): State<AppState>) -> impl IntoResponse {
    match PairingService::get_info(state.pool.clone(), state.base_url.clone()) {
        Ok(info) => (StatusCode::OK, Json(info)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
    }
}

async fn pair_renew(State(state): State<AppState>) -> impl IntoResponse {
    match PairingService::renew(state.pool.clone(), state.base_url.clone()) {
        Ok(info) => (StatusCode::OK, Json(info)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
struct PairBody {
    device_id: String,
    pairing_token: String,
    operator_alias: Option<String>,
}

async fn pair(State(state): State<AppState>, Json(body): Json<PairBody>) -> impl IntoResponse {
    let Some(operator_alias) = body.operator_alias.map(|v| v.trim().to_string()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
              "error": "operator_alias is required",
              "code": "OPERATOR_ALIAS_REQUIRED"
            })),
        )
            .into_response();
    };
    if operator_alias.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
              "error": "operator_alias is required",
              "code": "OPERATOR_ALIAS_REQUIRED"
            })),
        )
            .into_response();
    }
    match PairingService::pair(
        state.pool.clone(),
        body.device_id,
        body.pairing_token,
        operator_alias,
    ) {
        Ok(access_token) => (
            StatusCode::OK,
            Json(serde_json::json!({ "access_token": access_token })),
        )
            .into_response(),
        Err(PairingError::PairingTokenInvalid) => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
              "error": "invalid pairing token",
              "code": "PAIRING_TOKEN_INVALID"
            })),
        )
            .into_response(),
        Err(PairingError::PairingTokenExpired) => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
              "error": "expired pairing token",
              "code": "PAIRING_TOKEN_EXPIRED"
            })),
        )
            .into_response(),
        Err(PairingError::OperatorAliasRequired) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
              "error": "operator_alias is required",
              "code": "OPERATOR_ALIAS_REQUIRED"
            })),
        )
            .into_response(),
        Err(PairingError::Storage(e)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e, "code": "PAIRING_INTERNAL_ERROR" })),
        )
            .into_response(),
    }
}

async fn participants_get(
    State(state): State<AppState>,
    _headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    use crate::api::repository::ParticipantsRepository;
    match ParticipantsRepository::get_by_id(&state.pool, &id) {
        Ok(Some(p)) => (
            StatusCode::OK,
            Json(serde_json::json!({
              "id": p.id,
              "name": p.name,
              "cpf": p.cpf,
              "birth_date": p.birth_date,
            })),
        )
            .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "not found" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

fn bearer_token(headers: &HeaderMap) -> Option<String> {
    let v = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    v.strip_prefix("Bearer ").map(String::from)
}

fn resolve_operator_identity(
    pool: &DbPool,
    headers: &HeaderMap,
    payload_device_id: &str,
) -> (String, Option<String>) {
    let token = bearer_token(headers);
    if let Some(access_token) = token {
        if let Ok(Some((paired_device_id, operator_alias))) =
            PairingRepository::find_device_by_token(pool, &access_token)
        {
            return (paired_device_id, operator_alias);
        }
    }
    (payload_device_id.to_string(), None)
}

#[derive(serde::Deserialize)]
struct EventsListQuery {
    #[serde(rename = "includeArchived")]
    include_archived: Option<bool>,
}

async fn events_list(
    State(state): State<AppState>,
    Query(q): Query<EventsListQuery>,
) -> impl IntoResponse {
    let include_archived = q.include_archived.unwrap_or(false);
    match EventsRepository::list_events(&state.pool, include_archived) {
        Ok(events) => (StatusCode::OK, Json(events)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("{}", e) })),
        )
            .into_response(),
    }
}

const EVENTS_LIST_CHANNEL: &str = "_events";

fn broadcast_events_list_changed(state: &AppState) {
    let msg = serde_json::json!({ "type": "events_list_changed" }).to_string();
    state.ws_registry.broadcast(EVENTS_LIST_CHANNEL, &msg);
}

fn broadcast_participant_updated(
    state: &AppState,
    event_id: &str,
    participant_id: &str,
    ticket_id: Option<&str>,
    source_type: &str,
) {
    println!(
        "[ws.broadcast] type=participant_updated event_id={} participant_id={} ticket_id={} source_type={} ws_channel={} broadcast_ok=true",
        event_id,
        participant_id,
        ticket_id.unwrap_or_default(),
        source_type,
        event_id
    );
    let msg = serde_json::json!({
      "type": "participant_updated",
      "event_id": event_id,
      "participant_id": participant_id,
      "ticket_id": ticket_id,
      "source_type": source_type
    })
    .to_string();
    state.ws_registry.broadcast(event_id, &msg);
}

fn broadcast_participant_checked_in(
    state: &AppState,
    event_id: &str,
    ticket_id: Option<&str>,
    request_id: Option<&str>,
    participant_id: Option<&str>,
    device_id: Option<&str>,
    source_type: &str,
) {
    println!(
        "[ws.broadcast] type=participant_checked_in event_id={} participant_id={} ticket_id={} source_type={} ws_channel={} broadcast_ok=true",
        event_id,
        participant_id.unwrap_or_default(),
        ticket_id.unwrap_or_default(),
        source_type,
        event_id
    );
    let msg = serde_json::json!({
      "type": "participant_checked_in",
      "event_id": event_id,
      "ticket_id": ticket_id,
      "request_id": request_id,
      "participant_id": participant_id,
      "device_id": device_id,
      "source_type": source_type
    })
    .to_string();
    state.ws_registry.broadcast(event_id, &msg);
}

fn broadcast_participant_checkin_reverted(
    state: &AppState,
    event_id: &str,
    ticket_id: Option<&str>,
    request_id: Option<&str>,
    participant_id: Option<&str>,
    device_id: Option<&str>,
    source_type: &str,
) {
    println!(
        "[ws.broadcast] type=participant_checkin_reverted event_id={} participant_id={} ticket_id={} source_type={} ws_channel={} broadcast_ok=true",
        event_id,
        participant_id.unwrap_or_default(),
        ticket_id.unwrap_or_default(),
        source_type,
        event_id
    );
    let msg = serde_json::json!({
      "type": "participant_checkin_reverted",
      "event_id": event_id,
      "ticket_id": ticket_id,
      "request_id": request_id,
      "participant_id": participant_id,
      "device_id": device_id,
      "source_type": source_type
    })
    .to_string();
    state.ws_registry.broadcast(event_id, &msg);
}

async fn events_archive(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> impl IntoResponse {
    match EventsRepository::archive_event(&state.pool, &event_id) {
        Ok(n) => {
            if n > 0 {
                broadcast_events_list_changed(&state);
            }
            (
                StatusCode::OK,
                Json(serde_json::json!({ "archived": n > 0 })),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn events_unarchive(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> impl IntoResponse {
    match EventsRepository::unarchive_event(&state.pool, &event_id) {
        Ok(n) => {
            if n > 0 {
                broadcast_events_list_changed(&state);
            }
            (
                StatusCode::OK,
                Json(serde_json::json!({ "unarchived": n > 0 })),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn events_delete(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> impl IntoResponse {
    match EventsRepository::delete_event(&state.pool, &event_id) {
        Ok(()) => {
            broadcast_events_list_changed(&state);
            (StatusCode::OK, Json(serde_json::json!({ "deleted": true }))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn events_participants(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> impl IntoResponse {
    match EventsRepository::list_participants_by_event(&state.pool, &event_id) {
        Ok(participants) => (StatusCode::OK, Json(participants)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("{}", e) })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ParticipantEditPayload {
    name: String,
    cpf: String,
    birth_date: String,
    ticket_type: String,
    #[serde(default)]
    shirt_size: Option<String>,
    #[serde(default)]
    team: Option<String>,
}

fn is_valid_birth_date(value: &str) -> bool {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}

fn validate_edit_payload(payload: &ParticipantEditPayload) -> Result<(), String> {
    if payload.name.trim().is_empty() {
        return Err("name is required".to_string());
    }
    if payload.birth_date.trim().is_empty() {
        return Err("birthDate is required".to_string());
    }
    if !is_valid_birth_date(payload.birth_date.trim()) {
        return Err("birthDate must be YYYY-MM-DD".to_string());
    }
    if payload.ticket_type.trim().is_empty() {
        return Err("ticketType is required".to_string());
    }
    Ok(())
}

async fn events_participants_update(
    State(state): State<AppState>,
    Path((event_id, participant_id)): Path<(String, String)>,
    Json(payload): Json<ParticipantEditPayload>,
) -> impl IntoResponse {
    if let Err(msg) = validate_edit_payload(&payload) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response();
    }

    match ParticipantsRepository::update_event_participant(
        &state.pool,
        &event_id,
        &participant_id,
        payload.name.trim(),
        payload.cpf.trim(),
        payload.birth_date.trim(),
        payload.ticket_type.trim(),
        payload.shirt_size.as_deref().unwrap_or("").trim(),
        payload.team.as_deref().unwrap_or("").trim(),
    ) {
        Ok(updated) => {
            println!(
                "[participant.update] source_type=json_sync event_id={} participant_id={} ticket_id={} ws_channel={}",
                event_id,
                updated.id,
                updated.ticket_id,
                event_id
            );
            let payload_json = serde_json::json!({
              "participant_id": updated.id.clone(),
              "ticket_id": updated.ticket_id.clone(),
              "source_type": "json_sync"
            })
            .to_string();
            let _ = EventLogRepository::insert(
                &state.pool,
                &event_id,
                "participant_updated",
                Some(&payload_json),
            );
            broadcast_participant_updated(
                &state,
                &event_id,
                &updated.id,
                Some(&updated.ticket_id),
                "json_sync",
            );
            (StatusCode::OK, Json(updated)).into_response()
        },
        Err(UpdateParticipantError::NotFound) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "participant not found" })),
        )
            .into_response(),
        Err(UpdateParticipantError::AlreadyCheckedIn) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "error": "participant already checked in" })),
        )
            .into_response(),
        Err(UpdateParticipantError::Db(e)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
struct EventsParticipantsSearchQuery {
    q: Option<String>,
    mode: Option<String>,
}

async fn events_participants_search(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Query(q): Query<EventsParticipantsSearchQuery>,
) -> impl IntoResponse {
    let query = q.q.unwrap_or_default();
    let query_trimmed = query.trim().to_string();
    if query_trimmed.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "q is required" })),
        )
            .into_response();
    }

    let mode = q.mode.unwrap_or_default();
    let Some(search_mode) = ParticipantSearchMode::from_str(mode.trim()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid mode" })),
        )
            .into_response();
    };

    match ParticipantsRepository::search_by_event(
        &state.pool,
        &event_id,
        &query_trimmed,
        search_mode,
    ) {
        Ok(participants) => (StatusCode::OK, Json(participants)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("{}", e) })),
        )
            .into_response(),
    }
}

async fn events_checkins_reset(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> impl IntoResponse {
    match TakeoutRepository::delete_by_event_id(&state.pool, &event_id) {
        Ok(deleted) => (
            StatusCode::OK,
            Json(serde_json::json!({ "deleted": deleted })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("{}", e) })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct WsQuery {
    event_id: String,
    device_id: Option<String>,
    last_seq: Option<String>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(q): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let event_id = q.event_id.clone();
    let registry = state.ws_registry.clone();
    let pool = state.pool.clone();
    let last_seq = q.last_seq.as_deref().and_then(|s| s.parse::<i64>().ok());
    ws.on_upgrade(move |socket| handle_ws_socket(socket, event_id, registry, pool, last_seq))
}

fn load_replay_messages(pool: &DbPool, event_id: &str, last_seq: i64) -> Vec<String> {
    match EventLogRepository::list_since(pool, event_id, last_seq) {
        Ok(events) => events
            .into_iter()
            .map(|ev| {
                let mut payload = serde_json::json!({
                    "type": ev.kind,
                    "event_id": ev.event_id,
                    "seq": ev.seq,
                    "created_at": ev.created_at,
                });
                if let Some(raw) = ev.payload_json.as_deref() {
                    if let Ok(extra) = serde_json::from_str::<serde_json::Value>(raw) {
                        if let (Some(obj), Some(extra_obj)) =
                            (payload.as_object_mut(), extra.as_object())
                        {
                            for (k, v) in extra_obj {
                                obj.insert(k.clone(), v.clone());
                            }
                        }
                    }
                }
                payload.to_string()
            })
            .collect(),
        Err(_) => Vec::new(),
    }
}

async fn handle_ws_socket(
    socket: WebSocket,
    event_id: String,
    registry: Arc<WsRegistry>,
    pool: Arc<DbPool>,
    last_seq: Option<i64>,
) {
    let (id, mut rx) = registry.register(event_id.clone());
    let mut socket = socket;
    if let Some(since) = last_seq {
        let replay_messages = load_replay_messages(&pool, &event_id, since);
        for msg in replay_messages {
            if socket.send(axum::extract::ws::Message::Text(msg.into())).await.is_err() {
                registry.unregister(&event_id, id);
                return;
            }
        }
    }
    let mut heartbeat = tokio::time::interval(std::time::Duration::from_secs(30));
    loop {
        tokio::select! {
          msg = rx.recv() => {
            let Some(msg) = msg else {
              break;
            };
            if socket.send(axum::extract::ws::Message::Text(msg)).await.is_err() {
              break;
            }
          }
          _ = heartbeat.tick() => {
            let heartbeat_msg = serde_json::json!({
              "type": "heartbeat",
              "sentAt": chrono::Utc::now().timestamp_millis(),
            })
            .to_string();
            if socket.send(axum::extract::ws::Message::Text(heartbeat_msg)).await.is_err() {
              break;
            }
          }
        }
    }
    registry.unregister(&event_id, id);
}

#[derive(serde::Deserialize)]
struct LockBody {
    #[serde(rename = "participantId")]
    participant_id: String,
    #[serde(rename = "deviceId")]
    device_id: String,
}

async fn locks_acquire(
    State(state): State<AppState>,
    Json(body): Json<LockBody>,
) -> impl IntoResponse {
    match LocksRepository::acquire(&state.pool, &body.participant_id, &body.device_id) {
        Ok(crate::api::repository::AcquireResult::Acquired) => {
            if let Ok(Some(ev_id)) = ParticipantsRepository::get_event_id_by_participant_id(
                &state.pool,
                &body.participant_id,
            ) {
                let payload_json = serde_json::json!({
                  "participant_id": body.participant_id,
                  "device_id": body.device_id
                })
                .to_string();
                let _ = EventLogRepository::insert(
                    &state.pool,
                    &ev_id,
                    "lock_acquired",
                    Some(&payload_json),
                );
                let msg = serde_json::json!({
                  "type": "lock_acquired",
                  "participant_id": body.participant_id,
                  "device_id": body.device_id
                });
                state.ws_registry.broadcast(&ev_id, &msg.to_string());
            }
            (
                StatusCode::OK,
                Json(serde_json::json!({ "acquired": true })),
            )
                .into_response()
        }
        Ok(crate::api::repository::AcquireResult::AlreadyHeldBy { device_id: held_by }) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "acquired": false, "heldBy": held_by })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn locks_renew(
    State(state): State<AppState>,
    Json(body): Json<LockBody>,
) -> impl IntoResponse {
    match LocksRepository::renew(&state.pool, &body.participant_id, &body.device_id) {
        Ok(true) => (StatusCode::OK, Json(serde_json::json!({ "renewed": true }))).into_response(),
        Ok(false) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "renewed": false })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
struct LocksReleaseQuery {
    #[serde(rename = "deviceId")]
    device_id: Option<String>,
}

async fn locks_status(
    State(state): State<AppState>,
    Path(participant_id): Path<String>,
) -> impl IntoResponse {
    match LocksRepository::get_holder(&state.pool, &participant_id) {
        Ok(Some((device_id, expires_at))) => (
            StatusCode::OK,
            Json(serde_json::json!({ "heldBy": device_id, "expiresAt": expires_at })),
        )
            .into_response(),
        Ok(None) => (
            StatusCode::OK,
            Json(serde_json::json!({ "heldBy": null, "expiresAt": null })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn locks_release(
    State(state): State<AppState>,
    Path(participant_id): Path<String>,
    Query(q): Query<LocksReleaseQuery>,
) -> impl IntoResponse {
    let device_id = q.device_id.as_deref();
    match LocksRepository::release(&state.pool, &participant_id, device_id) {
        Ok(n) if n > 0 => {
            if let Ok(Some(ev_id)) =
                ParticipantsRepository::get_event_id_by_participant_id(&state.pool, &participant_id)
            {
                let payload_json = serde_json::json!({
                  "participant_id": participant_id,
                  "device_id": device_id.unwrap_or_default()
                })
                .to_string();
                let _ = EventLogRepository::insert(
                    &state.pool,
                    &ev_id,
                    "lock_released",
                    Some(&payload_json),
                );
                let msg = serde_json::json!({
                  "type": "lock_released",
                  "participant_id": participant_id
                });
                state.ws_registry.broadcast(&ev_id, &msg.to_string());
            }
            (
                StatusCode::OK,
                Json(serde_json::json!({ "released": true })),
            )
                .into_response()
        }
        _ => (
            StatusCode::OK,
            Json(serde_json::json!({ "released": false })),
        )
            .into_response(),
    }
}

async fn takeout_confirm(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<crate::api::services::takeout::ConfirmTakeoutPayload>,
) -> impl IntoResponse {
    let (device_id, operator_alias) =
        resolve_operator_identity(&state.pool, &headers, &payload.device_id);
    match TakeoutService::confirm(state.pool.clone(), device_id, operator_alias, payload.clone()) {
        Ok(r) => {
            if r.status == "CONFIRMED" {
                if let Ok(Some(ev_id)) = ParticipantsRepository::get_event_id_by_ticket_id(
                    &state.pool,
                    &payload.ticket_id,
                ) {
                    let payload_json = serde_json::json!({
                      "ticket_id": payload.ticket_id.clone(),
                      "request_id": payload.request_id.clone(),
                      "event_id": ev_id,
                      "source_type": "json_sync"
                    })
                    .to_string();
                    let _ = EventLogRepository::insert(
                        &state.pool,
                        &ev_id,
                        "participant_checked_in",
                        Some(&payload_json),
                    );
                    broadcast_participant_checked_in(
                        &state,
                        &ev_id,
                        Some(&payload.ticket_id),
                        Some(&payload.request_id),
                        None,
                        None,
                        "json_sync",
                    );
                }
            }
            (StatusCode::OK, Json(r)).into_response()
        }
        Err(ConfirmError::Conflict {
            existing_request_id,
            ticket_id,
        }) => (
            StatusCode::CONFLICT,
            Json(ConfirmConflictBody {
                status: "CONFLICT".to_string(),
                existing_request_id,
                ticket_id,
            }),
        )
            .into_response(),
        Err(ConfirmError::Validation(e)) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e, "status": "FAILED" })),
        )
            .into_response(),
    }
}

async fn takeout_undo(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<crate::api::services::takeout::UndoTakeoutPayload>,
) -> impl IntoResponse {
    let (device_id, operator_alias) =
        resolve_operator_identity(&state.pool, &headers, &payload.device_id);
    match TakeoutService::undo(state.pool.clone(), device_id, operator_alias, payload.clone()) {
        Ok(r) => {
            if r.status == "REVERSED" {
                if let Ok(Some(ev_id)) = ParticipantsRepository::get_event_id_by_ticket_id(
                    &state.pool,
                    &payload.ticket_id,
                ) {
                    let payload_json = serde_json::json!({
                      "ticket_id": payload.ticket_id.clone(),
                      "request_id": payload.request_id.clone(),
                      "event_id": ev_id,
                      "source_type": "json_sync"
                    })
                    .to_string();
                    let _ = EventLogRepository::insert(
                        &state.pool,
                        &ev_id,
                        "participant_checkin_reverted",
                        Some(&payload_json),
                    );
                    broadcast_participant_checkin_reverted(
                        &state,
                        &ev_id,
                        Some(&payload.ticket_id),
                        Some(&payload.request_id),
                        None,
                        None,
                        "json_sync",
                    );
                }
            }
            (StatusCode::OK, Json(r)).into_response()
        }
        Err(UndoError::NotCheckedIn) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
              "error": "ticket not checked in",
              "status": "FAILED"
            })),
        )
            .into_response(),
        Err(UndoError::Validation(e)) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e, "status": "FAILED" })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
struct AuditQuery {
    #[serde(rename = "eventId")]
    event_id: Option<String>,
    status: Option<String>,
    from: Option<String>,
    to: Option<String>,
}

async fn audit(State(state): State<AppState>, Query(q): Query<AuditQuery>) -> impl IntoResponse {
    let Some(event_id) = q.event_id.filter(|v| !v.is_empty()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "eventId required" })),
        )
            .into_response();
    };
    let from_ts = q.from.and_then(|s| s.parse::<i64>().ok());
    let to_ts = q.to.and_then(|s| s.parse::<i64>().ok());
    match TakeoutService::list_audit(&state.pool, &event_id, q.status.clone(), from_ts, to_ts) {
        Ok(mut events) => {
            match LegacyRepository::list_audit_enriched(&state.pool, &event_id, q.status.as_deref())
            {
                Ok(mut legacy_events) => {
                    events.append(&mut legacy_events);
                    events.sort_by(|a, b| b.checked_in_at.cmp(&a.checked_in_at));
                    (StatusCode::OK, Json(events)).into_response()
                }
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
                    .into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
    }
}

async fn admin_import(
    State(_state): State<AppState>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut imported = 0i32;
    let errors = Vec::<String>::new();
    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() != Some("file") {
            continue;
        }
        if let Ok(data) = field.bytes().await {
            let s = decode_utf8_or_windows_1252(&data);
            let lines: Vec<&str> = s.lines().filter(|l| !l.is_empty()).collect();
            imported = (lines.len().saturating_sub(1)) as i32; // header row
        }
    }
    (
        StatusCode::OK,
        Json(serde_json::json!({ "imported": imported, "errors": errors })),
    )
        .into_response()
}

async fn admin_import_legacy_csv(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut event_id: Option<String> = None;
    let mut event_name: Option<String> = None;
    let mut event_start_date: Option<String> = None;
    let mut csv_content: Option<String> = None;
    while let Ok(Some(field)) = multipart.next_field().await {
        match field.name() {
            Some("eventId") => {
                event_id = field.text().await.ok().map(|v| v.trim().to_string());
            }
            Some("eventName") => {
                event_name = field.text().await.ok().map(|v| v.trim().to_string());
            }
            Some("eventStartDate") => {
                event_start_date = field.text().await.ok().map(|v| v.trim().to_string());
            }
            Some("file") => {
                csv_content = field
                    .bytes()
                    .await
                    .ok()
                    .map(|v| decode_utf8_or_windows_1252(&v));
            }
            _ => {}
        }
    }
    let event_id = event_id
        .filter(|v| !v.is_empty())
        .unwrap_or_else(cuid2::create_id);
    let Some(event_name) = event_name.filter(|v| !v.is_empty()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "eventName is required" })),
        )
            .into_response();
    };
    let Some(event_start_date) = event_start_date.filter(|v| !v.is_empty()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "eventStartDate is required" })),
        )
            .into_response();
    };
    let Some(csv_content) = csv_content else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "file is required" })),
        )
            .into_response();
    };
    match LegacyRepository::import_csv(
        &state.pool,
        &event_id,
        &event_name,
        &event_start_date,
        &csv_content,
    ) {
        Ok(result) => {
            if result.imported > 0 {
                broadcast_events_list_changed(&state);
            }
            (StatusCode::OK, Json(result)).into_response()
        },
        Err(e) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
    }
}

async fn events_legacy_participants(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> impl IntoResponse {
    match LegacyRepository::list_participants_by_event(&state.pool, &event_id) {
        Ok(participants) => (StatusCode::OK, Json(participants)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyReserveNumberItem {
    bib_number: i64,
    #[serde(default)]
    label: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyReserveNumbersPayload {
    numbers: Vec<LegacyReserveNumberItem>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyReservationsQuery {
    include_used: Option<bool>,
}

async fn events_legacy_reservations(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Query(q): Query<LegacyReservationsQuery>,
) -> impl IntoResponse {
    let include_used = q.include_used.unwrap_or(false);
    match LegacyRepository::list_reserved_numbers(&state.pool, &event_id, include_used) {
        Ok(reservations) => (StatusCode::OK, Json(reservations)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn events_legacy_reservations_create(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Json(payload): Json<LegacyReserveNumbersPayload>,
) -> impl IntoResponse {
    if payload.numbers.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "numbers is required" })),
        )
            .into_response();
    }
    let items = payload
        .numbers
        .into_iter()
        .map(|item| (item.bib_number, item.label.filter(|v| !v.trim().is_empty())))
        .collect::<Vec<_>>();
    match LegacyRepository::reserve_numbers(&state.pool, &event_id, &items) {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyCreateParticipantPayload {
    reservation_id: i64,
    name: String,
    cpf: String,
    birth_date: String,
    ticket_type: String,
    #[serde(default)]
    shirt_size: Option<String>,
    #[serde(default)]
    team: Option<String>,
    #[serde(default)]
    sex: Option<String>,
}

async fn events_legacy_participants_create(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Json(payload): Json<LegacyCreateParticipantPayload>,
) -> impl IntoResponse {
    if payload.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "name is required" })),
        )
            .into_response();
    }
    if payload.cpf.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "cpf is required" })),
        )
            .into_response();
    }
    if payload.birth_date.trim().is_empty() || !is_valid_birth_date(payload.birth_date.trim()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "birthDate must be YYYY-MM-DD" })),
        )
            .into_response();
    }
    if payload.ticket_type.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "ticketType is required" })),
        )
            .into_response();
    }
    if payload.reservation_id <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "reservationId is required" })),
        )
            .into_response();
    }

    match LegacyRepository::create_manual_participant(
        &state.pool,
        &event_id,
        payload.reservation_id,
        payload.name.trim(),
        payload.cpf.trim(),
        payload.birth_date.trim(),
        payload.ticket_type.trim(),
        payload.shirt_size.as_deref().unwrap_or("").trim(),
        payload.team.as_deref().unwrap_or("").trim(),
        payload
            .sex
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty()),
    ) {
        Ok(created) => {
            println!(
                "[participant.update] source_type=legacy_csv event_id={} participant_id={} ticket_id={} ws_channel={}",
                event_id, created.id, created.id, event_id
            );
            let payload_json = serde_json::json!({
              "participant_id": created.id.clone(),
              "ticket_id": created.id.clone(),
              "source_type": "legacy_csv"
            })
            .to_string();
            let _ = EventLogRepository::insert(
                &state.pool,
                &event_id,
                "participant_updated",
                Some(&payload_json),
            );
            broadcast_participant_updated(
                &state,
                &event_id,
                &created.id,
                Some(&created.id),
                "legacy_csv",
            );
            (StatusCode::OK, Json(created)).into_response()
        }
        Err(CreateLegacyParticipantError::ReservationNotFound) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "reservation not found" })),
        )
            .into_response(),
        Err(CreateLegacyParticipantError::ReservationUnavailable) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "error": "reservation unavailable" })),
        )
            .into_response(),
        Err(CreateLegacyParticipantError::BibAlreadyUsed) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "error": "bib already used" })),
        )
            .into_response(),
        Err(CreateLegacyParticipantError::ParticipantExists) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "error": "participant already exists" })),
        )
            .into_response(),
        Err(CreateLegacyParticipantError::Db(e)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn events_legacy_participants_update(
    State(state): State<AppState>,
    Path((event_id, participant_id)): Path<(String, String)>,
    Json(payload): Json<ParticipantEditPayload>,
) -> impl IntoResponse {
    if let Err(msg) = validate_edit_payload(&payload) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response();
    }

    match LegacyRepository::update_event_participant(
        &state.pool,
        &event_id,
        &participant_id,
        payload.name.trim(),
        payload.cpf.trim(),
        payload.birth_date.trim(),
        payload.ticket_type.trim(),
        payload.shirt_size.as_deref().unwrap_or("").trim(),
        payload.team.as_deref().unwrap_or("").trim(),
    ) {
        Ok(updated) => {
            println!(
                "[participant.update] source_type=legacy_csv event_id={} participant_id={} ticket_id={} ws_channel={}",
                event_id,
                updated.id,
                updated.id,
                event_id
            );
            let payload_json = serde_json::json!({
              "participant_id": updated.id.clone(),
              "ticket_id": updated.id.clone(),
              "source_type": "legacy_csv"
            })
            .to_string();
            let _ = EventLogRepository::insert(
                &state.pool,
                &event_id,
                "participant_updated",
                Some(&payload_json),
            );
            broadcast_participant_updated(
                &state,
                &event_id,
                &updated.id,
                Some(&updated.id),
                "legacy_csv",
            );
            (StatusCode::OK, Json(updated)).into_response()
        },
        Err(UpdateLegacyParticipantError::NotFound) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "participant not found" })),
        )
            .into_response(),
        Err(UpdateLegacyParticipantError::AlreadyCheckedIn) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "error": "participant already checked in" })),
        )
            .into_response(),
        Err(UpdateLegacyParticipantError::Db(e)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
struct LegacyParticipantsSearchQuery {
    q: Option<String>,
    mode: Option<String>,
}

async fn events_legacy_participants_search(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Query(q): Query<LegacyParticipantsSearchQuery>,
) -> impl IntoResponse {
    let query = q.q.unwrap_or_default();
    let query_trimmed = query.trim().to_string();
    if query_trimmed.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "q is required" })),
        )
            .into_response();
    }
    let mode = q.mode.unwrap_or_default();
    let Some(search_mode) = LegacyParticipantSearchMode::from_str(mode.trim()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid mode" })),
        )
            .into_response();
    };
    match LegacyRepository::search_participants_by_event(
        &state.pool,
        &event_id,
        &query_trimmed,
        search_mode,
    ) {
        Ok(participants) => (StatusCode::OK, Json(participants)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(Clone, serde::Deserialize)]
struct LegacyConfirmPayload {
    request_id: String,
    event_id: String,
    participant_id: String,
    device_id: String,
    #[serde(default)]
    payload_json: Option<String>,
}

async fn takeout_confirm_legacy(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<LegacyConfirmPayload>,
) -> impl IntoResponse {
    if payload.request_id.trim().is_empty()
        || payload.event_id.trim().is_empty()
        || payload.participant_id.trim().is_empty()
    {
        return (
      StatusCode::BAD_REQUEST,
      Json(serde_json::json!({ "error": "request_id, event_id and participant_id are required" })),
    )
      .into_response();
    }
    let (device_id, operator_alias) =
        resolve_operator_identity(&state.pool, &headers, &payload.device_id);
    match LegacyRepository::confirm_atomic(
        &state.pool,
        &payload.request_id,
        &payload.event_id,
        &payload.participant_id,
        &device_id,
        operator_alias.as_deref(),
        payload.payload_json.as_deref(),
    ) {
        Ok(crate::api::repository::ConfirmAtomicResult::Confirmed) => {
            println!(
                "[participant.confirm] source_type=legacy_csv event_id={} participant_id={} ticket_id={} ws_channel={}",
                payload.event_id,
                payload.participant_id,
                payload.participant_id,
                payload.event_id
            );
            let payload_json = serde_json::json!({
              "participant_id": payload.participant_id.clone(),
              "request_id": payload.request_id.clone(),
              "event_id": payload.event_id.clone(),
              "device_id": device_id.clone(),
              "source_type": "legacy_csv"
            })
            .to_string();
            let _ = EventLogRepository::insert(
                &state.pool,
                &payload.event_id,
                "participant_checked_in",
                Some(&payload_json),
            );
            broadcast_participant_checked_in(
                &state,
                &payload.event_id,
                Some(&payload.participant_id),
                Some(&payload.request_id),
                Some(&payload.participant_id),
                Some(&device_id),
                "legacy_csv",
            );
            (
                StatusCode::OK,
                Json(serde_json::json!({ "status": "CONFIRMED" })),
            )
                .into_response()
        },
        Ok(crate::api::repository::ConfirmAtomicResult::Duplicate) => (
            StatusCode::OK,
            Json(serde_json::json!({ "status": "DUPLICATE" })),
        )
            .into_response(),
        Ok(crate::api::repository::ConfirmAtomicResult::Conflict {
            existing_request_id,
        }) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
              "status": "CONFLICT",
              "existing_request_id": existing_request_id,
              "participant_id": payload.participant_id
            })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(Clone, serde::Deserialize)]
struct LegacyUndoPayload {
    request_id: String,
    event_id: String,
    participant_id: String,
    device_id: String,
    #[serde(default)]
    payload_json: Option<String>,
}

async fn takeout_undo_legacy(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<LegacyUndoPayload>,
) -> impl IntoResponse {
    if payload.request_id.trim().is_empty()
        || payload.event_id.trim().is_empty()
        || payload.participant_id.trim().is_empty()
    {
        return (
      StatusCode::BAD_REQUEST,
      Json(serde_json::json!({ "error": "request_id, event_id and participant_id are required" })),
    )
      .into_response();
    }
    let (device_id, operator_alias) =
        resolve_operator_identity(&state.pool, &headers, &payload.device_id);
    match LegacyRepository::undo_atomic(
        &state.pool,
        &payload.request_id,
        &payload.event_id,
        &payload.participant_id,
        &device_id,
        operator_alias.as_deref(),
        payload.payload_json.as_deref(),
    ) {
        Ok(crate::api::repository::UndoAtomicResult::Reversed) => {
            println!(
                "[participant.undo] source_type=legacy_csv event_id={} participant_id={} ticket_id={} ws_channel={}",
                payload.event_id,
                payload.participant_id,
                payload.participant_id,
                payload.event_id
            );
            let payload_json = serde_json::json!({
              "participant_id": payload.participant_id.clone(),
              "request_id": payload.request_id.clone(),
              "event_id": payload.event_id.clone(),
              "device_id": device_id.clone(),
              "source_type": "legacy_csv"
            })
            .to_string();
            let _ = EventLogRepository::insert(
                &state.pool,
                &payload.event_id,
                "participant_checkin_reverted",
                Some(&payload_json),
            );
            broadcast_participant_checkin_reverted(
                &state,
                &payload.event_id,
                Some(&payload.participant_id),
                Some(&payload.request_id),
                Some(&payload.participant_id),
                Some(&device_id),
                "legacy_csv",
            );
            (
                StatusCode::OK,
                Json(serde_json::json!({ "status": "REVERSED" })),
            )
                .into_response()
        }
        Ok(crate::api::repository::UndoAtomicResult::Duplicate) => (
            StatusCode::OK,
            Json(serde_json::json!({ "status": "DUPLICATE" })),
        )
            .into_response(),
        Ok(crate::api::repository::UndoAtomicResult::NotCheckedIn) => (
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "error": "participant not checked in", "status": "FAILED" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[cfg(test)]
mod ws_replay_tests {
    use super::load_replay_messages;
    use crate::api::db::DbPool;
    use crate::api::repository::EventLogRepository;

    #[test]
    fn replay_loads_participant_updated_after_since_seq() {
        let pool = DbPool::open_in_memory().unwrap();
        let event_id = "ev-replay";
        let first_seq = EventLogRepository::insert(
            &pool,
            event_id,
            "participant_updated",
            Some(r#"{"participant_id":"p1","ticket_id":"t1","source_type":"json_sync"}"#),
        )
        .unwrap();
        let _second_seq = EventLogRepository::insert(
            &pool,
            event_id,
            "participant_updated",
            Some(r#"{"participant_id":"p2","ticket_id":"t2","source_type":"json_sync"}"#),
        )
        .unwrap();

        let replay = load_replay_messages(&pool, event_id, first_seq);
        assert_eq!(replay.len(), 1);
        let json: serde_json::Value = serde_json::from_str(&replay[0]).unwrap();
        assert_eq!(
            json.get("type").and_then(|v| v.as_str()),
            Some("participant_updated")
        );
        assert_eq!(
            json.get("participant_id").and_then(|v| v.as_str()),
            Some("p2")
        );
    }
}

#[derive(serde::Deserialize)]
struct LegacyAuditQuery {
    #[serde(rename = "eventId")]
    event_id: Option<String>,
}

async fn audit_legacy(
    State(state): State<AppState>,
    Query(q): Query<LegacyAuditQuery>,
) -> impl IntoResponse {
    let Some(event_id) = q.event_id.filter(|v| !v.is_empty()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "eventId required" })),
        )
            .into_response();
    };
    match LegacyRepository::list_audit(&state.pool, &event_id) {
        Ok(events) => (StatusCode::OK, Json(events)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(serde::Deserialize)]
struct SyncPullQuery {
    #[serde(rename = "eventId")]
    event_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct SyncEventsQuery {
    #[serde(rename = "eventId")]
    event_id: Option<String>,
    #[serde(rename = "sinceSeq")]
    since_seq: Option<i64>,
}

async fn sync_events(
    State(state): State<AppState>,
    Query(q): Query<SyncEventsQuery>,
) -> impl IntoResponse {
    let event_id = match &q.event_id {
        Some(id) if !id.is_empty() => id.as_str(),
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "eventId required" })),
            )
                .into_response();
        }
    };
    let since_seq = q.since_seq.unwrap_or(0);
    match EventLogRepository::list_since(&state.pool, event_id, since_seq) {
        Ok(events) => {
            let latest_seq = EventLogRepository::latest_seq(&state.pool, event_id).unwrap_or(0);
            (
                StatusCode::OK,
                Json(serde_json::json!({ "events": events, "latestSeq": latest_seq })),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn sync_pull(
    State(state): State<AppState>,
    Query(q): Query<SyncPullQuery>,
) -> impl IntoResponse {
    let event_id = match &q.event_id {
        Some(id) if !id.is_empty() => id.as_str(),
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "success": false, "reason": "eventId required" })),
            )
                .into_response();
        }
    };
    if !thevent::has_connectivity().await {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({ "success": false, "reason": "no_connectivity" })),
        )
            .into_response();
    }
    match thevent::pull(event_id).await {
        Ok(pull_response) => {
            if let Err(e) = crate::api::repository::import_pull_to_db(&state.pool, &pull_response) {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "success": false, "reason": e })),
                )
                    .into_response();
            }
            broadcast_events_list_changed(&state);
            (StatusCode::OK, Json(pull_response)).into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "success": false, "reason": e })),
        )
            .into_response(),
    }
}

async fn sync_import(
    State(state): State<AppState>,
    Json(body): Json<thevent::PullResponse>,
) -> impl IntoResponse {
    if body.event_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "success": false, "reason": "eventId required" })),
        )
            .into_response();
    }
    match crate::api::repository::import_pull_to_db(&state.pool, &body) {
        Ok(()) => {
            broadcast_events_list_changed(&state);
            (StatusCode::OK, Json(body)).into_response()
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "success": false, "reason": e })),
        )
            .into_response(),
    }
}

async fn sync_push(Json(body): Json<thevent::SyncPushBody>) -> impl IntoResponse {
    if body.event_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "success": false, "reason": "eventId required" })),
        )
            .into_response();
    }
    if body.items.len() > thevent::MAX_PUSH_ITEMS {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "success": false, "reason": "items exceed max 500" })),
        )
            .into_response();
    }
    if !thevent::has_connectivity().await {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({ "success": false, "reason": "no_connectivity" })),
        )
            .into_response();
    }
    match thevent::push(&body).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "success": false, "reason": e })),
        )
            .into_response(),
    }
}
