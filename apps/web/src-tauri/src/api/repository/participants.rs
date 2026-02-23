use crate::api::db::DbPool;

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

  pub fn search(
    _pool: &DbPool,
    _q: &str,
    _mode: &str,
  ) -> Result<Vec<ParticipantRow>, rusqlite::Error> {
    // TODO: implement search by mode (qr | ticket_id | nome | cpf | birth_date)
    Ok(Vec::new())
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
