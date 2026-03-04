use reqwest::Client;
use serde::{Deserialize, Serialize};

pub const MAX_PUSH_ITEMS: usize = 500;

// --- Pull response (thevent GET /api/sync/checkin/pull) ---

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventInfo {
    pub id: String,
    pub name: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub start_time: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFormField {
    pub name: String,
    #[serde(rename = "type")]
    pub field_type: String,
    pub label: String,
    pub options: Option<Vec<String>>,
    pub required: Option<bool>,
    pub description: Option<String>,
    pub placeholder: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFormResponse {
    pub name: String,
    pub label: String,
    #[serde(rename = "type")]
    pub field_type: String,
    pub response: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PullParticipant {
    pub seat_id: String,
    pub ticket_id: String,
    pub ticket_name: String,
    pub qr_code: String,
    pub participant_name: String,
    pub cpf: String,
    pub birth_date: Option<String>,
    pub age: Option<u32>,
    pub custom_form_responses: Vec<CustomFormResponse>,
    pub checkin_done: bool,
    pub checked_in_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckinLog {
    pub seat_id: String,
    pub ticket_id: String,
    pub status: String,
    pub checkin_done: bool,
    pub checked_in_at: String,
    pub checked_in_by_user_id: Option<String>,
    pub log_id: String,
    #[serde(default)]
    pub custom_form_responses: Vec<CustomFormResponse>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PullResponse {
    pub event_id: String,
    pub event: Option<EventInfo>,
    pub exported_at: String,
    pub custom_form: Vec<CustomFormField>,
    pub participants: Vec<PullParticipant>,
    pub checkins: Vec<CheckinLog>,
}

fn base_url() -> Option<String> {
    std::env::var("THEVENT_BASE_URL")
        .ok()
        .filter(|s| !s.is_empty())
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
pub async fn pull(event_id: &str) -> Result<PullResponse, String> {
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
    if !status.is_success() {
        return Err(format!("thevent pull returned {}", status));
    }
    let body = bytes.to_vec();
    serde_json::from_slice(&body).map_err(|e| e.to_string())
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
    let res = client
        .post(&url)
        .json(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
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

    #[test]
    fn deserialize_pull_response_from_sample_json() {
        let json = r#"{
      "eventId": "ev1",
      "event": { "id": "ev1", "name": "Test", "startDate": "2026-05-15T03:00:00.000Z", "endDate": null, "startTime": "08:00" },
      "exportedAt": "2026-02-22T01:43:25.077Z",
      "customForm": [
        { "name": "tamanho", "type": "select", "label": "Tamanho", "options": ["P","M","G"], "required": true }
      ],
      "participants": [
        {
          "seatId": "seat1",
          "ticketId": "tkt1",
          "ticketName": "Inteira",
          "qrCode": "abc",
          "participantName": "João",
          "cpf": "123",
          "birthDate": "2001-03-20T03:00:00.000Z",
          "age": 24,
          "customFormResponses": [{ "name": "tamanho", "label": "Tamanho", "type": "select", "response": "M" }],
          "checkinDone": false,
          "checkedInAt": null
        }
      ],
      "checkins": []
    }"#;
        let parsed: PullResponse = serde_json::from_str(json).expect("deserialize");
        assert_eq!(parsed.event_id, "ev1");
        assert_eq!(parsed.participants.len(), 1);
        assert_eq!(parsed.participants[0].seat_id, "seat1");
        assert_eq!(parsed.participants[0].participant_name, "João");
        assert_eq!(parsed.custom_form.len(), 1);
        assert_eq!(parsed.checkins.len(), 0);
    }
}
