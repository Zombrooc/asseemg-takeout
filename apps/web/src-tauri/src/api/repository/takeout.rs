use crate::api::db::DbPool;
use rusqlite::params;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct TakeoutEventRow {
  pub request_id: String,
  pub ticket_id: String,
  pub device_id: String,
  pub status: String,
  pub payload_json: Option<String>,
  pub created_at: String,
}

pub struct TakeoutRepository;

impl TakeoutRepository {
  pub fn find_by_request_id(
    pool: &DbPool,
    request_id: &str,
  ) -> Result<Option<(String,)>, rusqlite::Error> {
    let conn = pool.conn.lock().map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let mut stmt = conn.prepare("SELECT status FROM takeout_events WHERE request_id = ?1")?;
    let mut rows = stmt.query([request_id])?;
    if let Some(row) = rows.next()? {
      return Ok(Some((row.get::<_, String>(0)?,)));
    }
    Ok(None)
  }

  pub fn insert_event(
    pool: &DbPool,
    request_id: &str,
    ticket_id: &str,
    device_id: &str,
    status: &str,
    payload_json: Option<&str>,
  ) -> Result<(), rusqlite::Error> {
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap()
      .as_secs();
    let conn = pool.conn.lock().map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    conn.execute(
      "INSERT INTO takeout_events (request_id, ticket_id, device_id, status, payload_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      params![request_id, ticket_id, device_id, status, payload_json, now.to_string()],
    )?;
    Ok(())
  }

  pub fn list_events(
    pool: &DbPool,
    status_filter: Option<&str>,
    _from_ts: Option<i64>,
    _to_ts: Option<i64>,
  ) -> Result<Vec<TakeoutEventRow>, rusqlite::Error> {
    let conn = pool.conn.lock().map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let mut out = Vec::new();
    if let Some(s) = status_filter {
      let mut stmt = conn.prepare(
        "SELECT request_id, ticket_id, device_id, status, payload_json, created_at FROM takeout_events WHERE status = ?1 ORDER BY created_at DESC",
      )?;
      let mut rows = stmt.query([s])?;
      while let Some(row) = rows.next()? {
        out.push(TakeoutEventRow {
          request_id: row.get::<_, String>(0)?,
          ticket_id: row.get::<_, String>(1)?,
          device_id: row.get::<_, String>(2)?,
          status: row.get::<_, String>(3)?,
          payload_json: row.get::<_, Option<String>>(4)?,
          created_at: row.get::<_, String>(5)?,
        });
      }
    } else {
      let mut stmt = conn.prepare(
        "SELECT request_id, ticket_id, device_id, status, payload_json, created_at FROM takeout_events ORDER BY created_at DESC",
      )?;
      let mut rows = stmt.query([])?;
      while let Some(row) = rows.next()? {
        out.push(TakeoutEventRow {
          request_id: row.get::<_, String>(0)?,
          ticket_id: row.get::<_, String>(1)?,
          device_id: row.get::<_, String>(2)?,
          status: row.get::<_, String>(3)?,
          payload_json: row.get::<_, Option<String>>(4)?,
          created_at: row.get::<_, String>(5)?,
        });
      }
    }
    Ok(out)
  }

  /// Deletes all takeout_events whose ticket_id belongs to a participant of the given event.
  pub fn delete_by_event_id(pool: &DbPool, event_id: &str) -> Result<u64, rusqlite::Error> {
    let conn = pool.conn.lock().map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let n = conn.execute(
      "DELETE FROM takeout_events WHERE ticket_id IN (SELECT t.id FROM tickets t INNER JOIN participants p ON t.participant_id = p.id WHERE p.event_id = ?1)",
      params![event_id],
    )?;
    Ok(n as u64)
  }
}
