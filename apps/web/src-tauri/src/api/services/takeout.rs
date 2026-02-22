use crate::api::db::DbPool;
use crate::api::repository::{TakeoutEventRow, TakeoutRepository};
use std::sync::Arc;

pub struct TakeoutService;

#[derive(Clone, serde::Deserialize)]
pub struct ConfirmTakeoutPayload {
  pub request_id: String,
  pub ticket_id: String,
  pub device_id: String,
  #[serde(default)]
  pub payload_json: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct ConfirmTakeoutResponse {
  pub status: String,
}

impl TakeoutService {
  pub fn confirm(
    pool: Arc<DbPool>,
    device_id: String,
    payload: ConfirmTakeoutPayload,
  ) -> Result<ConfirmTakeoutResponse, String> {
    if payload.request_id.is_empty() {
      return Err("request_id is required".to_string());
    }
    if let Some((status,)) = TakeoutRepository::find_by_request_id(&pool, &payload.request_id)
      .map_err(|e| e.to_string())?
    {
      return Ok(ConfirmTakeoutResponse {
        status: if status == "CONFIRMED" { "DUPLICATE".to_string() } else { status },
      });
    }
    TakeoutRepository::insert_event(
      &pool,
      &payload.request_id,
      &payload.ticket_id,
      &device_id,
      "CONFIRMED",
      payload.payload_json.as_deref(),
    )
    .map_err(|e| e.to_string())?;
    Ok(ConfirmTakeoutResponse {
      status: "CONFIRMED".to_string(),
    })
  }

  pub fn list_audit(
    pool: &DbPool,
    status: Option<String>,
    from_ts: Option<i64>,
    to_ts: Option<i64>,
  ) -> Result<Vec<TakeoutEventRow>, String> {
    TakeoutRepository::list_events(pool, status.as_deref(), from_ts, to_ts).map_err(|e| e.to_string())
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn mem_pool() -> Arc<DbPool> {
    Arc::new(crate::api::db::DbPool::open_in_memory().unwrap())
  }

  #[test]
  fn confirm_inserts_and_returns_confirmed() {
    let pool = mem_pool();
    let payload = ConfirmTakeoutPayload {
      request_id: uuid::Uuid::new_v4().to_string(),
      ticket_id: "T1".to_string(),
      device_id: "d1".to_string(),
      payload_json: None,
    };
    let r = TakeoutService::confirm(pool.clone(), "d1".to_string(), payload.clone()).unwrap();
    assert_eq!(r.status, "CONFIRMED");
    let r2 = TakeoutService::confirm(pool, "d1".to_string(), payload).unwrap();
    assert_eq!(r2.status, "DUPLICATE");
  }

  #[test]
  fn confirm_rejects_empty_request_id() {
    let pool = mem_pool();
    let payload = ConfirmTakeoutPayload {
      request_id: String::new(),
      ticket_id: "T1".to_string(),
      device_id: "d1".to_string(),
      payload_json: None,
    };
    let err = TakeoutService::confirm(pool, "d1".to_string(), payload).unwrap_err();
    assert!(err.contains("request_id"));
  }
}
