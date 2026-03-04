use crate::api::db::DbPool;
use deunicode::deunicode;

use super::events::EventParticipantRow;
use super::EventsRepository;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParticipantSearchMode {
    Qr,
    TicketId,
    Cpf,
    Nome,
    BirthDate,
}

impl ParticipantSearchMode {
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "qr" => Some(Self::Qr),
            "ticket_id" => Some(Self::TicketId),
            "cpf" => Some(Self::Cpf),
            "nome" => Some(Self::Nome),
            "birth_date" => Some(Self::BirthDate),
            _ => None,
        }
    }
}

fn normalize_digits(value: &str) -> String {
    value.chars().filter(|c| c.is_ascii_digit()).collect()
}

fn normalize_nome(value: &str) -> String {
    deunicode(value).to_lowercase()
}

fn matches_search(row: &EventParticipantRow, mode: ParticipantSearchMode, query: &str) -> bool {
    match mode {
        ParticipantSearchMode::Qr => row.qr_code.trim() == query,
        ParticipantSearchMode::TicketId => {
            row.ticket_id.trim() == query
                || row
                    .source_ticket_id
                    .as_deref()
                    .map(|value| value.trim() == query)
                    .unwrap_or(false)
        }
        ParticipantSearchMode::Cpf => {
            let query_digits = normalize_digits(query);
            if query_digits.is_empty() {
                return false;
            }
            row.cpf
                .as_deref()
                .map(normalize_digits)
                .map(|value| value == query_digits)
                .unwrap_or(false)
        }
        ParticipantSearchMode::Nome => {
            let query_norm = normalize_nome(query);
            if query_norm.is_empty() {
                return false;
            }
            row.name
                .as_deref()
                .map(normalize_nome)
                .map(|value| value.contains(&query_norm))
                .unwrap_or(false)
        }
        ParticipantSearchMode::BirthDate => row
            .birth_date
            .as_deref()
            .map(|value| value.trim() == query)
            .unwrap_or(false),
    }
}

pub struct ParticipantsRepository;

#[derive(Debug)]
pub enum UpdateParticipantError {
    NotFound,
    AlreadyCheckedIn,
    Db(rusqlite::Error),
}

impl From<rusqlite::Error> for UpdateParticipantError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(value)
    }
}

