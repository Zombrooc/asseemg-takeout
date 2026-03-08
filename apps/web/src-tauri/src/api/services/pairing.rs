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
        PairingRepository::delete_all_tokens(&pool).map_err(|e| e.to_string())?;
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
        operator_alias: String,
    ) -> Result<String, String> {
        if operator_alias.trim().is_empty() {
            return Err("operator_alias is required".to_string());
        }
        let valid = PairingRepository::token_is_valid(&pool, &pairing_token)
            .map_err(|e| e.to_string())?;
        if !valid {
            return Err("invalid or expired pairing token".to_string());
        }
        let access_token = uuid::Uuid::new_v4().to_string();
        PairingRepository::insert_device(&pool, &device_id, &access_token, operator_alias.trim())
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
        let access = PairingService::pair(
            pool.clone(),
            "device-1".to_string(),
            token,
            "Operador 1".to_string(),
        )
        .unwrap();
        assert!(!access.is_empty());
    }

    #[test]
    fn pair_allows_multiple_devices_with_same_valid_token() {
        let pool = mem_pool();
        let info = PairingService::get_info(pool.clone(), "http://x".to_string()).unwrap();
        let token = info.pairing_token.clone();

        let access_1 = PairingService::pair(
            pool.clone(),
            "device-1".to_string(),
            token.clone(),
            "Operador 1".to_string(),
        )
        .unwrap();

        let access_2 = PairingService::pair(
            pool,
            "device-2".to_string(),
            token,
            "Operador 2".to_string(),
        )
        .unwrap();

        assert_ne!(access_1, access_2);
    }

    #[test]
    fn renew_invalidates_previous_token() {
        let pool = mem_pool();
        let info_1 = PairingService::get_info(pool.clone(), "http://x".to_string()).unwrap();
        let old_token = info_1.pairing_token;

        let info_2 = PairingService::renew(pool.clone(), "http://x".to_string()).unwrap();
        let new_token = info_2.pairing_token;
        assert_ne!(old_token, new_token);

        let old_err = PairingService::pair(
            pool.clone(),
            "device-1".to_string(),
            old_token,
            "Operador 1".to_string(),
        )
        .unwrap_err();
        assert!(old_err.contains("invalid"));

        let new_access = PairingService::pair(
            pool,
            "device-2".to_string(),
            new_token,
            "Operador 2".to_string(),
        )
        .unwrap();
        assert!(!new_access.is_empty());
    }

    #[test]
    fn pair_fails_with_invalid_token() {
        let pool = mem_pool();
        let err = PairingService::pair(
            pool,
            "device-1".to_string(),
            "invalid-token".to_string(),
            "Operador 1".to_string(),
        )
        .unwrap_err();
        assert!(err.contains("invalid"));
    }
}
