use reqwest::Client;
use serde::{Deserialize, Serialize};

pub const MAX_PUSH_ITEMS: usize = 500;

fn base_url() -> Option<String> {
  std::env::var("THEVENT_BASE_URL").ok().filter(|s| !s.is_empty())
}

/// Check if we have connectivity to thevent (and base URL is set).
pub async fn has_connectivity() -> bool {
  let url = match base_url() {
    Some(u) => u,
    None => return false,
  };
  let client = Client::new();
  if let Ok(res) = client.get(url).send().await {
    return res.status().is_success();
  }
  false
}

/// GET thevent /api/sync/checkin/pull?eventId=...
pub async fn pull(event_id: &str) -> Result<Vec<u8>, String> {
  let base = base_url().ok_or_else(|| "THEVENT_BASE_URL not set".to_string())?;
  let url = format!(
    "{}/api/sync/checkin/pull?eventId={}",
    base.trim_end_matches('/'),
    event_id
  );
  let client = Client::new();
  let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
  let status = res.status();
  let bytes = res.bytes().await.map_err(|e| e.to_string())?;
  let body = bytes.to_vec();
  if !status.is_success() {
    return Err(format!("thevent pull returned {}", status));
  }
  Ok(body)
}

#[derive(Deserialize, Serialize)]
pub struct SyncPushItem {
  #[serde(rename = "seatId")]
  pub seat_id: Option<String>,
  #[serde(rename = "ticketId")]
  pub ticket_id: Option<String>,
  pub status: Option<String>,
  #[serde(rename = "checkinDone")]
  pub checkin_done: Option<bool>,
  #[serde(rename = "checkedInAt")]
  pub checked_in_at: Option<String>,
  #[serde(rename = "checkedInByUserId")]
  pub checked_in_by_user_id: Option<String>,
  pub action: Option<String>,
}

#[derive(Deserialize, Serialize)]
pub struct SyncPushBody {
  #[serde(rename = "eventId")]
  pub event_id: String,
  pub items: Vec<SyncPushItem>,
}

#[derive(Serialize, Deserialize)]
pub struct SyncPushSuccess {
  pub success: bool,
  #[serde(rename = "total_recebido")]
  pub total_recebido: u32,
  #[serde(rename = "total_inserido")]
  pub total_inserido: u32,
  #[serde(rename = "total_atualizado")]
  pub total_atualizado: u32,
  #[serde(rename = "total_ignorados")]
  pub total_ignorados: u32,
  pub erros: Vec<serde_json::Value>,
}

/// POST thevent /api/sync/checkin/push.
pub async fn push(body: &SyncPushBody) -> Result<SyncPushSuccess, String> {
  if body.items.len() > MAX_PUSH_ITEMS {
    return Err(format!("items exceed max {}", MAX_PUSH_ITEMS));
  }
  let base = base_url().ok_or_else(|| "THEVENT_BASE_URL not set".to_string())?;
  let url = format!("{}/api/sync/checkin/push", base.trim_end_matches('/'));
  let client = Client::new();
  let res = client.post(&url).json(body).send().await.map_err(|e| e.to_string())?;
  let status = res.status();
  let text = res.text().await.map_err(|e| e.to_string())?;
  if !status.is_success() {
    return Err(format!("thevent push returned {}: {}", status, text));
  }
  let out: SyncPushSuccess = serde_json::from_str(&text).map_err(|e| e.to_string())?;
  Ok(out)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn max_push_items_is_500() {
    assert_eq!(MAX_PUSH_ITEMS, 500);
  }
}