impl ParticipantsRepository {
    pub fn get_event_id_by_participant_id(
        pool: &DbPool,
        participant_id: &str,
    ) -> Result<Option<String>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut stmt = conn.prepare("SELECT event_id FROM participants WHERE id = ?1")?;
        let mut rows = stmt.query([participant_id])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(row.get::<_, String>(0)?));
        }
        Ok(None)
    }

    pub fn get_event_id_by_ticket_id(
        pool: &DbPool,
        ticket_id: &str,
    ) -> Result<Option<String>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut stmt = conn.prepare(
      "SELECT p.event_id FROM participants p INNER JOIN tickets t ON t.participant_id = p.id WHERE t.id = ?1",
    )?;
        let mut rows = stmt.query([ticket_id])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(row.get::<_, String>(0)?));
        }
        Ok(None)
    }

    pub fn search_by_event(
        pool: &DbPool,
        event_id: &str,
        query: &str,
        mode: ParticipantSearchMode,
    ) -> Result<Vec<EventParticipantRow>, rusqlite::Error> {
        let query_trimmed = query.trim();
        if query_trimmed.is_empty() {
            return Ok(Vec::new());
        }

        let participants = EventsRepository::list_participants_by_event(pool, event_id)?;
        let filtered = participants
            .into_iter()
            .filter(|row| matches_search(row, mode, query_trimmed))
            .collect();
        Ok(filtered)
    }

    pub fn get_by_id(pool: &DbPool, id: &str) -> Result<Option<ParticipantRow>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut stmt = conn.prepare(
            "SELECT id, name, cpf, birth_date, raw_json FROM participants WHERE id = ?1",
        )?;
        let mut rows = stmt.query([id])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(ParticipantRow {
                id: row.get::<_, String>(0)?,
                name: row.get::<_, Option<String>>(1)?,
                cpf: row.get::<_, Option<String>>(2)?,
                birth_date: row.get::<_, Option<String>>(3)?,
                raw_json: row.get::<_, Option<String>>(4)?,
            }));
        }
        Ok(None)
    }

    pub fn update_event_participant(
        pool: &DbPool,
        event_id: &str,
        participant_id: &str,
        name: &str,
        birth_date: &str,
        ticket_type: &str,
    ) -> Result<EventParticipantRow, UpdateParticipantError> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;

        let lookup = conn.query_row(
            "SELECT t.id, t.raw_json,
       EXISTS (
         SELECT 1
         FROM takeout_events te
         WHERE te.ticket_id = t.id AND te.status IN ('CONFIRMED', 'DUPLICATE')
       ) AS checkin_done
       FROM participants p
       INNER JOIN tickets t ON t.participant_id = p.id
       WHERE p.event_id = ?1 AND p.id = ?2",
            [event_id, participant_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, bool>(2)?,
                ))
            },
        );

        let (ticket_id, ticket_raw, checkin_done) = match lookup {
            Ok(v) => v,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                return Err(UpdateParticipantError::NotFound)
            }
            Err(e) => return Err(UpdateParticipantError::Db(e)),
        };

        if checkin_done {
            return Err(UpdateParticipantError::AlreadyCheckedIn);
        }

        let mut ticket_raw_value = ticket_raw
            .as_deref()
            .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
            .unwrap_or_else(|| serde_json::json!({}));
        if !ticket_raw_value.is_object() {
            ticket_raw_value = serde_json::json!({});
        }
        if let Some(obj) = ticket_raw_value.as_object_mut() {
            obj.insert(
                "ticketName".to_string(),
                serde_json::Value::String(ticket_type.to_string()),
            );
        }
        let ticket_raw_updated = ticket_raw_value.to_string();

        conn.execute("BEGIN IMMEDIATE", [])?;
        let result = (|| -> Result<(), rusqlite::Error> {
            conn.execute(
                "UPDATE participants SET name = ?3, birth_date = ?4
         WHERE event_id = ?1 AND id = ?2",
                rusqlite::params![event_id, participant_id, name, birth_date],
            )?;
            conn.execute(
                "UPDATE tickets SET raw_json = ?3
         WHERE id = ?1 AND participant_id = ?2",
                rusqlite::params![ticket_id, participant_id, ticket_raw_updated],
            )?;
            Ok(())
        })();

        match result {
            Ok(()) => conn.execute("COMMIT", [])?,
            Err(e) => {
                let _ = conn.execute("ROLLBACK", []);
                return Err(UpdateParticipantError::Db(e));
            }
        };

        let mut stmt = conn.prepare(
      "SELECT p.id, p.name, p.cpf, p.birth_date, t.id AS ticket_id, t.code AS qr_code, t.raw_json AS ticket_raw, p.raw_json AS participant_raw,
       EXISTS (SELECT 1 FROM takeout_events te WHERE te.ticket_id = t.id AND te.status IN ('CONFIRMED', 'DUPLICATE')) AS checkin_done_db
       FROM participants p
       JOIN tickets t ON t.participant_id = p.id
       WHERE p.event_id = ?1 AND p.id = ?2",
    )?;
        let updated = stmt.query_row(rusqlite::params![event_id, participant_id], |row| {
            let id: String = row.get(0)?;
            let row_name: Option<String> = row.get(1)?;
            let cpf: Option<String> = row.get(2)?;
            let row_birth_date: Option<String> = row.get(3)?;
            let row_ticket_id: String = row.get(4)?;
            let qr_code: String = row.get(5)?;
            let row_ticket_raw: Option<String> = row.get(6)?;
            let participant_raw: Option<String> = row.get(7)?;
            let checkin_done_db: bool = row.get(8)?;

            let ticket_raw_json = row_ticket_raw
                .as_ref()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok());
            let source_ticket_id = ticket_raw_json
                .as_ref()
                .and_then(|v| v.get("ticketId").and_then(|n| n.as_str().map(String::from)));
            let ticket_name = ticket_raw_json.as_ref().and_then(|v| {
                v.get("ticketName")
                    .and_then(|n| n.as_str().map(String::from))
            });
            let custom_form_responses = participant_raw
                .as_ref()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
                .and_then(|v| {
                    v.get("customFormResponses")
                        .and_then(|a| a.as_array())
                        .map(|a| a.to_vec())
                })
                .map(|arr| {
                    arr.iter()
                        .map(|item| {
                            let name = item
                                .get("name")
                                .and_then(|n| n.as_str())
                                .unwrap_or("")
                                .to_string();
                            let label = item
                                .get("label")
                                .and_then(|l| l.as_str())
                                .unwrap_or("")
                                .to_string();
                            let field_type = item
                                .get("type")
                                .and_then(|t| t.as_str())
                                .unwrap_or("")
                                .to_string();
                            let response = item
                                .get("response")
                                .cloned()
                                .unwrap_or(serde_json::Value::Null);
                            super::events::CustomFormResponseRow {
                                name,
                                label,
                                field_type,
                                response,
                            }
                        })
                        .collect::<Vec<_>>()
                });

            Ok(EventParticipantRow {
                id,
                name: row_name,
                cpf,
                birth_date: row_birth_date,
                ticket_id: row_ticket_id,
                source_ticket_id,
                ticket_name,
                qr_code,
                checkin_done: checkin_done_db,
                custom_form_responses,
            })
        });

        match updated {
            Ok(row) => Ok(row),
            Err(rusqlite::Error::QueryReturnedNoRows) => Err(UpdateParticipantError::NotFound),
            Err(e) => Err(UpdateParticipantError::Db(e)),
        }
    }
}

