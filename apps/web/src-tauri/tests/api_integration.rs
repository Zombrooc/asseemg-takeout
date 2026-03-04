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

async fn import_event(app: &axum::Router, body: serde_json::Value) {
  let import_req = Request::builder()
    .uri("/sync/import")
    .method("POST")
    .header("content-type", "application/json")
    .body(Body::from(serde_json::to_vec(&body).unwrap()))
    .unwrap();
  let import_res = app.clone().oneshot(import_req).await.unwrap();
  assert_eq!(import_res.status(), StatusCode::OK);
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
async fn network_addresses_returns_shape() {
  let app = app();
  let req = Request::builder()
    .uri("/network/addresses")
    .body(Body::empty())
    .unwrap();
  let res = app.oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);

  let body = body_bytes(res.into_body()).await;
  let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
  assert_eq!(json.get("baseUrl").and_then(|v| v.as_str()), Some("http://127.0.0.1:5555"));
  assert_eq!(json.get("port").and_then(|v| v.as_u64()), Some(5555));
  assert!(json.get("addresses").and_then(|v| v.as_array()).is_some());
}

#[tokio::test]
async fn participants_search_by_event_supports_modes_and_validation() {
  let app = app();

  import_event(
    &app,
    serde_json::json!({
      "eventId": "ev-search-1",
      "event": {
        "id": "ev-search-1",
        "name": "Search Event 1",
        "startDate": "2026-02-23T09:00:00.000Z",
        "endDate": null,
        "startTime": "09:00"
      },
      "exportedAt": "2026-02-23T12:00:00.000Z",
      "customForm": [],
      "participants": [
        {
          "seatId": "seat-joao",
          "ticketId": "cat-5k",
          "ticketName": "5K",
          "qrCode": "QR-JOAO",
          "participantName": "João Silva",
          "cpf": "123.456.789-00",
          "birthDate": "1990-01-01",
          "age": 35,
          "customFormResponses": [],
          "checkinDone": false,
          "checkedInAt": null
        },
        {
          "seatId": "seat-maria",
          "ticketId": "cat-10k",
          "ticketName": "10K",
          "qrCode": "QR-MARIA",
          "participantName": "Maria",
          "cpf": "11122233344",
          "birthDate": "1991-02-02",
          "age": 34,
          "customFormResponses": [],
          "checkinDone": false,
          "checkedInAt": null
        }
      ],
      "checkins": []
    }),
  )
  .await;

  import_event(
    &app,
    serde_json::json!({
      "eventId": "ev-search-2",
      "event": {
        "id": "ev-search-2",
        "name": "Search Event 2",
        "startDate": "2026-02-23T09:00:00.000Z",
        "endDate": null,
        "startTime": "09:00"
      },
      "exportedAt": "2026-02-23T12:00:00.000Z",
      "customForm": [],
      "participants": [
        {
          "seatId": "seat-joao-ev2",
          "ticketId": "cat-5k",
          "ticketName": "5K",
          "qrCode": "QR-JOAO-EV2",
          "participantName": "Joao Evento 2",
          "cpf": "99988877766",
          "birthDate": "1993-03-03",
          "age": 32,
          "customFormResponses": [],
          "checkinDone": false,
          "checkedInAt": null
        }
      ],
      "checkins": []
    }),
  )
  .await;

  let nome_req = Request::builder()
    .uri("/events/ev-search-1/participants/search?q=joao&mode=nome")
    .body(Body::empty())
    .unwrap();
  let nome_res = app.clone().oneshot(nome_req).await.unwrap();
  assert_eq!(nome_res.status(), StatusCode::OK);
  let nome_payload = body_bytes(nome_res.into_body()).await;
  let nome_json: serde_json::Value = serde_json::from_slice(&nome_payload).unwrap();
  let nome_list = nome_json.as_array().unwrap();
  assert_eq!(nome_list.len(), 1);
  assert_eq!(nome_list[0].get("id").and_then(|v| v.as_str()), Some("seat-joao"));

  let cpf_req = Request::builder()
    .uri("/events/ev-search-1/participants/search?q=12345678900&mode=cpf")
    .body(Body::empty())
    .unwrap();
  let cpf_res = app.clone().oneshot(cpf_req).await.unwrap();
  assert_eq!(cpf_res.status(), StatusCode::OK);
  let cpf_payload = body_bytes(cpf_res.into_body()).await;
  let cpf_json: serde_json::Value = serde_json::from_slice(&cpf_payload).unwrap();
  let cpf_list = cpf_json.as_array().unwrap();
  assert_eq!(cpf_list.len(), 1);
  assert_eq!(cpf_list[0].get("id").and_then(|v| v.as_str()), Some("seat-joao"));

  let qr_req = Request::builder()
    .uri("/events/ev-search-1/participants/search?q=QR-JOAO&mode=qr")
    .body(Body::empty())
    .unwrap();
  let qr_res = app.clone().oneshot(qr_req).await.unwrap();
  assert_eq!(qr_res.status(), StatusCode::OK);
  let qr_payload = body_bytes(qr_res.into_body()).await;
  let qr_json: serde_json::Value = serde_json::from_slice(&qr_payload).unwrap();
  let qr_list = qr_json.as_array().unwrap();
  assert_eq!(qr_list.len(), 1);
  assert_eq!(qr_list[0].get("id").and_then(|v| v.as_str()), Some("seat-joao"));

  let isolation_req = Request::builder()
    .uri("/events/ev-search-1/participants/search?q=QR-JOAO-EV2&mode=qr")
    .body(Body::empty())
    .unwrap();
  let isolation_res = app.clone().oneshot(isolation_req).await.unwrap();
  assert_eq!(isolation_res.status(), StatusCode::OK);
  let isolation_payload = body_bytes(isolation_res.into_body()).await;
  let isolation_json: serde_json::Value = serde_json::from_slice(&isolation_payload).unwrap();
  let isolation_list = isolation_json.as_array().unwrap();
  assert!(isolation_list.is_empty());

  let bad_mode_req = Request::builder()
    .uri("/events/ev-search-1/participants/search?q=joao&mode=foo")
    .body(Body::empty())
    .unwrap();
  let bad_mode_res = app.clone().oneshot(bad_mode_req).await.unwrap();
  assert_eq!(bad_mode_res.status(), StatusCode::BAD_REQUEST);

  let missing_q_req = Request::builder()
    .uri("/events/ev-search-1/participants/search?mode=nome")
    .body(Body::empty())
    .unwrap();
  let missing_q_res = app.oneshot(missing_q_req).await.unwrap();
  assert_eq!(missing_q_res.status(), StatusCode::BAD_REQUEST);
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

#[tokio::test]
async fn legacy_csv_import_endpoint_accepts_valid_file_and_returns_summary() {
  let app = app();
  let boundary = "----takeout-legacy-boundary";
  let csv = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Thiago Lima Araújo,Masculino,17979086937,08/03/2000,5KM,EXG,\n2,Débora Gonçalves Barbosa,Feminino,16212872627,05/05/2002,5KM,P,Poços Running Club\n";
  let body = format!(
    "--{b}\r\nContent-Disposition: form-data; name=\"eventId\"\r\n\r\nev-legacy\r\n--{b}\r\nContent-Disposition: form-data; name=\"eventName\"\r\n\r\nEvento Legado\r\n--{b}\r\nContent-Disposition: form-data; name=\"eventStartDate\"\r\n\r\n2026-05-15\r\n--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"legacy.csv\"\r\nContent-Type: text/csv\r\n\r\n{csv}\r\n--{b}--\r\n",
    b = boundary
  );
  let req = Request::builder()
    .uri("/admin/import/legacy-csv")
    .method("POST")
    .header(
      "content-type",
      format!("multipart/form-data; boundary={}", boundary),
    )
    .body(Body::from(body))
    .unwrap();
  let res = app.clone().oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);
  let payload = body_bytes(res.into_body()).await;
  let json: serde_json::Value = serde_json::from_slice(&payload).unwrap();
  assert_eq!(json.get("imported").and_then(|v| v.as_i64()), Some(2));
  assert_eq!(json.get("errors").and_then(|v| v.as_array()).unwrap().len(), 0);
}

