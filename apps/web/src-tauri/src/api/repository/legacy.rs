use crate::api::db::DbPool;
use chrono::Datelike;
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

#[derive(Debug)]
pub enum UpdateLegacyParticipantError {
    NotFound,
    AlreadyCheckedIn,
    Db(rusqlite::Error),
}

impl From<rusqlite::Error> for UpdateLegacyParticipantError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(value)
    }
}

impl LegacyRepository {
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
            return Err("header CSV legado invÃ¡lido".to_string());
        }
        for (idx, expected) in LEGACY_HEADERS.iter().enumerate() {
            let actual = headers.get(idx).map(str::trim).unwrap_or_default();
            if actual != *expected {
                return Err(format!(
                    "header CSV legado invÃ¡lido na coluna {}: esperado '{}', recebido '{}'",
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
                    errors.push(format!("linha {}: nÃºmero invÃ¡lido", line_no));
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
                errors.push(format!("linha {}: cpf invÃ¡lido", line_no));
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
        Ok(all
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
            .collect())
    }

    pub fn confirm_atomic(
        pool: &DbPool,
        request_id: &str,
        event_id: &str,
        participant_id: &str,
        device_id: &str,
        operator_alias: Option<&str>,
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
            let snapshot = conn
                .query_row(
                    "SELECT full_name, birth_date_iso, modality FROM legacy_participants WHERE id = ?1",
                    [participant_id],
                    |row| {
                        Ok((
                            row.get::<_, Option<String>>(0)?,
                            row.get::<_, Option<String>>(1)?,
                            row.get::<_, Option<String>>(2)?,
                        ))
                    },
                )
                .ok();
            let (participant_name, birth_date, ticket_name) =
                snapshot.unwrap_or((None, None, None));
            let age_at_checkin =
                Self::compute_age_at_checkin(birth_date.as_deref(), &now);
            if let Err(e) = conn.execute(
        "INSERT INTO legacy_checkins (
            request_id, event_id, participant_id, device_id, status, payload_json, created_at,
            source_type, ticket_id, participant_name, birth_date, age_at_checkin, ticket_name,
            operator_alias, operator_device_id, checked_in_at
         ) VALUES (?1, ?2, ?3, ?4, 'CONFIRMED', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
          request_id,
          event_id,
          participant_id,
          device_id,
          payload_json,
          now,
          "legacy_csv",
          participant_id,
          participant_name,
          birth_date,
          age_at_checkin,
          ticket_name,
          operator_alias,
          device_id,
          now
        ],
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

    pub fn list_audit_enriched(
        pool: &DbPool,
        event_id: &str,
        status_filter: Option<&str>,
    ) -> Result<Vec<super::takeout::TakeoutEventRow>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut query = String::from(
            "SELECT
              c.request_id,
              COALESCE(c.ticket_id, c.participant_id) AS ticket_id,
              c.device_id,
              c.status,
              c.payload_json,
              c.created_at,
              COALESCE(c.source_type, 'legacy_csv') AS source_type,
              c.event_id,
              c.participant_id,
              COALESCE(c.participant_name, p.full_name) AS participant_name,
              COALESCE(c.birth_date, p.birth_date_iso) AS birth_date,
              c.age_at_checkin,
              c.ticket_source_id,
              COALESCE(c.ticket_name, p.modality) AS ticket_name,
              c.ticket_code,
              COALESCE(c.operator_alias, pd.operator_alias) AS operator_alias,
              COALESCE(c.operator_device_id, c.device_id) AS operator_device_id,
              COALESCE(c.checked_in_at, c.created_at) AS checked_in_at
            FROM legacy_checkins c
            LEFT JOIN legacy_participants p ON p.id = c.participant_id
            LEFT JOIN paired_devices pd ON pd.device_id = COALESCE(c.operator_device_id, c.device_id)
            WHERE c.event_id = ?1",
        );
        if status_filter.is_some() {
            query.push_str(" AND c.status = ?2");
        }
        query.push_str(" ORDER BY c.created_at DESC");

        let mut stmt = conn.prepare(&query)?;
        let mut rows = if let Some(status) = status_filter {
            stmt.query(params![event_id, status])?
        } else {
            stmt.query(params![event_id])?
        };

        let mut out = Vec::new();
        while let Some(row) = rows.next()? {
            let birth_date: Option<String> = row.get(10)?;
            let checked_in_at: String = row.get(17)?;
            let age_at_checkin_db: Option<i64> = row.get(11)?;
            let age_at_checkin = age_at_checkin_db
                .or_else(|| Self::compute_age_at_checkin(birth_date.as_deref(), &checked_in_at));

            out.push(super::takeout::TakeoutEventRow {
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

    pub fn update_event_participant(
        pool: &DbPool,
        event_id: &str,
        participant_id: &str,
        name: &str,
        birth_date: &str,
        ticket_type: &str,
    ) -> Result<LegacyParticipantRow, UpdateLegacyParticipantError> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;

        let lookup = conn.query_row(
            "SELECT raw_json,
       EXISTS (
         SELECT 1
         FROM legacy_checkins c
         WHERE c.participant_id = p.id AND c.status IN ('CONFIRMED', 'DUPLICATE')
       ) AS checkin_done
       FROM legacy_participants p
       WHERE p.event_id = ?1 AND p.id = ?2",
            [event_id, participant_id],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, bool>(1)?)),
        );

        let (raw_json, checkin_done) = match lookup {
            Ok(v) => v,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                return Err(UpdateLegacyParticipantError::NotFound)
            }
            Err(e) => return Err(UpdateLegacyParticipantError::Db(e)),
        };

        if checkin_done {
            return Err(UpdateLegacyParticipantError::AlreadyCheckedIn);
        }

        let mut raw_json_value = raw_json
            .as_deref()
            .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
            .unwrap_or_else(|| serde_json::json!({}));
        if !raw_json_value.is_object() {
            raw_json_value = serde_json::json!({});
        }
        if let Some(obj) = raw_json_value.as_object_mut() {
            obj.insert(
                "nomeCompleto".to_string(),
                serde_json::Value::String(name.to_string()),
            );
            obj.insert(
                "dataNascimento".to_string(),
                serde_json::Value::String(birth_date.to_string()),
            );
            obj.insert(
                "modalidade".to_string(),
                serde_json::Value::String(ticket_type.to_string()),
            );
        }
        let raw_json_updated = raw_json_value.to_string();
        let updated_at = chrono::Utc::now().to_rfc3339();

        conn.execute("BEGIN IMMEDIATE", [])?;
        let result = (|| -> Result<(), rusqlite::Error> {
            conn.execute(
                "UPDATE legacy_participants
         SET full_name = ?3,
             birth_date_iso = ?4,
             modality = ?5,
             raw_json = ?6,
             updated_at = ?7
         WHERE event_id = ?1 AND id = ?2",
                params![
                    event_id,
                    participant_id,
                    name,
                    birth_date,
                    ticket_type,
                    raw_json_updated,
                    updated_at
                ],
            )?;
            Ok(())
        })();

        match result {
            Ok(()) => conn.execute("COMMIT", [])?,
            Err(e) => {
                let _ = conn.execute("ROLLBACK", []);
                return Err(UpdateLegacyParticipantError::Db(e));
            }
        };

        let mut stmt = conn.prepare(
      "SELECT p.id, p.bib_number, p.full_name, p.sex, p.cpf_digits, p.birth_date_iso, p.modality, p.shirt_size, p.team,
      EXISTS (SELECT 1 FROM legacy_checkins c WHERE c.participant_id = p.id AND c.status IN ('CONFIRMED', 'DUPLICATE')) AS checkin_done
      FROM legacy_participants p
      WHERE p.event_id = ?1 AND p.id = ?2",
    )?;
        let updated = stmt.query_row(params![event_id, participant_id], |row| {
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
        });

        match updated {
            Ok(row) => Ok(row),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                Err(UpdateLegacyParticipantError::NotFound)
            }
            Err(e) => Err(UpdateLegacyParticipantError::Db(e)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{LegacyRepository, UpdateLegacyParticipantError};
    use crate::api::db::DbPool;
    use rusqlite::params;

    #[test]
    fn import_validates_and_normalizes_legacy_rows() {
        let pool = DbPool::open_in_memory().unwrap();
        let csv = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Thiago Lima AraÃºjo,Masculino,179.790.869-37,08/03/2000,5KM,EXG,\n";
        let out =
            LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv).unwrap();
        assert_eq!(out.imported, 1);
        assert!(out.errors.is_empty());
        let participants =
            LegacyRepository::list_participants_by_event(&pool, "ev-legacy").unwrap();
        assert_eq!(participants[0].cpf, "17979086937");
        assert_eq!(participants[0].birth_date, "2000-03-08");
    }

    #[test]
    fn import_rejects_invalid_birth_date() {
        let pool = DbPool::open_in_memory().unwrap();
        let csv = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Ana,Feminino,17979086937,2000-03-08,5KM,P,\n";
        let out =
            LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv).unwrap();
        assert_eq!(out.imported, 0);
        assert_eq!(out.errors.len(), 1);
    }

    #[test]
    fn import_upserts_using_cpf_and_birth_date() {
        let pool = DbPool::open_in_memory().unwrap();
        let csv_one = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Thiago Lima AraÃºjo,Masculino,17979086937,08/03/2000,5KM,EXG,\n";
        let csv_two = "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n88,Thiago Lima AraÃºjo,Masculino,17979086937,08/03/2000,10KM,M,Equipe A\n";
        LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv_one).unwrap();
        LegacyRepository::import_csv(&pool, "ev-legacy", "Evento", "2026-05-15", csv_two).unwrap();
        let participants =
            LegacyRepository::list_participants_by_event(&pool, "ev-legacy").unwrap();
        assert_eq!(participants.len(), 1);
        assert_eq!(participants[0].bib_number, 88);
        assert_eq!(participants[0].shirt_size.as_deref(), Some("M"));
    }

    fn seed_legacy_participant(pool: &DbPool) -> String {
        let participant_id = "legacy-p1".to_string();
        let conn = pool.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO events (event_id, name, start_date, imported_at, source_type)
       VALUES (?1, ?2, ?3, ?4, 'legacy_csv')",
            params!["ev-legacy", "Evento", "2026-05-15", "2026-05-15T00:00:00Z"],
        )
        .unwrap();
        conn.execute(
      "INSERT INTO legacy_participants (id, event_id, bib_number, full_name, sex, cpf_digits, birth_date_iso, modality, shirt_size, team, raw_json, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
      params![
        participant_id,
        "ev-legacy",
        1,
        "Thiago Lima Araujo",
        "Masculino",
        "17979086937",
        "2000-03-08",
        "5KM",
        "EXG",
        Option::<String>::None,
        serde_json::json!({
          "numero": 1,
          "nomeCompleto": "Thiago Lima Araujo",
          "sexo": "Masculino",
          "cpf": "17979086937",
          "dataNascimento": "2000-03-08",
          "modalidade": "5KM",
          "tamanhoCamisa": "EXG",
          "equipe": null
        })
        .to_string(),
        "2026-05-15T00:00:00Z",
        "2026-05-15T00:00:00Z"
      ],
    )
    .unwrap();
        participant_id
    }

    #[test]
    fn update_event_participant_persists_legacy_fields_and_raw_json() {
        let pool = DbPool::open_in_memory().unwrap();
        let participant_id = seed_legacy_participant(&pool);

        let updated = LegacyRepository::update_event_participant(
            &pool,
            "ev-legacy",
            &participant_id,
            "Thiago Editado",
            "2001-04-09",
            "10KM",
        )
        .unwrap();
        assert_eq!(updated.name, "Thiago Editado");
        assert_eq!(updated.birth_date, "2001-04-09");
        assert_eq!(updated.modality.as_deref(), Some("10KM"));
    }

    #[test]
    fn update_event_participant_blocks_when_already_checked_in() {
        let pool = DbPool::open_in_memory().unwrap();
        let participant_id = seed_legacy_participant(&pool);
        {
            let conn = pool.conn.lock().unwrap();
            conn.execute(
        "INSERT INTO legacy_checkins (request_id, event_id, participant_id, device_id, status, payload_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
          "req-legacy",
          "ev-legacy",
          participant_id,
          "desk",
          "CONFIRMED",
          Option::<String>::None,
          "2026-01-01T00:00:00Z"
        ],
      )
      .unwrap();
        }

        let result = LegacyRepository::update_event_participant(
            &pool,
            "ev-legacy",
            &participant_id,
            "Thiago Editado",
            "2001-04-09",
            "10KM",
        );
        assert!(matches!(
            result,
            Err(UpdateLegacyParticipantError::AlreadyCheckedIn)
        ));
    }
}
