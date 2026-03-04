use crate::api::db::DbPool;
use rusqlite::params;

const TTL_SECS: i64 = 30;

#[derive(Debug)]
pub enum AcquireResult {
    Acquired,
    AlreadyHeldBy { device_id: String },
}

pub struct LocksRepository;

impl LocksRepository {
    fn now_secs() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }

    pub fn acquire(
        pool: &DbPool,
        participant_id: &str,
        device_id: &str,
    ) -> Result<AcquireResult, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let now = Self::now_secs();
        let expires_at = now + TTL_SECS;
        let existing: Option<(String, i64)> = match conn.query_row(
            "SELECT device_id, expires_at FROM locks WHERE participant_id = ?1",
            [participant_id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)),
        ) {
            Ok(x) => Some(x),
            Err(rusqlite::Error::QueryReturnedNoRows) => None,
            Err(e) => return Err(e),
        };
        if let Some((existing_device, exp)) = existing {
            if exp > now && existing_device != device_id {
                return Ok(AcquireResult::AlreadyHeldBy {
                    device_id: existing_device,
                });
            }
        }
        conn.execute(
      "INSERT INTO locks (participant_id, device_id, expires_at) VALUES (?1, ?2, ?3) ON CONFLICT(participant_id) DO UPDATE SET device_id = ?2, expires_at = ?3",
      params![participant_id, device_id, expires_at],
    )?;
        Ok(AcquireResult::Acquired)
    }

    pub fn renew(
        pool: &DbPool,
        participant_id: &str,
        device_id: &str,
    ) -> Result<bool, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let now = Self::now_secs();
        let expires_at = now + TTL_SECS;
        let n = conn.execute(
      "UPDATE locks SET expires_at = ?1 WHERE participant_id = ?2 AND device_id = ?3 AND expires_at > ?4",
      params![expires_at, participant_id, device_id, now],
    )?;
        Ok(n > 0)
    }

    pub fn release(
        pool: &DbPool,
        participant_id: &str,
        device_id: Option<&str>,
    ) -> Result<u64, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let n = if let Some(did) = device_id {
            conn.execute(
                "DELETE FROM locks WHERE participant_id = ?1 AND device_id = ?2",
                params![participant_id, did],
            )?
        } else {
            conn.execute(
                "DELETE FROM locks WHERE participant_id = ?1",
                params![participant_id],
            )?
        };
        Ok(n as u64)
    }

    pub fn get_holder(
        pool: &DbPool,
        participant_id: &str,
    ) -> Result<Option<(String, i64)>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let now = Self::now_secs();
        match conn.query_row(
            "SELECT device_id, expires_at FROM locks WHERE participant_id = ?1 AND expires_at > ?2",
            params![participant_id, now],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)),
        ) {
            Ok(x) => Ok(Some(x)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}
