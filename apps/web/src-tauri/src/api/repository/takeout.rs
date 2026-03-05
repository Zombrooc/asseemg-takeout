use crate::api::db::DbPool;
use chrono::Datelike;
use rusqlite::params;
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct TakeoutEventRow {
    pub request_id: String,
    pub ticket_id: String,
    pub device_id: String,
    pub status: String,
    pub payload_json: Option<String>,
    pub created_at: String,
    pub source_type: String,
    pub event_id: Option<String>,
    pub participant_id: Option<String>,
    pub participant_name: Option<String>,
    pub birth_date: Option<String>,
    pub age_at_checkin: Option<i64>,
    pub ticket_source_id: Option<String>,
    pub ticket_name: Option<String>,
    pub ticket_code: Option<String>,
    pub operator_alias: Option<String>,
    pub operator_device_id: String,
    pub checked_in_at: String,
}

#[derive(Debug)]
pub enum ConfirmAtomicResult {
    Confirmed,
    Duplicate,
    Conflict { existing_request_id: String },
}

fn normalize_datetime(input: &str) -> String {
    if let Ok(ts) = input.parse::<i64>() {
        if let Some(dt) = chrono::DateTime::<chrono::Utc>::from_timestamp(ts, 0) {
            return dt.to_rfc3339();
        }
    }
    input.to_string()
}

fn compute_age_at_checkin(birth_date: Option<&str>, checked_in_at: &str) -> Option<i64> {
    let birth = birth_date
        .and_then(|value| chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())?;
    let checkin_dt = chrono::DateTime::parse_from_rfc3339(checked_in_at).ok()?;
    let checkin_date = checkin_dt.date_naive();
    let mut age = checkin_date.year() - birth.year();
    if (checkin_date.month(), checkin_date.day()) < (birth.month(), birth.day()) {
        age -= 1;
    }
    if age < 0 {
        return None;
    }
    Some(i64::from(age))
}

pub struct TakeoutRepository;

