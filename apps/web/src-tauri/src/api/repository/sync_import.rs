use crate::api::db::DbPool;
use crate::api::thevent::PullResponse;
use rusqlite::params;

/// Imports pull response into local SQLite: events, participants, tickets, custom_forms.
/// Uses one lock and runs all upserts in sequence.
pub fn import_pull_to_db(pool: &DbPool, pull: &PullResponse) -> Result<(), String> {
  let conn = pool.conn.lock().map_err(|_| "db lock".to_string())?;

  let imported_at = chrono::Utc::now().to_rfc3339();
  let (name, start_date, end_date, start_time) = match &pull.event {
    Some(e) => (
      Some(e.name.clone()),
      e.start_date.clone(),
      e.end_date.clone(),
      e.start_time.clone(),
    ),
    None => (None, None, None, None),
  };
  conn
    .execute(
      "INSERT INTO events (event_id, name, start_date, end_date, start_time, imported_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(event_id) DO UPDATE SET name=?2, start_date=?3, end_date=?4, start_time=?5, imported_at=?6",
      params![
        pull.event_id,
        name,
        start_date,
        end_date,
        start_time,
        imported_at,
      ],
    )
    .map_err(|e| e.to_string())?;

  for p in &pull.participants {
    let raw_json = serde_json::json!({
      "ticketId": p.ticket_id,
      "ticketName": p.ticket_name,
      "qrCode": p.qr_code,
      "customFormResponses": p.custom_form_responses,
      "checkinDone": p.checkin_done,
      "checkedInAt": p.checked_in_at,
    });
    conn
      .execute(
        "INSERT OR REPLACE INTO participants (id, event_id, name, cpf, birth_date, raw_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
          p.seat_id,
          pull.event_id,
          p.participant_name,
          p.cpf,
          p.birth_date,
          raw_json.to_string(),
        ],
      )
      .map_err(|e| e.to_string())?;
  }

  for p in &pull.participants {
    let raw_json = serde_json::json!({ "ticketName": p.ticket_name });
    conn
      .execute(
        "INSERT OR REPLACE INTO tickets (id, participant_id, code, raw_json) VALUES (?1, ?2, ?3, ?4)",
        params![p.ticket_id, p.seat_id, p.qr_code, raw_json.to_string()],
      )
      .map_err(|e| e.to_string())?;
  }

  conn
    .execute("DELETE FROM custom_forms WHERE event_id = ?1", params![pull.event_id])
    .map_err(|e| e.to_string())?;
  let definition_json = serde_json::to_string(&pull.custom_form).map_err(|e| e.to_string())?;
  conn
    .execute(
      "INSERT INTO custom_forms (event_id, definition_json) VALUES (?1, ?2)",
      params![pull.event_id, definition_json],
    )
    .map_err(|e| e.to_string())?;

  Ok(())
}

#[cfg(test)]
mod tests {
  use crate::api::repository::EventsRepository;
  use crate::api::thevent::{EventInfo, PullParticipant, PullResponse};
  use crate::api::db::DbPool;

  fn minimal_pull() -> PullResponse {
    PullResponse {
      event_id: "ev-test".to_string(),
      event: Some(EventInfo {
        id: "ev-test".to_string(),
        name: "Test Event".to_string(),
        start_date: Some("2026-05-15".to_string()),
        end_date: None,
        start_time: Some("08:00".to_string()),
      }),
      exported_at: "2026-02-21T12:00:00Z".to_string(),
      custom_form: vec![],
      participants: vec![PullParticipant {
        seat_id: "seat1".to_string(),
        ticket_id: "tkt1".to_string(),
        ticket_name: "Inteira".to_string(),
        qr_code: "QR1".to_string(),
        participant_name: "João".to_string(),
        cpf: "123".to_string(),
        birth_date: None,
        age: None,
        custom_form_responses: vec![],
        checkin_done: false,
        checked_in_at: None,
      }],
      checkins: vec![],
    }
  }

  #[test]
  fn import_persists_event_and_participants_with_event_id() {
    let pool = DbPool::open_in_memory().unwrap();
    let pull = minimal_pull();
    super::import_pull_to_db(&pool, &pull).unwrap();

    let events = EventsRepository::list_events(&pool).unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].event_id, "ev-test");
    assert_eq!(events[0].name.as_deref(), Some("Test Event"));

    let participants = EventsRepository::list_participants_by_event(&pool, "ev-test").unwrap();
    assert_eq!(participants.len(), 1);
    assert_eq!(participants[0].id, "seat1");
    assert_eq!(participants[0].ticket_id, "tkt1");
    assert_eq!(participants[0].checkin_done, false);
  }
}
