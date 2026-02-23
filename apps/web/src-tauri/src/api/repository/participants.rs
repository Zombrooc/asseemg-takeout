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
      row
        .cpf
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
      row
        .name
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

impl ParticipantsRepository {
  pub fn get_event_id_by_participant_id(pool: &DbPool, participant_id: &str) -> Result<Option<String>, rusqlite::Error> {
    let conn = pool.conn.lock().map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let mut stmt = conn.prepare("SELECT event_id FROM participants WHERE id = ?1")?;
    let mut rows = stmt.query([participant_id])?;
    if let Some(row) = rows.next()? {
      return Ok(Some(row.get::<_, String>(0)?));
    }
    Ok(None)
  }

  pub fn get_event_id_by_ticket_id(pool: &DbPool, ticket_id: &str) -> Result<Option<String>, rusqlite::Error> {
    let conn = pool.conn.lock().map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
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
    let conn = pool.conn.lock().map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
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

  use super::{normalize_digits, normalize_nome, ParticipantSearchMode, ParticipantsRepository};

  fn seeded_pool() -> DbPool {
    let pool = DbPool::open_in_memory().unwrap();
    {
      let conn = pool.conn.lock().unwrap();
      conn
        .execute(
          "INSERT INTO events (event_id, name, imported_at) VALUES (?1, ?2, ?3)",
          params!["ev-1", "Evento 1", "2026-02-23T10:00:00Z"],
        )
        .unwrap();
      conn
        .execute(
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
      conn
        .execute(
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
      conn
        .execute(
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
      conn
        .execute(
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
    let out =
      ParticipantsRepository::search_by_event(&pool, "ev-1", "joao", ParticipantSearchMode::Nome).unwrap();
    assert_eq!(out.len(), 1);
    assert_eq!(out[0].id, "seat-joao");
  }

  #[test]
  fn search_cpf_is_exact_after_digit_normalization() {
    let pool = seeded_pool();
    let exact =
      ParticipantsRepository::search_by_event(&pool, "ev-1", "12345678900", ParticipantSearchMode::Cpf).unwrap();
    assert_eq!(exact.len(), 1);
    assert_eq!(exact[0].id, "seat-joao");

    let partial =
      ParticipantsRepository::search_by_event(&pool, "ev-1", "123456789", ParticipantSearchMode::Cpf).unwrap();
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
    let qr =
      ParticipantsRepository::search_by_event(&pool, "ev-1", "QR-JOAO", ParticipantSearchMode::Qr).unwrap();
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
}