pub struct ParticipantRow {
    pub id: String,
    pub name: Option<String>,
    pub cpf: Option<String>,
    pub birth_date: Option<String>,
    pub raw_json: Option<String>,
}

#[cfg(test)]
mod tests {
    use crate::api::db::DbPool;
    use rusqlite::params;

    use super::{
        normalize_digits, normalize_nome, ParticipantSearchMode, ParticipantsRepository,
        UpdateParticipantError,
    };

    fn seeded_pool() -> DbPool {
        let pool = DbPool::open_in_memory().unwrap();
        {
            let conn = pool.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO events (event_id, name, imported_at) VALUES (?1, ?2, ?3)",
                params!["ev-1", "Evento 1", "2026-02-23T10:00:00Z"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO events (event_id, name, imported_at) VALUES (?1, ?2, ?3)",
                params!["ev-2", "Evento 2", "2026-02-23T10:00:00Z"],
            )
            .unwrap();

            conn
        .execute(
          "INSERT INTO participants (id, event_id, name, cpf, birth_date, raw_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
          params![
            "seat-joao",
            "ev-1",
            "João da Silva",
            "123.456.789-00",
            "1990-01-01",
            r#"{"customFormResponses":[]}"#,
          ],
        )
        .unwrap();
            conn.execute(
                "INSERT INTO tickets (id, participant_id, code, raw_json) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "seat-joao",
                    "seat-joao",
                    "QR-JOAO",
                    r#"{"ticketId":"orig-joao","ticketName":"5K","qrCode":"QR-JOAO"}"#,
                ],
            )
            .unwrap();

            conn
        .execute(
          "INSERT INTO participants (id, event_id, name, cpf, birth_date, raw_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
          params![
            "seat-maria",
            "ev-1",
            "Maria Souza",
            "11122233344",
            "1992-02-02",
            r#"{"customFormResponses":[]}"#,
          ],
        )
        .unwrap();
            conn.execute(
                "INSERT INTO tickets (id, participant_id, code, raw_json) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "seat-maria",
                    "seat-maria",
                    "QR-MARIA",
                    r#"{"ticketId":"orig-maria","ticketName":"10K","qrCode":"QR-MARIA"}"#,
                ],
            )
            .unwrap();

