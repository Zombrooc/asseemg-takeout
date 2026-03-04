use crate::api::db::DbPool;
use rusqlite::params;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventLogRow {
    pub seq: i64,
    pub event_id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub payload_json: Option<String>,
    pub created_at: i64,
}

pub struct EventLogRepository;

impl EventLogRepository {
    pub fn insert(
        pool: &DbPool,
        event_id: &str,
        type_name: &str,
        payload_json: Option<&str>,
    ) -> Result<i64, rusqlite::Error> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        conn.execute(
      "INSERT INTO event_log (event_id, type, payload_json, created_at) VALUES (?1, ?2, ?3, ?4)",
      params![event_id, type_name, payload_json, now],
    )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn list_since(
        pool: &DbPool,
        event_id: &str,
        since_seq: i64,
    ) -> Result<Vec<EventLogRow>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut stmt = conn.prepare(
      "SELECT seq, event_id, type, payload_json, created_at FROM event_log WHERE event_id = ?1 AND seq > ?2 ORDER BY seq ASC",
    )?;
        let mut rows = stmt.query(params![event_id, since_seq])?;
        let mut out = Vec::new();
        while let Some(row) = rows.next()? {
            out.push(EventLogRow {
                seq: row.get(0)?,
                event_id: row.get(1)?,
                kind: row.get(2)?,
                payload_json: row.get(3)?,
                created_at: row.get(4)?,
            });
        }
        Ok(out)
    }

    pub fn latest_seq(pool: &DbPool, event_id: &str) -> Result<i64, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let v: i64 = conn.query_row(
            "SELECT COALESCE(MAX(seq), 0) FROM event_log WHERE event_id = ?1",
            [event_id],
            |r| r.get(0),
        )?;
        Ok(v)
    }
}
