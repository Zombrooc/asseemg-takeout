use app_lib::api::db::DbPool;
use app_lib::api::handlers::{router, AppState};
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
  };
  router(state)
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
  assert!(json.get("pairing_token").and_then(|v| v.as_str()).unwrap().len() > 0);
  assert_eq!(json.get("base_url").and_then(|v| v.as_str()), Some("http://127.0.0.1:5555"));
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
async fn audit_returns_empty_array() {
  let app = app();
  let req = Request::builder().uri("/audit").body(Body::empty()).unwrap();
  let res = app.oneshot(req).await.unwrap();
  assert_eq!(res.status(), StatusCode::OK);
  let body = body_bytes(res.into_body()).await;
  let json: Vec<serde_json::Value> = serde_json::from_slice(&body).unwrap();
  assert!(json.is_empty());
}