            conn
        .execute(
          "INSERT INTO participants (id, event_id, name, cpf, birth_date, raw_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
          params![
            "seat-joao-ev2",
            "ev-2",
            "Joao Evento Dois",
            "55566677788",
            "1999-09-09",
            r#"{"customFormResponses":[]}"#,
          ],
        )
        .unwrap();
            conn.execute(
                "INSERT INTO tickets (id, participant_id, code, raw_json) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "seat-joao-ev2",
                    "seat-joao-ev2",
                    "QR-EV2",
                    r#"{"ticketId":"orig-ev2","ticketName":"5K","qrCode":"QR-EV2"}"#,
                ],
            )
            .unwrap();
        }
        pool
    }

    #[test]
    fn normalize_nome_removes_accents_and_case() {
        assert_eq!(normalize_nome("João"), "joao");
        assert_eq!(normalize_nome("ÁRVORE"), "arvore");
    }

    #[test]
    fn normalize_digits_keeps_only_numbers() {
        assert_eq!(normalize_digits("123.456.789-00"), "12345678900");
    }

    #[test]
    fn search_nome_is_case_and_accent_insensitive() {
        let pool = seeded_pool();
        let out = ParticipantsRepository::search_by_event(
            &pool,
            "ev-1",
            "joao",
            ParticipantSearchMode::Nome,
        )
        .unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].id, "seat-joao");
    }

    #[test]
    fn search_cpf_is_exact_after_digit_normalization() {
        let pool = seeded_pool();
        let exact = ParticipantsRepository::search_by_event(
            &pool,
            "ev-1",
            "12345678900",
            ParticipantSearchMode::Cpf,
        )
        .unwrap();
        assert_eq!(exact.len(), 1);
        assert_eq!(exact[0].id, "seat-joao");

        let partial = ParticipantsRepository::search_by_event(
            &pool,
            "ev-1",
            "123456789",
            ParticipantSearchMode::Cpf,
        )
        .unwrap();
        assert!(partial.is_empty());
    }

    #[test]
    fn search_ticket_id_matches_internal_and_source_ticket_id() {
        let pool = seeded_pool();
        let by_internal = ParticipantsRepository::search_by_event(
            &pool,
            "ev-1",
            "seat-joao",
            ParticipantSearchMode::TicketId,
        )
        .unwrap();
        assert_eq!(by_internal.len(), 1);
        assert_eq!(by_internal[0].id, "seat-joao");

        let by_source = ParticipantsRepository::search_by_event(
            &pool,
            "ev-1",
            "orig-joao",
            ParticipantSearchMode::TicketId,
        )
        .unwrap();
        assert_eq!(by_source.len(), 1);
        assert_eq!(by_source[0].id, "seat-joao");
    }

    #[test]
    fn search_qr_and_birth_date_are_exact() {
        let pool = seeded_pool();
        let qr = ParticipantsRepository::search_by_event(
            &pool,
            "ev-1",
            "QR-JOAO",
            ParticipantSearchMode::Qr,
        )
        .unwrap();
        assert_eq!(qr.len(), 1);
        assert_eq!(qr[0].id, "seat-joao");

        let birth = ParticipantsRepository::search_by_event(
            &pool,
            "ev-1",
            "1990-01-01",
            ParticipantSearchMode::BirthDate,
        )
        .unwrap();
        assert_eq!(birth.len(), 1);
        assert_eq!(birth[0].id, "seat-joao");

        let ev2 = ParticipantsRepository::search_by_event(
            &pool,
            "ev-2",
            "QR-JOAO",
            ParticipantSearchMode::Qr,
        )
        .unwrap();
        assert!(ev2.is_empty());
    }

    #[test]
    fn update_event_participant_persists_name_birth_date_and_ticket_name() {
        let pool = seeded_pool();
        let updated = ParticipantsRepository::update_event_participant(
            &pool,
            "ev-1",
            "seat-joao",
            "Joao Atualizado",
            "1991-10-11",
            "10K",
        )
        .unwrap();
        assert_eq!(updated.name.as_deref(), Some("Joao Atualizado"));
        assert_eq!(updated.birth_date.as_deref(), Some("1991-10-11"));
        assert_eq!(updated.ticket_name.as_deref(), Some("10K"));
    }

    #[test]
    fn update_event_participant_blocks_when_already_checked_in() {
        let pool = seeded_pool();
        {
            let conn = pool.conn.lock().unwrap();
            conn
        .execute(
          "INSERT INTO takeout_events (request_id, ticket_id, device_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
          params!["req-1", "seat-joao", "desk", "CONFIRMED", "2026-01-01T00:00:00Z"],
        )
        .unwrap();
        }

        let result = ParticipantsRepository::update_event_participant(
            &pool,
            "ev-1",
            "seat-joao",
            "Nome",
            "1991-10-11",
            "10K",
        );
        assert!(matches!(
            result,
            Err(UpdateParticipantError::AlreadyCheckedIn)
        ));
    }
}
