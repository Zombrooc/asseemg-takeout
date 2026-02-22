use crate::api::db::DbPool;
use rusqlite::params;

pub struct EventsRepository;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventRow {
  pub event_id: String,
  pub name: Option<String>,
  pub start_date: Option<String>,
  pub end_date: Option<String>,
  pub start_time: Option<String>,
  pub imported_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventParticipantRow {
  pub id: String,
  pub name: Option<String>,
  pub cpf: Option<String>,
  pub birth_date: Option<String>,
  pub ticket_id: String,
  pub ticket_name: Option<String>,
  pub qr_code: String,
  pub checkin_done: bool,
}

impl EventsRepository {
  pub fn list_events(pool: &DbPool) -> Result<Vec<EventRow>, rusqlite::Error> {
    let conn = pool
      .conn
      .lock()
      .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let mut stmt = conn.prepare(
      "SELECT event_id, name, start_date, end_date, start_time, imported_at FROM events ORDER BY imported_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
      Ok(EventRow {
        event_id: row.get(0)?,
        name: row.get(1)?,
        start_date: row.get(2)?,
        end_date: row.get(3)?,
        start_time: row.get(4)?,
        imported_at: row.get(5)?,
      })
    })?;
    rows.collect()
  }

  pub fn list_participants_by_event(
    pool: &DbPool,
    event_id: &str,
  ) -> Result<Vec<EventParticipantRow>, rusqlite::Error> {
    let conn = pool
      .conn
      .lock()
      .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let mut stmt = conn.prepare(
      "SELECT p.id, p.name, p.cpf, p.birth_date, t.id AS ticket_id, t.code AS qr_code, t.raw_json AS ticket_raw, p.raw_json AS participant_raw
       FROM participants p
       JOIN tickets t ON t.participant_id = p.id
       WHERE p.event_id = ?1
       ORDER BY p.name",
    )?;
    let rows = stmt.query_map(params![event_id], |row| {
      let id: String = row.get(0)?;
      let name: Option<String> = row.get(1)?;
      let cpf: Option<String> = row.get(2)?;
      let birth_date: Option<String> = row.get(3)?;
      let ticket_id: String = row.get(4)?;
      let qr_code: String = row.get(5)?;
      let ticket_raw: Option<String> = row.get(6)?;
      let participant_raw: Option<String> = row.get(7)?;
      let ticket_name = ticket_raw
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.get("ticketName").and_then(|n| n.as_str()))
        .map(String::from);
      let checkin_done = participant_raw
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.get("checkinDone").and_then(|b| b.as_bool()))
        .unwrap_or(false);
      Ok(EventParticipantRow {
        id,
        name,
        cpf,
        birth_date,
        ticket_id,
        ticket_name,
        qr_code,
        checkin_done,
      })
    })?;
    rows.collect()
  }
}
