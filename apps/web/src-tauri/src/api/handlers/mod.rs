use axum::{
  extract::{
    ws::{WebSocket, WebSocketUpgrade},
    Multipart, Path, Query, State,
  },
  http::{header, HeaderMap, StatusCode},
  response::IntoResponse,
  routing::{get, post},
  Json, Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::api::db::DbPool;
use crate::api::repository::{
  EventLogRepository, EventsRepository, LocksRepository, ParticipantsRepository, TakeoutRepository,
};
use crate::api::services::takeout::{ConfirmConflictBody, ConfirmError, TakeoutService};
use crate::api::services::PairingService;
use crate::api::thevent;
use crate::api::ws::WsRegistry;

#[derive(Clone)]
pub struct AppState {
  pub pool: Arc<DbPool>,
  pub base_url: String,
  pub ws_registry: Arc<WsRegistry>,
}


pub fn router(state: AppState) -> Router {
  let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods(Any)
    .allow_headers(Any);

  Router::new()
    .route("/health", get(health))
    .route("/pair/info", get(pair_info))
    .route("/pair/renew", post(pair_renew))
    .route("/pair", post(pair))
    .route("/participants/search", get(participants_search))
    .route("/participants/:id", get(participants_get))
    .route("/events", get(events_list))
    .route("/events/:event_id/participants", get(events_participants))
    .route("/events/:event_id/checkins/reset", post(events_checkins_reset))
    .route("/takeout/confirm", post(takeout_confirm))
    .route("/ws", get(ws_handler))
    .route("/locks", post(locks_acquire))
    .route("/locks/renew", post(locks_renew))
    .route("/locks/:participant_id", get(locks_status).delete(locks_release))
    .route("/audit", get(audit))
    .route("/admin/import", post(admin_import))
    .route("/sync/pull", get(sync_pull))
    .route("/sync/events", get(sync_events))
    .route("/sync/import", post(sync_import))
    .route("/sync/push", post(sync_push))
    .layer(cors)
    .with_state(state)
}

async fn health() -> impl IntoResponse {
  Json(serde_json::json!({ "status": "ok" }))
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
}

async fn pair(State(state): State<AppState>, Json(body): Json<PairBody>) -> impl IntoResponse {
  match PairingService::pair(state.pool.clone(), body.device_id, body.pairing_token) {
    Ok(access_token) => (
      StatusCode::OK,
      Json(serde_json::json!({ "access_token": access_token })),
    )
      .into_response(),
    Err(e) => (
      StatusCode::UNAUTHORIZED,
      Json(serde_json::json!({ "error": e })),
    )
      .into_response(),
  }
}

async fn participants_search(
  State(state): State<AppState>,
  _headers: HeaderMap,
  Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
  let _ = state;
  let _ = params;
  Json(serde_json::json!(Vec::<serde_json::Value>::new()))
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
    Ok(None) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "not found" }))).into_response(),
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

async fn events_list(State(state): State<AppState>) -> impl IntoResponse {
  match EventsRepository::list_events(&state.pool) {
    Ok(events) => (StatusCode::OK, Json(events)).into_response(),
    Err(e) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(serde_json::json!({ "error": format!("{}", e) })),
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

async fn events_checkins_reset(
  State(state): State<AppState>,
  Path(event_id): Path<String>,
) -> impl IntoResponse {
  match TakeoutRepository::delete_by_event_id(&state.pool, &event_id) {
    Ok(deleted) => (StatusCode::OK, Json(serde_json::json!({ "deleted": deleted }))).into_response(),
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
  ws.on_upgrade(move |socket| handle_ws_socket(socket, event_id, registry))
}

async fn handle_ws_socket(socket: WebSocket, event_id: String, registry: Arc<WsRegistry>) {
  let (id, mut rx) = registry.register(event_id.clone());
  let mut socket = socket;
  while let Some(msg) = rx.recv().await {
    if let Ok(()) = socket.send(axum::extract::ws::Message::Text(msg)).await {
      // continue
    } else {
      break;
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
      if let Ok(Some(ev_id)) = ParticipantsRepository::get_event_id_by_participant_id(&state.pool, &body.participant_id)
      {
        let payload_json = serde_json::json!({
          "participant_id": body.participant_id,
          "device_id": body.device_id
        })
        .to_string();
        let _ = EventLogRepository::insert(&state.pool, &ev_id, "lock_acquired", Some(&payload_json));
        let msg = serde_json::json!({
          "type": "lock_acquired",
          "participant_id": body.participant_id,
          "device_id": body.device_id
        });
        state.ws_registry.broadcast(&ev_id, &msg.to_string());
      }
      (StatusCode::OK, Json(serde_json::json!({ "acquired": true }))).into_response()
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
      if let Ok(Some(ev_id)) = ParticipantsRepository::get_event_id_by_participant_id(&state.pool, &participant_id) {
        let payload_json = serde_json::json!({
          "participant_id": participant_id,
          "device_id": device_id.unwrap_or_default()
        })
        .to_string();
        let _ = EventLogRepository::insert(&state.pool, &ev_id, "lock_released", Some(&payload_json));
        let msg = serde_json::json!({
          "type": "lock_released",
          "participant_id": participant_id
        });
        state.ws_registry.broadcast(&ev_id, &msg.to_string());
      }
      (StatusCode::OK, Json(serde_json::json!({ "released": true }))).into_response()
    }
    _ => (StatusCode::OK, Json(serde_json::json!({ "released": false }))).into_response(),
  }
}

async fn takeout_confirm(
  State(state): State<AppState>,
  headers: HeaderMap,
  Json(payload): Json<crate::api::services::takeout::ConfirmTakeoutPayload>,
) -> impl IntoResponse {
  let device_id = bearer_token(&headers).unwrap_or_else(|| "unknown".to_string());
  match TakeoutService::confirm(state.pool.clone(), device_id, payload.clone()) {
    Ok(r) => {
      if r.status == "CONFIRMED" {
        if let Ok(Some(ev_id)) = ParticipantsRepository::get_event_id_by_ticket_id(&state.pool, &payload.ticket_id) {
          let payload_json = serde_json::json!({
            "ticket_id": payload.ticket_id,
            "request_id": payload.request_id
          })
          .to_string();
          let _ = EventLogRepository::insert(
            &state.pool,
            &ev_id,
            "participant_checked_in",
            Some(&payload_json),
          );
          let msg = serde_json::json!({
            "type": "participant_checked_in",
            "ticket_id": payload.ticket_id,
            "request_id": payload.request_id
          });
          state.ws_registry.broadcast(&ev_id, &msg.to_string());
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

#[derive(serde::Deserialize)]
struct AuditQuery {
  status: Option<String>,
  from: Option<String>,
  to: Option<String>,
}

async fn audit(
  State(state): State<AppState>,
  Query(q): Query<AuditQuery>,
) -> impl IntoResponse {
  let from_ts = q.from.and_then(|s| s.parse::<i64>().ok());
  let to_ts = q.to.and_then(|s| s.parse::<i64>().ok());
  match TakeoutService::list_audit(&state.pool, q.status, from_ts, to_ts) {
    Ok(events) => (StatusCode::OK, Json(events)).into_response(),
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
  let mut errors = Vec::<String>::new();
  while let Ok(Some(field)) = multipart.next_field().await {
    if field.name() != Some("file") {
      continue;
    }
    if let Ok(data) = field.bytes().await {
      let s = match String::from_utf8(data.to_vec()) {
        Ok(x) => x,
        Err(e) => {
          errors.push(e.to_string());
          continue;
        }
      };
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
    Ok(()) => (StatusCode::OK, Json(body)).into_response(),
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
