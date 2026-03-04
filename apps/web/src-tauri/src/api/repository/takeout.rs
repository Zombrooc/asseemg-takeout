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

#[derive(Debug)]
pub enum ConfirmAtomicResult {
    Confirmed,
    Duplicate,
    Conflict { existing_request_id: String },
}

pub struct TakeoutRepository;

impl TakeoutRepository {
    /// Atomic confirm: one transaction. Idempotent by request_id; one check-in per ticket.
    pub fn confirm_atomic(
        pool: &DbPool,
        request_id: &str,
        ticket_id: &str,
        device_id: &str,
        payload_json: Option<&str>,
    ) -> Result<ConfirmAtomicResult, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        conn.execute("BEGIN IMMEDIATE", [])?;
        let result = {
            match conn.query_row(
                "SELECT status FROM takeout_events WHERE request_id = ?1",
                [request_id],
                |r| r.get::<_, String>(0),
            ) {
                Ok(_) => {
                    let _ = conn.execute("ROLLBACK", []);
                    return Ok(ConfirmAtomicResult::Duplicate);
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => {}
                Err(e) => return Err(e),
            }
            match conn.query_row(
                "SELECT request_id FROM check_ins WHERE ticket_id = ?1",
                [ticket_id],
                |r| r.get::<_, String>(0),
            ) {
                Ok(existing_request_id) => {
                    let _ = conn.execute("ROLLBACK", []);
                    return Ok(ConfirmAtomicResult::Conflict {
                        existing_request_id,
                    });
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => {}
                Err(e) => return Err(e),
            }
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            if let Err(e) = conn.execute(
        "INSERT INTO check_ins (ticket_id, request_id, device_id, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![ticket_id, request_id, device_id, now.to_string()],
      ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e);
      }
            if let Err(e) = conn.execute(
        "INSERT INTO takeout_events (request_id, ticket_id, device_id, status, payload_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![request_id, ticket_id, device_id, "CONFIRMED", payload_json, now.to_string()],
      ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e);
      }
            ConfirmAtomicResult::Confirmed
        };
        conn.execute("COMMIT", [])?;
        Ok(result)
    }

    pub fn find_by_request_id(
        pool: &DbPool,
        request_id: &str,
    ) -> Result<Option<(String,)>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
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
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
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
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
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

    /// Deletes all takeout_events and check_ins whose ticket_id belongs to a participant of the given event.
    pub fn delete_by_event_id(pool: &DbPool, event_id: &str) -> Result<u64, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let sub = "SELECT t.id FROM tickets t INNER JOIN participants p ON t.participant_id = p.id WHERE p.event_id = ?1";
        conn.execute(
            &format!("DELETE FROM check_ins WHERE ticket_id IN ({})", sub),
            params![event_id],
        )?;
        let n = conn.execute(
            &format!("DELETE FROM takeout_events WHERE ticket_id IN ({})", sub),
            params![event_id],
        )?;
        Ok(n as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::db::DbPool;

    #[test]
    fn delete_by_event_id_removes_only_events_for_that_event() {
        let pool = DbPool::open_in_memory().unwrap();
        {
            let conn = pool.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO events (event_id, name, imported_at) VALUES (?1, ?2, ?3)",
                params!["ev1", "Event 1", "2024-01-01"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO participants (id, event_id) VALUES (?1, ?2)",
                params!["p1", "ev1"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO tickets (id, participant_id) VALUES (?1, ?2)",
                params!["t1", "p1"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO participants (id, event_id) VALUES (?1, ?2)",
                params!["p2", "ev2"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO tickets (id, participant_id) VALUES (?1, ?2)",
                params!["t2", "p2"],
            )
            .unwrap();
            conn.execute(
        "INSERT INTO takeout_events (request_id, ticket_id, device_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params!["req1", "t1", "d1", "CONFIRMED", "1000"],
      )
      .unwrap();
            conn.execute(
        "INSERT INTO takeout_events (request_id, ticket_id, device_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params!["req2", "t2", "d1", "CONFIRMED", "1001"],
      )
      .unwrap();
        }
        let deleted = TakeoutRepository::delete_by_event_id(&pool, "ev1").unwrap();
        assert_eq!(deleted, 1);
        let conn = pool.conn.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM takeout_events", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
        let remaining: String = conn
            .query_row("SELECT ticket_id FROM takeout_events LIMIT 1", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(remaining, "t2");
    }
}
