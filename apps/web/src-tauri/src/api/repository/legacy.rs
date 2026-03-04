use crate::api::db::DbPool;
use deunicode::deunicode;
use rusqlite::params;

const LEGACY_HEADERS: [&str; 8] = [
  "Número",
  "Nome Completo",
  "Sexo",
  "CPF",
  "Data de Nascimento",
  "Modalidade (5km, 10km, Caminhada ou Kids)",
  "Tamanho da Camisa",
  "Equipe",
];

#[derive(Debug, Clone, serde::Serialize)]
pub struct LegacyImportResult {
  pub imported: i32,
  pub errors: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyParticipantRow {
  pub id: String,
  pub bib_number: i64,
  pub name: String,
  pub sex: Option<String>,
  pub cpf: String,
  pub birth_date: String,
  pub modality: Option<String>,
  pub shirt_size: Option<String>,
  pub team: Option<String>,
  pub checkin_done: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct LegacyCheckinRow {
  pub request_id: String,
  pub event_id: String,
  pub participant_id: String,
  pub device_id: String,
  pub status: String,
  pub payload_json: Option<String>,
  pub created_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LegacyParticipantSearchMode {
  Numero,
  Nome,
  Cpf,
  BirthDate,
  Modality,
}

impl LegacyParticipantSearchMode {
  pub fn from_str(value: &str) -> Option<Self> {
    match value {
      "numero" => Some(Self::Numero),
      "nome" => Some(Self::Nome),
      "cpf" => Some(Self::Cpf),
      "birth_date" => Some(Self::BirthDate),
      "modality" => Some(Self::Modality),
      _ => None,
    }
  }
}

fn normalize_digits(value: &str) -> String {
  value.chars().filter(|c| c.is_ascii_digit()).collect()
}

fn normalize_name(value: &str) -> String {
  deunicode(value).to_lowercase()
}

fn parse_birth_date(value: &str) -> Result<String, String> {
  let date = chrono::NaiveDate::parse_from_str(value.trim(), "%d/%m/%Y")
    .map_err(|_| format!("data_nascimento inválida: {}", value.trim()))?;
  Ok(date.format("%Y-%m-%d").to_string())
}

fn normalize_optional(value: Option<&str>) -> Option<String> {
  value
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .map(|v| v.to_string())
}

pub struct LegacyRepository;

impl LegacyRepository {
  pub fn import_csv(
    pool: &DbPool,
    event_id: &str,
    event_name: &str,
    event_start_date: &str,
    csv_content: &str,
  ) -> Result<LegacyImportResult, String> {
    let mut reader = csv::ReaderBuilder::new()
      .has_headers(true)
      .flexible(true)
      .from_reader(csv_content.as_bytes());

    let headers = reader.headers().map_err(|e| e.to_string())?;
    if headers.len() != LEGACY_HEADERS.len() {
      return Err("header CSV legado inválido".to_string());
    }
    for (idx, expected) in LEGACY_HEADERS.iter().enumerate() {
      let actual = headers.get(idx).map(str::trim).unwrap_or_default();
      if actual != *expected {
        return Err(format!(
          "header CSV legado inválido na coluna {}: esperado '{}', recebido '{}'",
          idx + 1,
          expected,
          actual
        ));
      }
    }

    let conn = pool.conn.lock().map_err(|_| "db lock".to_string())?;
    let imported_at = chrono::Utc::now().to_rfc3339();
    conn
      .execute(
        "INSERT INTO events (event_id, name, start_date, imported_at, source_type) VALUES (?1, ?2, ?3, ?4, 'legacy_csv')
         ON CONFLICT(event_id) DO UPDATE SET name=?2, start_date=?3, imported_at=?4, source_type='legacy_csv'",
        params![event_id, event_name, event_start_date, imported_at],
      )
      .map_err(|e| e.to_string())?;

    let mut imported = 0i32;
    let mut errors = Vec::<String>::new();
    for (index, row) in reader.records().enumerate() {
      let line_no = index + 2;
      let record = match row {
        Ok(value) => value,
        Err(e) => {
          errors.push(format!("linha {}: {}", line_no, e));
          continue;
        }
      };
      let bib_number = match record.get(0).unwrap_or_default().trim().parse::<i64>() {
        Ok(v) if v > 0 => v,
        _ => {
          errors.push(format!("linha {}: número inválido", line_no));
          continue;
        }
      };
      let name = record.get(1).unwrap_or_default().trim().to_string();
      if name.is_empty() {
        errors.push(format!("linha {}: nome vazio", line_no));
        continue;
      }
      let sex = normalize_optional(record.get(2));
      let cpf_digits = normalize_digits(record.get(3).unwrap_or_default());
      if cpf_digits.len() != 11 {
        errors.push(format!("linha {}: cpf inválido", line_no));
        continue;
      }
      let birth_date_iso = match parse_birth_date(record.get(4).unwrap_or_default()) {
        Ok(v) => v,
        Err(_) => {
          errors.push(format!("linha {}: data de nascimento inválida", line_no));
          continue;
        }
      };
      let modality = normalize_optional(record.get(5));
      let shirt_size = normalize_optional(record.get(6));
      let team = normalize_optional(record.get(7));
      let now = chrono::Utc::now().to_rfc3339();
      let raw_json = serde_json::json!({
        "numero": bib_number,
        "nomeCompleto": name,
        "sexo": sex,
        "cpf": cpf_digits,
        "dataNascimento": birth_date_iso,
        "modalidade": modality,
        "tamanhoCamisa": shirt_size,
        "equipe": team
      })
      .to_string();

      let existing_id: Option<String> = conn
        .query_row(
          "SELECT id FROM legacy_participants WHERE event_id = ?1 AND cpf_digits = ?2 AND birth_date_iso = ?3",
          params![event_id, cpf_digits, birth_date_iso],
          |r| r.get(0),
        )
        .ok();
      if let Some(id) = existing_id {
        conn
          .execute(
            "UPDATE legacy_participants SET bib_number=?2, full_name=?3, sex=?4, modality=?5, shirt_size=?6, team=?7, raw_json=?8, updated_at=?9 WHERE id=?1",
            params![
              id,
              bib_number,
              name,
              sex,
              modality,
              shirt_size,
              team,
              raw_json,
              now
            ],
          )
          .map_err(|e| e.to_string())?;
      } else {
        conn
          .execute(
            "INSERT INTO legacy_participants (id, event_id, bib_number, full_name, sex, cpf_digits, birth_date_iso, modality, shirt_size, team, raw_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
              uuid::Uuid::new_v4().to_string(),
              event_id,
              bib_number,
              name,
              sex,
              cpf_digits,
              birth_date_iso,
              modality,
              shirt_size,
              team,
              raw_json,
              now,
              now
            ],
          )
          .map_err(|e| e.to_string())?;
      }
      imported += 1;
    }

    Ok(LegacyImportResult { imported, errors })
  }

  pub fn list_participants_by_event(
    pool: &DbPool,
    event_id: &str,
  ) -> Result<Vec<LegacyParticipantRow>, rusqlite::Error> {
    let conn = pool
      .conn
      .lock()
      .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let mut stmt = conn.prepare(
      "SELECT p.id, p.bib_number, p.full_name, p.sex, p.cpf_digits, p.birth_date_iso, p.modality, p.shirt_size, p.team,
      EXISTS (SELECT 1 FROM legacy_checkins c WHERE c.participant_id = p.id AND c.status IN ('CONFIRMED', 'DUPLICATE')) AS checkin_done
      FROM legacy_participants p
      WHERE p.event_id = ?1
      ORDER BY p.bib_number",
    )?;
    let rows = stmt.query_map([event_id], |row| {
      Ok(LegacyParticipantRow {
        id: row.get(0)?,
        bib_number: row.get(1)?,
        name: row.get(2)?,
        sex: row.get(3)?,
        cpf: row.get(4)?,
        birth_date: row.get(5)?,
        modality: row.get(6)?,
        shirt_size: row.get(7)?,
        team: row.get(8)?,
        checkin_done: row.get(9)?,
      })
    })?;
    rows.collect()
  }

  pub fn search_participants_by_event(
    pool: &DbPool,
    event_id: &str,
    query: &str,
    mode: LegacyParticipantSearchMode,
  ) -> Result<Vec<LegacyParticipantRow>, rusqlite::Error> {
    let all = Self::list_participants_by_event(pool, event_id)?;
    let normalized = query.trim();
    if normalized.is_empty() {
      return Ok(Vec::new());
    }
    Ok(
      all
        .into_iter()
        .filter(|row| match mode {
          LegacyParticipantSearchMode::Numero => row.bib_number.to_string() == normalized,
          LegacyParticipantSearchMode::Nome => {
            normalize_name(&row.name).contains(&normalize_name(normalized))
          }
          LegacyParticipantSearchMode::Cpf => row.cpf == normalize_digits(normalized),
          LegacyParticipantSearchMode::BirthDate => row.birth_date == normalized,
          LegacyParticipantSearchMode::Modality => row
            .modality
            .as_deref()
            .map(|value| normalize_name(value).contains(&normalize_name(normalized)))
            .unwrap_or(false),
        })
        .collect(),
    )
  }

  pub fn confirm_atomic(
    pool: &DbPool,
    request_id: &str,
    event_id: &str,
    participant_id: &str,
    device_id: &str,
    payload_json: Option<&str>,
  ) -> Result<super::takeout::ConfirmAtomicResult, rusqlite::Error> {
    let conn = pool
      .conn
      .lock()
      .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    conn.execute("BEGIN IMMEDIATE", [])?;
    let result = {
      match conn.query_row(
        "SELECT status FROM legacy_checkins WHERE request_id = ?1",
        [request_id],
        |r| r.get::<_, String>(0),
      ) {
        Ok(_) => {
          let _ = conn.execute("ROLLBACK", []);
          return Ok(super::takeout::ConfirmAtomicResult::Duplicate);
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {}
        Err(e) => return Err(e),
      }
      match conn.query_row(
        "SELECT request_id FROM legacy_checkins WHERE participant_id = ?1 AND status IN ('CONFIRMED', 'DUPLICATE')",
        [participant_id],
        |r| r.get::<_, String>(0),
      ) {
        Ok(existing_request_id) => {
          let _ = conn.execute("ROLLBACK", []);
          return Ok(super::takeout::ConfirmAtomicResult::Conflict { existing_request_id });
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {}
        Err(e) => return Err(e),
      }
      let now = chrono::Utc::now().to_rfc3339();
      if let Err(e) = conn.execute(
        "INSERT INTO legacy_checkins (request_id, event_id, participant_id, device_id, status, payload_json, created_at) VALUES (?1, ?2, ?3, ?4, 'CONFIRMED', ?5, ?6)",
        params![request_id, event_id, participant_id, device_id, payload_json, now],
      ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e);
      }
      super::takeout::ConfirmAtomicResult::Confirmed
    };
    conn.execute("COMMIT", [])?;
    Ok(result)
  }

  pub fn list_audit(
    pool: &DbPool,
    event_id: &str,
  ) -> Result<Vec<LegacyCheckinRow>, rusqlite::Error> {
    let conn = pool
      .conn
      .lock()
      .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
    let mut stmt = conn.prepare(
      "SELECT request_id, event_id, participant_id, device_id, status, payload_json, created_at
      FROM legacy_checkins
      WHERE event_id = ?1
      ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([event_id], |row| {
      Ok(LegacyCheckinRow {
        request_id: row.get(0)?,
        event_id: row.get(1)?,
        participant_id: row.get(2)?,
        device_id: row.get(3)?,
        status: row.get(4)?,
        payload_json: row.get(5)?,
        created_at: row.get(6)?,
      })
    })?;
    rows.collect()
  }
}

#[cfg(test)]
mod tests {
  use super::LegacyRepository;
  use crate::api::db::DbPool;

  #[test]
  fn import_validates_and_normalizes_legacy_rows() {
    let pool = DbPool::open_in_memory().unwrap();
    let csv = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Thiago Lima Araújo,Masculino,179.790.869-37,08/03/2000,5KM,EXG,\n";
    let out = LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv).unwrap();
    assert_eq!(out.imported, 1);
    assert!(out.errors.is_empty());
    let participants = LegacyRepository::list_participants_by_event(&pool, "ev-legacy").unwrap();
    assert_eq!(participants[0].cpf, "17979086937");
    assert_eq!(participants[0].birth_date, "2000-03-08");
  }

  #[test]
  fn import_rejects_invalid_birth_date() {
    let pool = DbPool::open_in_memory().unwrap();
    let csv = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Ana,Feminino,17979086937,2000-03-08,5KM,P,\n";
    let out = LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv).unwrap();
    assert_eq!(out.imported, 0);
    assert_eq!(out.errors.len(), 1);
  }

  #[test]
  fn import_upserts_using_cpf_and_birth_date() {
    let pool = DbPool::open_in_memory().unwrap();
    let csv_one = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Thiago Lima Araújo,Masculino,17979086937,08/03/2000,5KM,EXG,\n";
    let csv_two = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n88,Thiago Lima Araújo,Masculino,17979086937,08/03/2000,10KM,M,Equipe A\n";
    LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv_one).unwrap();
    LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv_two).unwrap();
    let participants = LegacyRepository::list_participants_by_event(&pool, "ev-legacy").unwrap();
    assert_eq!(participants.len(), 1);
    assert_eq!(participants[0].bib_number, 88);
    assert_eq!(participants[0].shirt_size.as_deref(), Some("M"));
  }
}
