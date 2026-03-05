use crate::api::db::DbPool;
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct PairingRepository;

impl PairingRepository {
    pub fn get_current_token(pool: &DbPool) -> Result<Option<(String, String)>, rusqlite::Error> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut stmt = conn.prepare(
      "SELECT token, expires_at FROM pairing_tokens WHERE expires_at > ? ORDER BY expires_at DESC LIMIT 1",
    )?;
        let mut rows = stmt.query([now])?;
        if let Some(row) = rows.next()? {
            let token: String = row.get::<_, String>(0)?;
            let expires_at: String = row.get::<_, String>(1)?;
            return Ok(Some((token, expires_at)));
        }
        Ok(None)
    }

    pub fn insert_token(
        pool: &DbPool,
        token: &str,
        expires_at: &str,
    ) -> Result<(), rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        conn.execute(
            "INSERT OR REPLACE INTO pairing_tokens (token, expires_at) VALUES (?1, ?2)",
            params![token, expires_at],
        )?;
        Ok(())
    }

    pub fn consume_token(pool: &DbPool, token: &str) -> Result<bool, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let n = conn.execute(
            "DELETE FROM pairing_tokens WHERE token = ?1",
            params![token],
        )?;
        Ok(n > 0)
    }

    pub fn insert_device(
        pool: &DbPool,
        device_id: &str,
        access_token: &str,
        operator_alias: &str,
    ) -> Result<(), rusqlite::Error> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        conn.execute(
      "INSERT OR REPLACE INTO paired_devices (device_id, access_token, created_at, operator_alias) VALUES (?1, ?2, ?3, ?4)",
      params![device_id, access_token, now.to_string(), operator_alias],
    )?;
        Ok(())
    }

    pub fn find_device_by_token(
        pool: &DbPool,
        access_token: &str,
    ) -> Result<Option<(String, Option<String>)>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut stmt = conn
            .prepare("SELECT device_id, operator_alias FROM paired_devices WHERE access_token = ?1")?;
        let mut rows = stmt.query([access_token])?;
        if let Some(row) = rows.next()? {
            return Ok(Some((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)));
        }
        Ok(None)
    }
}
