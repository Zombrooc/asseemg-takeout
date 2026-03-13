use crate::api::db::DbPool;
use deunicode::deunicode;
use rusqlite::params;

pub struct EventsRepository;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventRow {
    pub event_id: String,
    pub name: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub start_time: Option<String>,
    pub imported_at: String,
    pub source_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFormResponseRow {
    pub name: String,
    pub label: String,
    #[serde(rename = "type")]
    pub field_type: String,
    pub response: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventParticipantRow {
    pub id: String,
    pub name: Option<String>,
    pub cpf: Option<String>,
    pub birth_date: Option<String>,
    pub shirt_size: Option<String>,
    pub team: Option<String>,
    pub ticket_id: String,
    pub source_ticket_id: Option<String>,
    pub ticket_name: Option<String>,
    pub qr_code: String,
    pub checkin_done: bool,
    pub custom_form_responses: Option<Vec<CustomFormResponseRow>>,
}

fn normalize_lookup_key(value: &str) -> String {
    deunicode(value)
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

fn read_string_field(json: &serde_json::Value, key: &str) -> Option<String> {
    json.get(key)
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| v.to_string())
}

fn read_custom_form_value(json: &serde_json::Value, aliases: &[&str]) -> Option<String> {
    let alias_keys = aliases
        .iter()
        .map(|alias| normalize_lookup_key(alias))
        .collect::<Vec<_>>();
    let items = json.get("customFormResponses")?.as_array()?;
    for item in items {
        let name = item.get("name").and_then(|n| n.as_str()).unwrap_or_default();
        let label = item
            .get("label")
            .and_then(|l| l.as_str())
            .unwrap_or_default();
        let name_key = normalize_lookup_key(name);
        let label_key = normalize_lookup_key(label);
        let is_match = alias_keys
            .iter()
            .any(|alias| alias == &name_key || alias == &label_key);
        if !is_match {
            continue;
        }
        let response = item.get("response").unwrap_or(&serde_json::Value::Null);
        let value = match response {
            serde_json::Value::String(s) => s.trim().to_string(),
            serde_json::Value::Null => String::new(),
            _ => response.to_string(),
        };
        if !value.is_empty() {
            return Some(value);
        }
    }
    None
}

fn extract_shirt_and_team(participant_raw_json: Option<&serde_json::Value>) -> (Option<String>, Option<String>) {
    let Some(raw) = participant_raw_json else {
        return (None, None);
    };
    let shirt_size = read_string_field(raw, "shirtSize")
        .or_else(|| read_string_field(raw, "tamanhoCamisa"))
        .or_else(|| read_string_field(raw, "camisa"))
        .or_else(|| read_custom_form_value(raw, &["camisa", "tamanho da camisa", "shirtSize"]));
    let team = read_string_field(raw, "team")
        .or_else(|| read_string_field(raw, "equipe"))
        .or_else(|| read_custom_form_value(raw, &["team", "equipe"]));
    (shirt_size, team)
}

impl EventsRepository {
    pub fn list_events(
        pool: &DbPool,
        include_archived: bool,
    ) -> Result<Vec<EventRow>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let sql = if include_archived {
            "SELECT event_id, name, start_date, end_date, start_time, imported_at, source_type, archived_at FROM events ORDER BY imported_at DESC"
        } else {
            "SELECT event_id, name, start_date, end_date, start_time, imported_at, source_type, archived_at FROM events WHERE archived_at IS NULL ORDER BY imported_at DESC"
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([], |row| {
            Ok(EventRow {
                event_id: row.get(0)?,
                name: row.get(1)?,
                start_date: row.get(2)?,
                end_date: row.get(3)?,
                start_time: row.get(4)?,
                imported_at: row.get(5)?,
                source_type: row.get(6)?,
                archived_at: row.get::<_, Option<String>>(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn archive_event(pool: &DbPool, event_id: &str) -> Result<usize, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        conn.execute(
            "UPDATE events SET archived_at = datetime('now') WHERE event_id = ?1",
            params![event_id],
        )
    }

    pub fn unarchive_event(pool: &DbPool, event_id: &str) -> Result<usize, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        conn.execute(
            "UPDATE events SET archived_at = NULL WHERE event_id = ?1",
            params![event_id],
        )
    }

    pub fn delete_event(pool: &DbPool, event_id: &str) -> Result<(), rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        // ticket_ids for participants of this event
        let ticket_ids: Vec<String> = conn
      .prepare(
        "SELECT t.id FROM tickets t INNER JOIN participants p ON t.participant_id = p.id WHERE p.event_id = ?1",
      )?
      .query_map(params![event_id], |row| row.get(0))?
      .collect::<Result<Vec<_>, _>>()?;
        for ticket_id in &ticket_ids {
            let _ = conn.execute(
                "DELETE FROM takeout_events WHERE ticket_id = ?1",
                params![ticket_id],
            );
            let _ = conn.execute(
                "DELETE FROM check_ins WHERE ticket_id = ?1",
                params![ticket_id],
            );
        }
        let _ = conn.execute(
      "DELETE FROM tickets WHERE participant_id IN (SELECT id FROM participants WHERE event_id = ?1)",
      params![event_id],
    );
        let _ = conn.execute("DELETE FROM locks WHERE participant_id IN (SELECT id FROM participants WHERE event_id = ?1)", params![event_id]);
        let _ = conn.execute(
            "DELETE FROM event_log WHERE event_id = ?1",
            params![event_id],
        );
        let _ = conn.execute(
            "DELETE FROM participants WHERE event_id = ?1",
            params![event_id],
        );
        let _ = conn.execute(
            "DELETE FROM custom_forms WHERE event_id = ?1",
            params![event_id],
        );
        let _ = conn.execute("DELETE FROM events WHERE event_id = ?1", params![event_id]);
        Ok(())
    }

    pub fn list_participants_by_event(
        pool: &DbPool,
        event_id: &str,
    ) -> Result<Vec<EventParticipantRow>, rusqlite::Error> {
        let conn = pool
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidParameterName("lock".into()))?;
        let mut stmt = conn.prepare(
      "SELECT p.id, p.name, p.cpf, p.birth_date, t.id AS ticket_id, t.code AS qr_code, t.raw_json AS ticket_raw, p.raw_json AS participant_raw,
       EXISTS (SELECT 1 FROM check_ins ci WHERE ci.ticket_id = t.id) AS checkin_done_db
       FROM participants p
       JOIN tickets t ON t.participant_id = p.id
       WHERE p.event_id = ?1
       ORDER BY p.name",
    )?;
        let rows = stmt.query_map(params![event_id], |row| {
            let id: String = row.get(0)?;
            let name: Option<String> = row.get(1)?;
            let cpf: Option<String> = row.get(2)?;
            let birth_date: Option<String> = row.get(3)?;
            let ticket_id: String = row.get(4)?;
            let qr_code: String = row.get(5)?;
            let ticket_raw: Option<String> = row.get(6)?;
            let participant_raw: Option<String> = row.get(7)?;
            let checkin_done_db: bool = row.get(8)?;
            let ticket_raw_json = ticket_raw
                .as_ref()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok());
            let source_ticket_id = ticket_raw_json
                .as_ref()
                .and_then(|v| v.get("ticketId").and_then(|n| n.as_str().map(String::from)));
            let ticket_name = ticket_raw_json.as_ref().and_then(|v| {
                v.get("ticketName")
                    .and_then(|n| n.as_str().map(String::from))
            });
            let participant_raw_json = participant_raw
                .as_ref()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok());
            let checkin_done = checkin_done_db;
            let custom_form_responses = participant_raw_json
                .as_ref()
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
                            CustomFormResponseRow {
                                name,
                                label,
                                field_type,
                                response,
                            }
                        })
                        .collect::<Vec<_>>()
                });
            let (shirt_size, team) = extract_shirt_and_team(participant_raw_json.as_ref());
            Ok(EventParticipantRow {
                id,
                name,
                cpf,
                birth_date,
                shirt_size,
                team,
                ticket_id,
                source_ticket_id,
                ticket_name,
                qr_code,
                checkin_done,
                custom_form_responses,
            })
        })?;
        rows.collect()
    }
}
