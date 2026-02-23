use app_lib::api::db::DbPool;
use app_lib::api::handlers::{router, AppState};
use app_lib::api::ws::WsRegistry;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use std::sync::Arc;
use tower::ServiceExt;

async fn body_bytes(body: axum::body::Body) -> Vec<u8> {
  body.collect().await.unwrap().to_bytes().to_vec()
}

fn app() -> axum::Router {
  let pool = Arc::new(DbPool::open_in_memory().expect("mem db"));
  let state = AppState {
    pool,
    base_url: "http://127.0.0.1:5555".to_string(),
    ws_registry: Arc::new(WsRegistry::new()),
  };
  router(state)
}

fn app_with_seeded_pool() -> (axum::Router, Arc<DbPool>) {
  let pool = Arc::new(DbPool::open_in_memory().expect("mem db"));
  {
    let conn = pool.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO events (event_id, name, imported_at) VALUES ('ev1', 'Event 1', '2024-01-01')",
      [],
    )
    .unwrap();
    conn.execute(
      "INSERT INTO participants (id, event_id) VALUES ('p1', 'ev1')",
      [],
    )
    .unwrap();
    conn.execute(
      "INSERT INTO tickets (id, participant_id) VALUES ('t1', 'p1')",
      [],
    )
    .unwrap();
    conn.execute(
      "INSERT INTO takeout_events (request_id, ticket_id, device_id, status, created_at) VALUES ('req1', 't1', 'd1', 'CONFIRMED', '1000')",
      [],
    )
    .unwrap();
    conn.execute(
      "INSERT INTO takeout_events (request_id, ticket_id, device_id, status, created_at) VALUES ('req2', 't1', 'd1', 'CONFIRMED', '1001')",
      [],
    )
    .unwrap();
  }
  let state = AppState {
    pool: pool.clone(),
    base_url: "http://127.0.0.1:5555".to_string(),
    ws_registry: Arc::new(WsRegistry::new()),
  };
  (router(state), pool)
}

#[tokio::test]
async fn health_returns_ok() {
  let app = app();
  let req = Request::builder().uri("/health").body(Body::empty()).unwrap();
  let res = app.oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);
  let body = body_bytes(res.into_body()).await;
  let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
  assert_eq!(json.get("status").and_then(|v| v.as_str()), Some("ok"));
}

#[tokio::test]
async fn pair_info_returns_base_url_and_token() {
  let app = app();
  let req = Request::builder().uri("/pair/info").body(Body::empty()).unwrap();
  let res = app.oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);
  let body = body_bytes(res.into_body()).await;
  let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
  assert!(json.get("pairingToken").and_then(|v| v.as_str()).unwrap_or("").len() > 0);
  assert_eq!(json.get("baseUrl").and_then(|v| v.as_str()), Some("http://127.0.0.1:5555"));
}

#[tokio::test]
async fn takeout_confirm_then_duplicate() {
  let app = app();
  let request_id = uuid::Uuid::new_v4().to_string();
  let body = serde_json::json!({
    "request_id": request_id,
    "ticket_id": "T1",
    "device_id": "mobile-1",
  });
  let req = Request::builder()
    .uri("/takeout/confirm")
    .method("POST")
    .header("content-type", "application/json")
    .body(Body::from(serde_json::to_vec(&body).unwrap()))
    .unwrap();
  let res = app.clone().oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);
  let buf = body_bytes(res.into_body()).await;
  let json: serde_json::Value = serde_json::from_slice(&buf).unwrap();
  assert_eq!(json.get("status").and_then(|v| v.as_str()), Some("CONFIRMED"));

  let req2 = Request::builder()
    .uri("/takeout/confirm")
    .method("POST")
    .header("content-type", "application/json")
    .body(Body::from(serde_json::to_vec(&body).unwrap()))
    .unwrap();
  let res2 = app.oneshot(req2).await.unwrap();
  assert_eq!(res2.status(), StatusCode::OK);
  let buf2 = body_bytes(res2.into_body()).await;
  let json2: serde_json::Value = serde_json::from_slice(&buf2).unwrap();
  assert_eq!(json2.get("status").and_then(|v| v.as_str()), Some("DUPLICATE"));
}

#[tokio::test]
async fn takeout_confirm_second_device_same_ticket_returns_409() {
  let app = app();
  let body1 = serde_json::json!({
    "request_id": uuid::Uuid::new_v4().to_string(),
    "ticket_id": "T1",
    "device_id": "mobile-1",
  });
  let req1 = Request::builder()
    .uri("/takeout/confirm")
    .method("POST")
    .header("content-type", "application/json")
    .body(Body::from(serde_json::to_vec(&body1).unwrap()))
    .unwrap();
  let res1 = app.clone().oneshot(req1).await.unwrap();
  assert_eq!(res1.status(), StatusCode::OK);
  let buf1 = body_bytes(res1.into_body()).await;
  let json1: serde_json::Value = serde_json::from_slice(&buf1).unwrap();
  assert_eq!(json1.get("status").and_then(|v| v.as_str()), Some("CONFIRMED"));

  let body2 = serde_json::json!({
    "request_id": uuid::Uuid::new_v4().to_string(),
    "ticket_id": "T1",
    "device_id": "mobile-2",
  });
  let req2 = Request::builder()
    .uri("/takeout/confirm")
    .method("POST")
    .header("content-type", "application/json")
    .body(Body::from(serde_json::to_vec(&body2).unwrap()))
    .unwrap();
  let res2 = app.oneshot(req2).await.unwrap();
  assert_eq!(res2.status(), StatusCode::CONFLICT);
  let buf2 = body_bytes(res2.into_body()).await;
  let json2: serde_json::Value = serde_json::from_slice(&buf2).unwrap();
  assert_eq!(json2.get("status").and_then(|v| v.as_str()), Some("CONFLICT"));
  assert!(json2.get("existing_request_id").is_some());
  assert_eq!(json2.get("ticket_id").and_then(|v| v.as_str()), Some("T1"));
}

#[tokio::test]
async fn audit_returns_empty_array() {
  let app = app();
  let req = Request::builder().uri("/audit").body(Body::empty()).unwrap();
  let res = app.oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);
  let body = body_bytes(res.into_body()).await;
  let json: Vec<serde_json::Value> = serde_json::from_slice(&body).unwrap();
  assert!(json.is_empty());
}

#[tokio::test]
async fn events_checkins_reset_deletes_and_returns_count() {
  let (app, pool) = app_with_seeded_pool();
  let req = Request::builder()
    .uri("/events/ev1/checkins/reset")
    .method("POST")
    .body(Body::empty())
    .unwrap();
  let res = app.oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);
  let body = body_bytes(res.into_body()).await;
  let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
  assert_eq!(json.get("deleted").and_then(|v| v.as_u64()), Some(2));

  let conn = pool.conn.lock().unwrap();
  let count: i64 = conn
    .query_row("SELECT COUNT(*) FROM takeout_events", [], |r| r.get(0))
    .unwrap();
  assert_eq!(count, 0);
}
