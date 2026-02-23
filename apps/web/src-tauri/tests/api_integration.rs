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

#[tokio::test]
async fn events_archive_then_unarchive_restores_event_in_list() {
  let (app, _pool) = app_with_seeded_pool();

  let list_req = Request::builder().uri("/events").body(Body::empty()).unwrap();
  let list_res = app.clone().oneshot(list_req).await.unwrap();
  assert_eq!(list_res.status(), StatusCode::OK);
  let list_body = body_bytes(list_res.into_body()).await;
  let events: Vec<serde_json::Value> = serde_json::from_slice(&list_body).unwrap();
  assert_eq!(events.len(), 1);
  assert_eq!(events[0].get("eventId").and_then(|v| v.as_str()), Some("ev1"));

  let archive_req = Request::builder()
    .uri("/events/ev1/archive")
    .method("POST")
    .body(Body::empty())
    .unwrap();
  let archive_res = app.clone().oneshot(archive_req).await.unwrap();
  assert_eq!(archive_res.status(), StatusCode::OK);
  let archive_body = body_bytes(archive_res.into_body()).await;
  let archive_json: serde_json::Value = serde_json::from_slice(&archive_body).unwrap();
  assert_eq!(archive_json.get("archived").and_then(|v| v.as_bool()), Some(true));

  let list_after_req = Request::builder().uri("/events").body(Body::empty()).unwrap();
  let list_after_res = app.clone().oneshot(list_after_req).await.unwrap();
  assert_eq!(list_after_res.status(), StatusCode::OK);
  let list_after_body = body_bytes(list_after_res.into_body()).await;
  let events_after: Vec<serde_json::Value> = serde_json::from_slice(&list_after_body).unwrap();
  assert!(events_after.is_empty(), "archived event should be excluded from default list");

  let unarchive_req = Request::builder()
    .uri("/events/ev1/unarchive")
    .method("POST")
    .body(Body::empty())
    .unwrap();
  let unarchive_res = app.clone().oneshot(unarchive_req).await.unwrap();
  assert_eq!(unarchive_res.status(), StatusCode::OK);
  let unarchive_body = body_bytes(unarchive_res.into_body()).await;
  let unarchive_json: serde_json::Value = serde_json::from_slice(&unarchive_body).unwrap();
  assert_eq!(unarchive_json.get("unarchived").and_then(|v| v.as_bool()), Some(true));

  let list_restored_req = Request::builder().uri("/events").body(Body::empty()).unwrap();
  let list_restored_res = app.oneshot(list_restored_req).await.unwrap();
  assert_eq!(list_restored_res.status(), StatusCode::OK);
  let list_restored_body = body_bytes(list_restored_res.into_body()).await;
  let events_restored: Vec<serde_json::Value> = serde_json::from_slice(&list_restored_body).unwrap();
  assert_eq!(events_restored.len(), 1);
  assert_eq!(events_restored[0].get("eventId").and_then(|v| v.as_str()), Some("ev1"));
}

#[tokio::test]
async fn sync_import_with_repeated_ticket_id_keeps_all_participants_and_allows_two_confirms() {
  let app = app();
  let import_body = serde_json::json!({
    "eventId": "ev-repeated",
    "event": {
      "id": "ev-repeated",
      "name": "Repeated Ticket Event",
      "startDate": "2026-02-23T09:00:00.000Z",
      "endDate": null,
      "startTime": "09:00"
    },
    "exportedAt": "2026-02-23T12:00:00.000Z",
    "customForm": [],
    "participants": [
      {
        "seatId": "seat-1",
        "ticketId": "category-5k",
        "ticketName": "5K",
        "qrCode": "QR-1",
        "participantName": "Alice",
        "cpf": "111",
        "birthDate": null,
        "age": null,
        "customFormResponses": [],
        "checkinDone": false,
        "checkedInAt": null
      },
      {
        "seatId": "seat-2",
        "ticketId": "category-5k",
        "ticketName": "5K",
        "qrCode": "QR-2",
        "participantName": "Bob",
        "cpf": "222",
        "birthDate": null,
        "age": null,
        "customFormResponses": [],
        "checkinDone": false,
        "checkedInAt": null
      },
      {
        "seatId": "seat-3",
        "ticketId": "category-10k",
        "ticketName": "10K",
        "qrCode": "QR-3",
        "participantName": "Carol",
        "cpf": "333",
        "birthDate": null,
        "age": null,
        "customFormResponses": [],
        "checkinDone": false,
        "checkedInAt": null
      }
    ],
    "checkins": []
  });

  let import_req = Request::builder()
    .uri("/sync/import")
    .method("POST")
    .header("content-type", "application/json")
    .body(Body::from(serde_json::to_vec(&import_body).unwrap()))
    .unwrap();
  let import_res = app.clone().oneshot(import_req).await.unwrap();
  assert_eq!(import_res.status(), StatusCode::OK);

  let list_req = Request::builder()
    .uri("/events/ev-repeated/participants")
    .body(Body::empty())
    .unwrap();
  let list_res = app.clone().oneshot(list_req).await.unwrap();
  assert_eq!(list_res.status(), StatusCode::OK);
  let list_body = body_bytes(list_res.into_body()).await;
  let participants: serde_json::Value = serde_json::from_slice(&list_body).unwrap();
  let arr = participants.as_array().unwrap();
  assert_eq!(arr.len(), 3);
  assert!(arr.iter().all(|p| p.get("ticketId").and_then(|x| x.as_str()).unwrap().starts_with("seat-")));
  assert_eq!(
    arr
      .iter()
      .filter(|p| p.get("sourceTicketId").and_then(|x| x.as_str()) == Some("category-5k"))
      .count(),
    2
  );

  for seat_ticket_id in ["seat-1", "seat-2"] {
    let confirm_body = serde_json::json!({
      "request_id": uuid::Uuid::new_v4().to_string(),
      "ticket_id": seat_ticket_id,
      "device_id": "mobile-1"
    });
    let confirm_req = Request::builder()
      .uri("/takeout/confirm")
      .method("POST")
      .header("content-type", "application/json")
      .body(Body::from(serde_json::to_vec(&confirm_body).unwrap()))
      .unwrap();
    let confirm_res = app.clone().oneshot(confirm_req).await.unwrap();
    assert_eq!(confirm_res.status(), StatusCode::OK);
    let confirm_payload = body_bytes(confirm_res.into_body()).await;
    let confirm_json: serde_json::Value = serde_json::from_slice(&confirm_payload).unwrap();
    assert_eq!(confirm_json.get("status").and_then(|v| v.as_str()), Some("CONFIRMED"));
  }
}