#[tokio::test]
async fn legacy_participants_endpoints_list_search_and_confirm_are_available() {
  let app = app();
  let boundary = "----takeout-legacy-boundary";
  let csv = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Thiago Lima Araújo,Masculino,17979086937,08/03/2000,5KM,EXG,\n";
  let body = format!(
    "--{b}\r\nContent-Disposition: form-data; name=\"eventId\"\r\n\r\nev-legacy-2\r\n--{b}\r\nContent-Disposition: form-data; name=\"eventName\"\r\n\r\nEvento Legado 2\r\n--{b}\r\nContent-Disposition: form-data; name=\"eventStartDate\"\r\n\r\n2026-05-16\r\n--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"legacy.csv\"\r\nContent-Type: text/csv\r\n\r\n{csv}\r\n--{b}--\r\n",
    b = boundary
  );
  let import_req = Request::builder()
    .uri("/admin/import/legacy-csv")
    .method("POST")
    .header(
      "content-type",
      format!("multipart/form-data; boundary={}", boundary),
    )
    .body(Body::from(body))
    .unwrap();
  let import_res = app.clone().oneshot(import_req).await.unwrap();
  assert_eq!(import_res.status(), StatusCode::OK);

  let list_req = Request::builder()
    .uri("/events/ev-legacy-2/legacy-participants")
    .body(Body::empty())
    .unwrap();
  let list_res = app.clone().oneshot(list_req).await.unwrap();
  assert_eq!(list_res.status(), StatusCode::OK);
  let list_body = body_bytes(list_res.into_body()).await;
  let list_json: serde_json::Value = serde_json::from_slice(&list_body).unwrap();
  let first = list_json.as_array().unwrap().first().unwrap();
  let participant_id = first.get("id").and_then(|v| v.as_str()).unwrap().to_string();

  let search_req = Request::builder()
    .uri("/events/ev-legacy-2/legacy-participants/search?q=thiago&mode=nome")
    .body(Body::empty())
    .unwrap();
  let search_res = app.clone().oneshot(search_req).await.unwrap();
  assert_eq!(search_res.status(), StatusCode::OK);
  let search_body = body_bytes(search_res.into_body()).await;
  let search_json: serde_json::Value = serde_json::from_slice(&search_body).unwrap();
  assert_eq!(search_json.as_array().unwrap().len(), 1);

  let confirm_body = serde_json::json!({
    "request_id": uuid::Uuid::new_v4().to_string(),
    "event_id": "ev-legacy-2",
    "participant_id": participant_id,
    "device_id": "mobile-legacy"
  });
  let confirm_req = Request::builder()
    .uri("/takeout/confirm/legacy")
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

#[tokio::test]
async fn legacy_csv_import_rejects_invalid_header() {
  let app = app();
  let boundary = "----takeout-legacy-boundary";
  let csv = "Numero,Nome,Sexo,CPF,Data de Nascimento,Modalidade,Tamanho da Camisa,Equipe\n1,Ana,Feminino,17979086937,08/03/2000,5KM,P,\n";
  let body = format!(
    "--{b}\r\nContent-Disposition: form-data; name=\"eventId\"\r\n\r\nev-legacy-invalid\r\n--{b}\r\nContent-Disposition: form-data; name=\"eventName\"\r\n\r\nEvento Invalido\r\n--{b}\r\nContent-Disposition: form-data; name=\"eventStartDate\"\r\n\r\n2026-05-16\r\n--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"legacy.csv\"\r\nContent-Type: text/csv\r\n\r\n{csv}\r\n--{b}--\r\n",
    b = boundary
  );
  let req = Request::builder()
    .uri("/admin/import/legacy-csv")
    .method("POST")
    .header(
      "content-type",
      format!("multipart/form-data; boundary={}", boundary),
    )
    .body(Body::from(body))
    .unwrap();
  let res = app.oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}
