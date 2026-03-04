use crate::api::db::DbPool;
use crate::api::repository::PairingRepository;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const TOKEN_TTL_SECS: u64 = 15 * 60; // 15 min

pub struct PairingService;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInfo {
    pub base_url: String,
    pub pairing_token: String,
    pub expires_at: String,
}

impl PairingService {
    pub fn get_info(pool: Arc<DbPool>, base_url: String) -> Result<ConnectionInfo, String> {
        if let Some((token, expires_at)) =
            PairingRepository::get_current_token(&pool).map_err(|e| e.to_string())?
        {
            return Ok(ConnectionInfo {
                base_url,
                pairing_token: token,
                expires_at,
            });
        }
        let (token, expires_at) = Self::generate_token()?;
        PairingRepository::insert_token(&pool, &token, &expires_at).map_err(|e| e.to_string())?;
        Ok(ConnectionInfo {
            base_url,
            pairing_token: token,
            expires_at,
        })
    }

    pub fn renew(pool: Arc<DbPool>, base_url: String) -> Result<ConnectionInfo, String> {
        let (token, expires_at) = Self::generate_token()?;
        PairingRepository::insert_token(&pool, &token, &expires_at).map_err(|e| e.to_string())?;
        Ok(ConnectionInfo {
            base_url,
            pairing_token: token,
            expires_at,
        })
    }

    fn generate_token() -> Result<(String, String), String> {
        const CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let mut token = String::with_capacity(6);
        let mut u = uuid::Uuid::new_v4().as_u128();
        for _ in 0..6 {
            token.push(CHARS[(u % CHARS.len() as u128) as usize] as char);
            u /= CHARS.len() as u128;
        }
        let expires = SystemTime::now() + Duration::from_secs(TOKEN_TTL_SECS);
        let expires_at = expires
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs();
        Ok((token, expires_at.to_string()))
    }

    pub fn pair(
        pool: Arc<DbPool>,
        device_id: String,
        pairing_token: String,
    ) -> Result<String, String> {
        let consumed =
            PairingRepository::consume_token(&pool, &pairing_token).map_err(|e| e.to_string())?;
        if !consumed {
            return Err("invalid or expired pairing token".to_string());
        }
        let access_token = uuid::Uuid::new_v4().to_string();
        PairingRepository::insert_device(&pool, &device_id, &access_token)
            .map_err(|e| e.to_string())?;
        Ok(access_token)
    }

    pub fn validate_access_token(pool: &DbPool, token: &str) -> Result<bool, rusqlite::Error> {
        PairingRepository::find_device_by_token(pool, token).map(|o| o.is_some())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem_pool() -> Arc<DbPool> {
        Arc::new(DbPool::open_in_memory().unwrap())
    }

    #[test]
    fn get_info_creates_token_when_none() {
        let pool = mem_pool();
        let info =
            PairingService::get_info(pool.clone(), "http://localhost:5555".to_string()).unwrap();
        assert!(!info.pairing_token.is_empty());
        assert_eq!(info.base_url, "http://localhost:5555");
    }

    #[test]
    fn pair_consumes_token_and_returns_access_token() {
        let pool = mem_pool();
        let info = PairingService::get_info(pool.clone(), "http://x".to_string()).unwrap();
        let token = info.pairing_token.clone();
        let access = PairingService::pair(pool.clone(), "device-1".to_string(), token).unwrap();
        assert!(!access.is_empty());
    }

    #[test]
    fn pair_fails_with_invalid_token() {
        let pool = mem_pool();
        let err = PairingService::pair(pool, "device-1".to_string(), "invalid-token".to_string())
            .unwrap_err();
        assert!(err.contains("invalid"));
    }
}