impl TakeoutRepository {
    /// Atomic confirm: one transaction. Idempotent by request_id; one check-in per ticket.
    pub fn confirm_atomic(
        pool: &DbPool,
        request_id: &str,
        ticket_id: &str,
        device_id: &str,
        operator_alias: Option<&str>,
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
            let now_epoch = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            let now_iso = chrono::Utc::now().to_rfc3339();
            if let Err(e) = conn.execute(
                "INSERT INTO check_ins (ticket_id, request_id, device_id, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![ticket_id, request_id, device_id, now_epoch.to_string()],
            ) {
                let _ = conn.execute("ROLLBACK", []);
                return Err(e);
            }

            let snapshot = conn
                .query_row(
                    "SELECT p.event_id, p.id, p.name, p.birth_date,
                     json_extract(t.raw_json, '$.ticketId'),
                     json_extract(t.raw_json, '$.ticketName'),
                     t.code
                     FROM tickets t
                     LEFT JOIN participants p ON p.id = t.participant_id
                     WHERE t.id = ?1",
                    [ticket_id],
                    |row| {
                        Ok((
                            row.get::<_, Option<String>>(0)?,
                            row.get::<_, Option<String>>(1)?,
                            row.get::<_, Option<String>>(2)?,
                            row.get::<_, Option<String>>(3)?,
                            row.get::<_, Option<String>>(4)?,
                            row.get::<_, Option<String>>(5)?,
                            row.get::<_, Option<String>>(6)?,
                        ))
                    },
                )
                .ok();

            let (
                event_id,
                participant_id,
                participant_name,
                birth_date,
                ticket_source_id,
                ticket_name,
                ticket_code,
            ) = snapshot.unwrap_or((None, None, None, None, None, None, None));
            let age_at_checkin = compute_age_at_checkin(birth_date.as_deref(), &now_iso);

            if let Err(e) = conn.execute(
                "INSERT INTO takeout_events (
                    request_id, ticket_id, device_id, status, payload_json, created_at,
                    source_type, event_id, participant_id, participant_name, birth_date, age_at_checkin,
                    ticket_source_id, ticket_name, ticket_code, operator_alias, operator_device_id, checked_in_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
                params![
                    request_id,
                    ticket_id,
                    device_id,
                    "CONFIRMED",
                    payload_json,
                    now_epoch.to_string(),
                    "json_sync",
                    event_id,
                    participant_id,
                    participant_name,
                    birth_date,
                    age_at_checkin,
                    ticket_source_id,
                    ticket_name,
                    ticket_code,
                    operator_alias,
                    device_id,
                    now_iso
                ],
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

    pub fn list_events_by_event(
        pool: &DbPool,
        event_id: &str,
        status_filter: Option<&str>,
        _from_ts: Option<i64>,
        _to_ts: Option<i64>,
    ) -> Result<Vec<TakeoutEventRow>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;

        let mut query = String::from(
            "SELECT
              te.request_id,
              te.ticket_id,
              te.device_id,
              te.status,
              te.payload_json,
              te.created_at,
              COALESCE(te.source_type, 'json_sync') AS source_type,
              COALESCE(te.event_id, p.event_id) AS event_id,
              COALESCE(te.participant_id, p.id) AS participant_id,
              COALESCE(te.participant_name, p.name) AS participant_name,
              COALESCE(te.birth_date, p.birth_date) AS birth_date,
              te.age_at_checkin,
              COALESCE(te.ticket_source_id, json_extract(t.raw_json, '$.ticketId')) AS ticket_source_id,
              COALESCE(te.ticket_name, json_extract(t.raw_json, '$.ticketName')) AS ticket_name,
              COALESCE(te.ticket_code, t.code) AS ticket_code,
              COALESCE(te.operator_alias, pd.operator_alias) AS operator_alias,
              COALESCE(te.operator_device_id, te.device_id) AS operator_device_id,
              COALESCE(te.checked_in_at, te.created_at) AS checked_in_at
            FROM takeout_events te
            LEFT JOIN tickets t ON t.id = te.ticket_id
            LEFT JOIN participants p ON p.id = t.participant_id
            LEFT JOIN paired_devices pd ON pd.device_id = COALESCE(te.operator_device_id, te.device_id)
            WHERE COALESCE(te.event_id, p.event_id) = ?1",
        );
        if status_filter.is_some() {
            query.push_str(" AND te.status = ?2");
        }
        query.push_str(" ORDER BY te.created_at DESC");

        let mut stmt = conn.prepare(&query)?;
        let mut rows = if let Some(status) = status_filter {
            stmt.query(params![event_id, status])?
        } else {
            stmt.query(params![event_id])?
        };

        let mut out = Vec::new();
        while let Some(row) = rows.next()? {
            let birth_date: Option<String> = row.get(10)?;
            let checked_in_at_raw: String = row.get(17)?;
            let checked_in_at = normalize_datetime(&checked_in_at_raw);
            let age_at_checkin_db: Option<i64> = row.get(11)?;
            let age_at_checkin = age_at_checkin_db
                .or_else(|| compute_age_at_checkin(birth_date.as_deref(), &checked_in_at));
            out.push(TakeoutEventRow {
                request_id: row.get(0)?,
                ticket_id: row.get(1)?,
                device_id: row.get(2)?,
                status: row.get(3)?,
                payload_json: row.get(4)?,
                created_at: row.get(5)?,
                source_type: row.get(6)?,
                event_id: row.get(7)?,
                participant_id: row.get(8)?,
                participant_name: row.get(9)?,
                birth_date,
                age_at_checkin,
                ticket_source_id: row.get(12)?,
                ticket_name: row.get(13)?,
                ticket_code: row.get(14)?,
                operator_alias: row.get(15)?,
                operator_device_id: row.get(16)?,
                checked_in_at,
            });
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
