use crate::api::db::DbPool;
use crate::api::repository::{ConfirmAtomicResult, TakeoutEventRow, TakeoutRepository};
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

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct ConfirmConflictBody {
  pub status: String,
  pub existing_request_id: String,
  pub ticket_id: String,
}

#[derive(Debug)]
pub enum ConfirmError {
  Validation(String),
  Conflict {
    existing_request_id: String,
    ticket_id: String,
  },
}

impl TakeoutService {
  pub fn confirm(
    pool: Arc<DbPool>,
    device_id: String,
    payload: ConfirmTakeoutPayload,
  ) -> Result<ConfirmTakeoutResponse, ConfirmError> {
    if payload.request_id.is_empty() {
      return Err(ConfirmError::Validation("request_id is required".to_string()));
    }
    let r = TakeoutRepository::confirm_atomic(
      &pool,
      &payload.request_id,
      &payload.ticket_id,
      &device_id,
      payload.payload_json.as_deref(),
    )
    .map_err(|e| ConfirmError::Validation(e.to_string()))?;
    match r {
      ConfirmAtomicResult::Confirmed => Ok(ConfirmTakeoutResponse {
        status: "CONFIRMED".to_string(),
      }),
      ConfirmAtomicResult::Duplicate => Ok(ConfirmTakeoutResponse {
        status: "DUPLICATE".to_string(),
      }),
      ConfirmAtomicResult::Conflict { existing_request_id } => Err(ConfirmError::Conflict {
        existing_request_id,
        ticket_id: payload.ticket_id,
      }),
    }
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
    match &err {
      ConfirmError::Validation(s) => assert!(s.contains("request_id")),
      _ => panic!("expected Validation"),
    }
  }

  #[test]
  fn confirm_second_request_id_same_ticket_returns_conflict() {
    let pool = mem_pool();
    let payload1 = ConfirmTakeoutPayload {
      request_id: uuid::Uuid::new_v4().to_string(),
      ticket_id: "T1".to_string(),
      device_id: "d1".to_string(),
      payload_json: None,
    };
    let r1 = TakeoutService::confirm(pool.clone(), "d1".to_string(), payload1).unwrap();
    assert_eq!(r1.status, "CONFIRMED");
    let payload2 = ConfirmTakeoutPayload {
      request_id: uuid::Uuid::new_v4().to_string(),
      ticket_id: "T1".to_string(),
      device_id: "d2".to_string(),
      payload_json: None,
    };
    let err = TakeoutService::confirm(pool, "d2".to_string(), payload2).unwrap_err();
    match &err {
      ConfirmError::Conflict { ticket_id, .. } => assert_eq!(ticket_id, "T1"),
      _ => panic!("expected Conflict"),
    }
  }
}
